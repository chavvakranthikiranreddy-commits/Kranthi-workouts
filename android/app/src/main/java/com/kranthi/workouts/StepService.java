package com.kranthi.workouts;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

import java.util.Locale;

/**
 * Always-on step counting. Listens to the phone's step sensor all the time and saves often,
 * so steps land on the right day and almost nothing is lost if the phone switches off suddenly.
 * Android requires a small permanent notification for this; it shows today's steps.
 */
public class StepService extends Service implements SensorEventListener {

    static final String CHANNEL = "kw_steps_live";
    static final int NOTIF_ID = 7003;
    private static final long SAVE_EVERY_MS = 30000L;
    private static final long NOTIFY_EVERY_MS = 60000L;

    private SensorManager sm;
    private HandlerThread thread;
    private Handler handler;
    private long lastSave = 0L, lastNotify = 0L;
    private float pending = -1f;
    private String lastDay = "";
    private int shown = -1;

    @Override
    public IBinder onBind(Intent intent) { return null; }

    /** Starts the service if live counting is wanted and allowed. Safe to call often. */
    static void startIfWanted(Context c) {
        Context ctx = c.getApplicationContext();
        if (!StepStore.canCount(ctx) || !StepStore.isLive(ctx)) return;
        try {
            Intent i = new Intent(ctx, StepService.class);
            if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i); else ctx.startService(i);
        } catch (Exception ignored) {
            // Android may refuse to start it from the background; the 15-minute reading still runs.
        }
    }

    static void stop(Context c) {
        try {
            c.getApplicationContext().stopService(new Intent(c.getApplicationContext(), StepService.class));
        } catch (Exception ignored) {
            // not running
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification n = build(StepStore.todaySteps(this));
        try {
            if (Build.VERSION.SDK_INT >= 34) startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH);
            else startForeground(NOTIF_ID, n);
        } catch (Exception e) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!StepStore.canCount(this) || !StepStore.isLive(this)) { stopSelf(); return START_NOT_STICKY; }
        if (sm == null) {
            sm = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
            Sensor s = sm == null ? null : sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
            if (s == null) { stopSelf(); return START_NOT_STICKY; }
            thread = new HandlerThread("kw-steps-live");
            thread.start();
            handler = new Handler(thread.getLooper());
            // Let the sensor batch readings for up to a minute: accurate, and very light on battery.
            sm.registerListener(this, s, SensorManager.SENSOR_DELAY_NORMAL, 60000000, handler);
        }
        StepClockReceiver.scheduleNext(this);
        return START_STICKY;
    }

    @Override
    public void onSensorChanged(SensorEvent e) {
        if (e == null || e.values == null || e.values.length == 0) return;
        pending = e.values[0];
        long now = System.currentTimeMillis();
        String day = StepStore.todayKey();
        // Save at least every 30 seconds, and always at a new day so steps land on the right date.
        if (now - lastSave >= SAVE_EVERY_MS || !day.equals(lastDay)) flush(now, day);
    }

    private void flush(long now, String day) {
        if (pending < 0f) return;
        StepStore.sample(this, pending);
        lastSave = now;
        lastDay = day;
        int today = StepStore.todaySteps(this);
        if (today != shown && now - lastNotify >= NOTIFY_EVERY_MS) {
            lastNotify = now;
            shown = today;
            try {
                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) nm.notify(NOTIF_ID, build(today));
            } catch (Exception ignored) {
                // notification update is optional
            }
        }
    }

    @Override
    public void onAccuracyChanged(Sensor s, int accuracy) {}

    @Override
    public void onDestroy() {
        if (pending >= 0f) StepStore.sample(this, pending);
        if (sm != null) sm.unregisterListener(this);
        if (thread != null) thread.quitSafely();
        super.onDestroy();
    }

    private Notification build(int steps) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel(CHANNEL) == null) {
                NotificationChannel ch = new NotificationChannel(CHANNEL, "Step counting", NotificationManager.IMPORTANCE_MIN);
                ch.setDescription("Shown while Vyora counts steps all day. You can hide it in phone settings; counting continues.");
                ch.setShowBadge(false);
                nm.createNotificationChannel(ch);
            }
        }
        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 7003, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_kw)
            .setColor(0xFF3F51D9)
            .setContentTitle(String.format(Locale.US, "%,d steps today", steps))
            .setContentText("Counting steps")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setContentIntent(pi)
            .build();
    }
}
