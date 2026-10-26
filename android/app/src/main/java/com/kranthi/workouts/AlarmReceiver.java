package com.kranthi.workouts;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONObject;

/** The system alarm clock calls this at the alarm time. It starts the ringing service and books the next ring. */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        if (!AlarmStore.ACTION_FIRE.equals(intent.getAction())) return;
        int id = intent.getIntExtra("id", 0);
        boolean snooze = intent.getBooleanExtra("snooze", false);
        JSONObject a = AlarmStore.find(c, id);
        if (a == null) return;
        if (snooze) c.getSharedPreferences(AlarmStore.PREFS, Context.MODE_PRIVATE).edit().remove("snooze_" + id).apply();
        else if (!a.optBoolean("enabled", false)) return;

        Intent s = new Intent(c, AlarmService.class);
        s.setAction(AlarmService.ACTION_RING);
        s.putExtra("id", id);
        if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(s); else c.startService(s);

        if (!snooze && a.optInt("days", 0) == 0) {
            try { a.put("enabled", false); } catch (Exception ignored) { /* keep */ }
            AlarmStore.update(c, a);
            AlarmStore.markDisabled(c, id);
        }
        AlarmStore.scheduleAll(c);
    }
}
