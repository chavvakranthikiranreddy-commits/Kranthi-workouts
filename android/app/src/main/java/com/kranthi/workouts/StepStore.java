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

    /** Adds the steps taken since the previous reading to today's total. */
    static synchronized void sample(Context ctx, float counter) {
        SharedPreferences p = prefs(ctx);
        String today = todayKey();
        float last = p.getFloat("lastCounter", -1f);
        JSONObject d = days(ctx);
        int delta = 0;
        if (last >= 0) {
            float diff = counter - last;
            // A smaller number means the phone restarted and the sensor began again from zero.
            delta = Math.round(diff >= 0 ? diff : counter);
            if (delta > 60000) delta = 0; // ignore impossible jumps
        }
        int total = d.optInt(today, 0) + Math.max(0, delta);
        try {
            d.put(today, total);
            trim(d);
        } catch (Exception ignored) {
            // keep going with the old data
        }
        p.edit().putFloat("lastCounter", counter).putString("days", d.toString()).putLong("lastSample", System.currentTimeMillis()).apply();

        int goal = p.getInt("goal", 8000);
        if (goal > 0 && total >= goal && !today.equals(p.getString("notified", ""))) {
            p.edit().putString("notified", today).apply();
            notifyGoal(ctx, total, goal);
        }
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
