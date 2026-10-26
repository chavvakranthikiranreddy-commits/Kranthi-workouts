package com.kranthi.workouts;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/** Keeps the alarm list (written from the app) and books each alarm with the system alarm clock. */
public class AlarmStore {
    static final String PREFS = "mm_alarms";
    static final String ACTION_FIRE = "com.kranthi.workouts.ALARM_FIRE";

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    static JSONArray all(Context c) {
        try { return new JSONArray(prefs(c).getString("list", "[]")); } catch (Exception e) { return new JSONArray(); }
    }

    static void save(Context c, JSONArray list) { prefs(c).edit().putString("list", list.toString()).apply(); }

    static JSONObject find(Context c, int id) {
        JSONArray a = all(c);
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o != null && o.optInt("id") == id) return o;
        }
        return null;
    }

    static void update(Context c, JSONObject alarm) {
        JSONArray a = all(c);
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o != null && o.optInt("id") == alarm.optInt("id")) {
                try { a.put(i, alarm); } catch (Exception ignored) { /* keep */ }
            }
        }
        save(c, a);
    }

    /** One-off alarms switch off after ringing; the app reads this list to update its toggles. */
    static void markDisabled(Context c, int id) {
        try {
            JSONArray d = new JSONArray(prefs(c).getString("disabled", "[]"));
            d.put(id);
            prefs(c).edit().putString("disabled", d.toString()).apply();
        } catch (Exception ignored) { /* keep */ }
    }

    static boolean isDisabledPending(Context c, int id) {
        try {
            JSONArray d = new JSONArray(prefs(c).getString("disabled", "[]"));
            for (int i = 0; i < d.length(); i++) if (d.optInt(i) == id) return true;
        } catch (Exception ignored) { /* keep */ }
        return false;
    }

    /** Next time this alarm should ring after "now". days is a bitmask, bit 0 = Sunday. 0 means once. */
    static long nextTrigger(JSONObject a, long now) {
        int days = a.optInt("days", 0);
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(now);
        cal.set(Calendar.HOUR_OF_DAY, a.optInt("hour", 7));
        cal.set(Calendar.MINUTE, a.optInt("minute", 0));
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        for (int i = 0; i < 9; i++) {
            int dow = cal.get(Calendar.DAY_OF_WEEK) - 1; // 0 = Sunday
            if (cal.getTimeInMillis() > now && (days == 0 || (days & (1 << dow)) != 0)) return cal.getTimeInMillis();
            cal.add(Calendar.DAY_OF_MONTH, 1);
        }
        return -1;
    }

    static PendingIntent firePI(Context c, int id, boolean snooze) {
        Intent i = new Intent(c, AlarmReceiver.class);
        i.setAction(ACTION_FIRE);
        i.putExtra("id", id);
        i.putExtra("snooze", snooze);
        int req = snooze ? (id ^ 0x40000000) : id;
        return PendingIntent.getBroadcast(c, req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static PendingIntent showPI(Context c) {
        Intent i = new Intent(c, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, 4243, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void book(Context c, long at, PendingIntent pi) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
        if (exact) am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, showPI(c)), pi);
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
    }

    static void cancel(Context c, PendingIntent pi) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(pi);
    }

    static void snooze(Context c, int id, int minutes) {
        long at = System.currentTimeMillis() + minutes * 60000L;
        prefs(c).edit().putLong("snooze_" + id, at).apply();
        book(c, at, firePI(c, id, true));
    }

    static void clearSnooze(Context c, int id) {
        prefs(c).edit().remove("snooze_" + id).apply();
        cancel(c, firePI(c, id, true));
    }

    /** Cancel and re-book every alarm. Called after the app changes alarms, after ringing and after a reboot. */
    static void scheduleAll(Context c) {
        long now = System.currentTimeMillis();
        JSONArray a = all(c);
        SharedPreferences p = prefs(c);
        // Forget alarms that were deleted in the app.
        String known = p.getString("booked", "");
        StringBuilder booked = new StringBuilder();
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null) continue;
            int id = o.optInt("id");
            booked.append(id).append(',');
            cancel(c, firePI(c, id, false));
            if (o.optBoolean("enabled", false)) {
                long t = nextTrigger(o, now);
                if (t > 0) book(c, t, firePI(c, id, false));
            }
            long sn = p.getLong("snooze_" + id, 0);
            if (sn > now) book(c, sn, firePI(c, id, true));
            else if (sn > 0) p.edit().remove("snooze_" + id).apply();
        }
        for (String s : known.split(",")) {
            if (s.isEmpty() || booked.indexOf(s + ",") == 0 || booked.indexOf("," + s + ",") >= 0) continue;
            try {
                int id = Integer.parseInt(s);
                cancel(c, firePI(c, id, false));
                clearSnooze(c, id);
            } catch (Exception ignored) { /* keep */ }
        }
        p.edit().putString("booked", booked.toString()).apply();
    }
}
