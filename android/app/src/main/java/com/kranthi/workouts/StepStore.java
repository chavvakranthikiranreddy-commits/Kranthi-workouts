package com.kranthi.workouts;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.SystemClock;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;

/**
 * Stores daily step totals from the phone's hardware step counter.
 * The sensor reports a running total since the phone was switched on,
 * so each reading is compared with the previous one and the difference
 * is added to today's total.
 */
public final class StepStore {

    private static final String PREFS = "kw_steps";
    private static final String CHANNEL = "kw_steps";
    private static final int GOAL_NOTIFICATION_ID = 7001;
    private static final int KEEP_DAYS = 800;

    public interface Callback {
        void done(float value);
    }

    private StepStore() {}

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static String todayKey() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    static boolean hasSensor(Context ctx) {
        SensorManager sm = (SensorManager) ctx.getSystemService(Context.SENSOR_SERVICE);
        return sm != null && sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null;
    }

    static boolean hasPermission(Context ctx) {
        if (Build.VERSION.SDK_INT < 29) return true;
        return ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED;
    }

    static boolean canCount(Context ctx) {
        return hasSensor(ctx) && hasPermission(ctx) && isEnabled(ctx);
    }

    static boolean isEnabled(Context ctx) {
        return prefs(ctx).getBoolean("enabled", false);
    }

    /** Always-on counting (on by default). */
    static boolean isLive(Context ctx) {
        return prefs(ctx).getBoolean("live", true);
    }

    static void setLive(Context ctx, boolean on) {
        prefs(ctx).edit().putBoolean("live", on).apply();
    }

    static void setEnabled(Context ctx, boolean on) {
        prefs(ctx).edit().putBoolean("enabled", on).apply();
    }

    static void setGoal(Context ctx, int goal) {
        prefs(ctx).edit().putInt("goal", goal).apply();
    }

