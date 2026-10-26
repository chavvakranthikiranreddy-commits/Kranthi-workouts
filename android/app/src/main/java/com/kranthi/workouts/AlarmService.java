package com.kranthi.workouts;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;

import org.json.JSONObject;

import java.io.File;
import java.lang.ref.WeakReference;
import java.util.Calendar;
import java.util.Locale;

/** Plays the alarm sound (on the alarm volume) and shows the full-screen alarm until it is snoozed or turned off. */
public class AlarmService extends Service {
    static final String ACTION_RING = "com.kranthi.workouts.ALARM_RING";
    static final String ACTION_DISMISS = "com.kranthi.workouts.ALARM_DISMISS";
    static final String ACTION_SNOOZE = "com.kranthi.workouts.ALARM_SNOOZE";
    static final String CHANNEL = "mm_alarm";
    static final int NOTIF_ID = 4242;
    static final long MAX_RING_MS = 10 * 60 * 1000L;

    static int ringingId = 0;
    static WeakReference<AlarmActivity> screen = new WeakReference<>(null);

    private MediaPlayer player;
    private Vibrator vibrator;
    private PowerManager.WakeLock wake;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private float vol = 0.15f;

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        int id = intent != null ? intent.getIntExtra("id", ringingId) : ringingId;
        if (ACTION_DISMISS.equals(action)) { dismiss(id); return START_NOT_STICKY; }
        if (ACTION_SNOOZE.equals(action)) { snooze(id); return START_NOT_STICKY; }
        JSONObject a = AlarmStore.find(this, id);
        if (a == null) { stopSelf(); return START_NOT_STICKY; }
        stopSound();
        ringingId = id;
        Notification n = buildNotification(a);
        if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        else startForeground(NOTIF_ID, n);
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wake = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "mm:alarm");
            wake.acquire(MAX_RING_MS + 5000);
        }
        startSound(a.optString("sound", ""));
        if (a.optBoolean("vibrate", true)) startVibrate();
        try {
            Intent full = new Intent(this, AlarmActivity.class);
            full.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
            full.putExtra("id", id);
            startActivity(full);
        } catch (Exception ignored) { /* the full-screen notification shows it instead */ }
        handler.postDelayed(() -> { if (ringingId == id) stopAll(); }, MAX_RING_MS);
        return START_NOT_STICKY;
    }

    static String timeText(JSONObject a) {
        Calendar cal = Calendar.getInstance();
        int h = cal.get(Calendar.HOUR_OF_DAY), m = cal.get(Calendar.MINUTE);
        return String.format(Locale.US, "%d:%02d %s", ((h + 11) % 12) + 1, m, h < 12 ? "AM" : "PM");
    }

    private Notification buildNotification(JSONObject a) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Alarms", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Alarm clock");
            ch.setSound(null, null);
            ch.enableVibration(false);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            ch.setBypassDnd(true);
            nm.createNotificationChannel(ch);
        }
        int id = a.optInt("id");
        Intent full = new Intent(this, AlarmActivity.class);
        full.putExtra("id", id);
        full.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        PendingIntent fullPI = PendingIntent.getActivity(this, 4244, full, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent dis = PendingIntent.getService(this, 4245, new Intent(this, AlarmService.class).setAction(ACTION_DISMISS).putExtra("id", id), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent snz = PendingIntent.getService(this, 4246, new Intent(this, AlarmService.class).setAction(ACTION_SNOOZE).putExtra("id", id), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        b.setSmallIcon(R.drawable.ic_stat_kw)
            .setContentTitle(a.optString("label", "Alarm"))
            .setContentText(timeText(a))
            .setCategory(Notification.CATEGORY_ALARM)
            .setPriority(Notification.PRIORITY_MAX)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setContentIntent(fullPI)
            .setFullScreenIntent(fullPI, true);
        if (a.optInt("snooze", 0) > 0) b.addAction(new Notification.Action.Builder(null, "Snooze " + a.optInt("snooze") + " min", snz).build());
        b.addAction(new Notification.Action.Builder(null, "Turn off", dis).build());
        return b.build();
    }

    private void startSound(String path) {
        try {
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            if (path != null && !path.isEmpty() && new File(path).exists()) player.setDataSource(path);
            else {
                Uri u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (u == null) u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                player.setDataSource(this, u);
            }
            player.setLooping(true);
            player.prepare();
            player.setVolume(vol, vol);
            player.start();
            rampUp();
        } catch (Exception e) {
            // A broken file: fall back to the phone's alarm sound.
            try {
                if (player != null) player.release();
                player = new MediaPlayer();
                player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());
                player.setDataSource(this, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM));
                player.setLooping(true);
                player.prepare();
                player.start();
            } catch (Exception ignored) { player = null; }
        }
    }

    // Starts soft and gets louder over about 30 seconds.
    private void rampUp() {
        handler.postDelayed(new Runnable() {
            @Override public void run() {
                if (player == null) return;
                vol = Math.min(1f, vol + 0.06f);
                try { player.setVolume(vol, vol); } catch (Exception ignored) { return; }
                if (vol < 1f) handler.postDelayed(this, 2000);
            }
        }, 2000);
    }

    private void startVibrate() {
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator == null) return;
        long[] pattern = {0, 700, 600};
        if (Build.VERSION.SDK_INT >= 26) vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0), new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());
        else vibrator.vibrate(pattern, 0);
    }

    private void stopSound() {
        handler.removeCallbacksAndMessages(null);
        if (player != null) { try { player.stop(); } catch (Exception ignored) { /* already stopped */ } player.release(); player = null; }
        if (vibrator != null) { vibrator.cancel(); vibrator = null; }
        vol = 0.15f;
    }

    private void stopAll() {
        stopSound();
        ringingId = 0;
        AlarmActivity act = screen.get();
        if (act != null) act.finish();
        if (wake != null && wake.isHeld()) wake.release();
        if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE); else stopForeground(true);
        stopSelf();
    }

    private void dismiss(int id) {
        try {
            JSONObject last = new JSONObject();
            last.put("id", id);
            last.put("at", System.currentTimeMillis());
            AlarmStore.prefs(this).edit().putString("lastDismiss", last.toString()).apply();
        } catch (Exception ignored) { /* keep */ }
        AlarmStore.clearSnooze(this, id);
        stopAll();
    }

    private void snooze(int id) {
        JSONObject a = AlarmStore.find(this, id);
        int min = a != null ? a.optInt("snooze", 10) : 10;
        AlarmStore.snooze(this, id, min > 0 ? min : 10);
        stopAll();
    }

    @Override
    public void onDestroy() {
        stopSound();
        if (wake != null && wake.isHeld()) wake.release();
        super.onDestroy();
    }
}