    static JSONObject days(Context ctx) {
        try {
            return new JSONObject(prefs(ctx).getString("days", "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    static int todaySteps(Context ctx) {
        return days(ctx).optInt(todayKey(), 0);
    }

    /** Weight of one hour for spreading steps over a gap: people walk far less between 11 pm and 6 am. */
    private static double hourWeight(int hour) {
        return (hour >= 23 || hour < 6) ? 0.1 : 1.0;
    }

    /**
     * Adds steps to the right days. When the gap since the last reading crosses midnight
     * (the phone slept, or the battery saver held back background readings), the steps are
     * shared between the days by time of day instead of all landing on the day of the reading.
     */
    static void addSpread(JSONObject d, long from, long to, int steps) throws Exception {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        if (steps <= 0) return;
        if (from <= 0L || to - from > 31L * 86400000L) from = to - 3600000L;
        String a = f.format(new Date(from)), b = f.format(new Date(to));
        if (a.equals(b) || to <= from) { d.put(b, d.optInt(b, 0) + steps); return; }
        java.util.LinkedHashMap<String, Double> w = new java.util.LinkedHashMap<>();
        java.util.Calendar c = java.util.Calendar.getInstance();
        long t = from;
        double total = 0;
        while (t < to) {
            c.setTimeInMillis(t);
            c.set(java.util.Calendar.MINUTE, 0); c.set(java.util.Calendar.SECOND, 0); c.set(java.util.Calendar.MILLISECOND, 0);
            c.add(java.util.Calendar.HOUR_OF_DAY, 1);
            long next = Math.min(to, c.getTimeInMillis());
            c.setTimeInMillis(t);
            double part = (next - t) / 3600000.0 * hourWeight(c.get(java.util.Calendar.HOUR_OF_DAY));
            String k = f.format(new Date(t));
            w.put(k, w.getOrDefault(k, 0.0) + part);
            total += part;
            t = next;
        }
        if (total <= 0) { d.put(b, d.optInt(b, 0) + steps); return; }
        int given = 0, i = 0, n = w.size();
        for (java.util.Map.Entry<String, Double> e : w.entrySet()) {
            int share = (++i == n) ? steps - given : (int) Math.round(steps * e.getValue() / total);
            if (share < 0) share = 0;
            given += share;
            d.put(e.getKey(), d.optInt(e.getKey(), 0) + share);
        }
    }

    static long startOfToday() {
        java.util.Calendar c = java.util.Calendar.getInstance();
        c.set(java.util.Calendar.HOUR_OF_DAY, 0); c.set(java.util.Calendar.MINUTE, 0); c.set(java.util.Calendar.SECOND, 0); c.set(java.util.Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }

    /** Called when counting is switched on, so steps already walked today since a restart this morning can be counted. */
    static void markFirstStart(Context ctx) {
        prefs(ctx).edit().putBoolean("seed", true).apply();
    }

    static long lastSampleAt(Context ctx) {
        return prefs(ctx).getLong("lastSample", 0L);
    }

    /** Adds the steps taken since the previous reading to the right day(s). */
    static synchronized void sample(Context ctx, float counter) {
        SharedPreferences p = prefs(ctx);
        String today = todayKey();
        long now = System.currentTimeMillis();
        long sinceBoot = SystemClock.elapsedRealtime();
        long bootAt = now - sinceBoot;
        float last = p.getFloat("lastCounter", -1f);
        long lastAt = p.getLong("lastSample", 0L);
        long lastBoot = p.getLong("bootAt", 0L);
        // Some phones report 0 on the very first reading. Never use that as the starting point.
        if (counter <= 0f && last < 0f) return;
        JSONObject d = days(ctx);
        try {
            if (last < 0f || lastAt <= 0L) {
                // First reading after switching on. The sensor counts since the phone started, so if the
                // phone started today, that whole number is today's steps.
                if (p.getBoolean("seed", false) && bootAt >= startOfToday() && counter > 0f && counter < sinceBoot / 1000f * 4f)
                    d.put(today, d.optInt(today, 0) + Math.round(counter));
            } else {
                // A restart resets the sensor to 0. Spot it by the start time, not only by a smaller number:
                // after a restart the new count can already be bigger than the old one.
                boolean restarted = lastBoot > 0L ? Math.abs(bootAt - lastBoot) > 60000L : counter < last;
                float diff = restarted ? counter : counter - last;
                if (!restarted && diff < 0f) { restarted = true; diff = counter; }
                long from = restarted ? Math.max(lastAt, bootAt) : lastAt;
                long secs = Math.max(1L, (now - from) / 1000L);
                // Nobody walks more than about 4 steps a second. A bigger jump is a sensor glitch,
                // so only move the starting point and do not add those steps.
                long maxPlausible = Math.max(300L, secs * 4L);
                int delta = Math.round(diff);
                if (delta > 0 && delta <= maxPlausible) addSpread(d, from, now, delta);
            }
            trim(d);
        } catch (Exception ignored) {
            // keep going with the old data
        }
        p.edit().putFloat("lastCounter", counter).putString("days", d.toString()).putLong("lastSample", now)
            .putLong("bootAt", bootAt).putBoolean("seed", false).apply();

        int total = d.optInt(today, 0);
        int goal = p.getInt("goal", 8000);
        if (goal > 0 && total >= goal && !today.equals(p.getString("notified", ""))) {
            p.edit().putString("notified", today).apply();
            notifyGoal(ctx, total, goal);
        }
        MMWidget.maybeRefresh(ctx);
    }

    /** Clears today's count and starts again from the next sensor reading. */
    static synchronized void resetToday(Context ctx) {
        SharedPreferences p = prefs(ctx);
        JSONObject d = days(ctx);
        try {
            d.put(todayKey(), 0);
        } catch (Exception ignored) {
            // nothing to clear
        }
        p.edit().putString("days", d.toString()).putFloat("lastCounter", -1f).putLong("lastSample", 0L).putBoolean("seed", false).remove("notified").apply();
    }

    private static void trim(JSONObject d) {
        if (d.length() <= KEEP_DAYS) return;
        List<String> keys = new ArrayList<>();
        Iterator<String> it = d.keys();
        while (it.hasNext()) keys.add(it.next());
        Collections.sort(keys);
        for (int i = 0; i < keys.size() - KEEP_DAYS; i++) d.remove(keys.get(i));
    }

    /** Reads the current counter value once, or reports -1 if nothing arrives in time. */
    static void readSensorOnce(Context ctx, Handler handler, long timeoutMs, Callback cb) {
        final SensorManager sm = (SensorManager) ctx.getSystemService(Context.SENSOR_SERVICE);
        final Sensor sensor = sm == null ? null : sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        if (sensor == null || !hasPermission(ctx)) {
            cb.done(-1f);
            return;
        }
        final boolean[] fired = { false };
        final SensorEventListener[] holder = new SensorEventListener[1];
        final Runnable timeout = () -> {
            if (fired[0]) return;
            fired[0] = true;
            sm.unregisterListener(holder[0]);
            cb.done(-1f);
        };
        holder[0] = new SensorEventListener() {
            @Override
            public void onSensorChanged(SensorEvent event) {
                if (fired[0]) return;
                fired[0] = true;
                handler.removeCallbacks(timeout);
                sm.unregisterListener(this);
                cb.done(event.values[0]);
            }

            @Override
            public void onAccuracyChanged(Sensor s, int accuracy) {}
        };
        try {
            sm.registerListener(holder[0], sensor, SensorManager.SENSOR_DELAY_NORMAL, handler);
            sm.flush(holder[0]);
        } catch (Exception e) {
            fired[0] = true;
            cb.done(-1f);
            return;
        }
        handler.postDelayed(timeout, timeoutMs);
    }

    private static void notifyGoal(Context ctx, int steps, int goal) {
        try {
            if (Build.VERSION.SDK_INT >= 33
                && ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                return;
            }
            if (Build.VERSION.SDK_INT >= 26) {
                NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null && nm.getNotificationChannel(CHANNEL) == null) {
                    NotificationChannel ch = new NotificationChannel(CHANNEL, "Step goal", NotificationManager.IMPORTANCE_DEFAULT);
                    ch.setDescription("Tells you when you reach your daily step goal");
                    nm.createNotificationChannel(ch);
                }
            }
            Intent open = new Intent(ctx, MainActivity.class);
            open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pi = PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_kw)
                .setColor(0xFF00E5FF)
                .setContentTitle("Step goal reached! 🎉")
                .setContentText(String.format(Locale.US, "%,d steps today. Goal was %,d. Great job!", steps, goal))
                .setContentIntent(pi)
                .setAutoCancel(true);
            NotificationManagerCompat.from(ctx).notify(GOAL_NOTIFICATION_ID, b.build());
        } catch (SecurityException ignored) {
            // notifications not allowed
        }
    }
}
