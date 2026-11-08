package com.kranthi.workouts;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Looper;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Locale;

/** Records an outdoor walk or run with GPS while the screen is off. Points stay on the phone. */
public class RouteService extends Service implements LocationListener {
    static final String PREFS = "kw_route";
    static final String CHANNEL = "kw_route";
    static final int NOTIF = 7010;

    private LocationManager lm;
    private Location last;
    private double dist;
    private long start;
    private String kind = "walk";
    private JSONArray pts = new JSONArray();
    private long lastSave, lastNote;

    @Override
    public IBinder onBind(Intent i) { return null; }

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    static boolean running(Context c) { return prefs(c).getBoolean("running", false); }

    static JSONObject current(Context c) {
        try { return new JSONObject(prefs(c).getString("route", "{}")); } catch (Exception e) { return new JSONObject(); }
    }

    @SuppressLint("MissingPermission")
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "stop".equals(intent.getAction())) { finish(); return START_NOT_STICKY; }
        if (intent != null && intent.getStringExtra("kind") != null) kind = intent.getStringExtra("kind");
        start = System.currentTimeMillis();
        dist = 0; pts = new JSONArray(); last = null;
        prefs(this).edit().putBoolean("running", true).apply();
        Notification n = note();
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIF, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            else startForeground(NOTIF, n);
        } catch (Exception e) { finish(); return START_NOT_STICKY; }
        lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        try {
            lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 3000L, 4f, this, Looper.getMainLooper());
        } catch (Exception e) {
            try { lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 5000L, 10f, this, Looper.getMainLooper()); } catch (Exception e2) { finish(); }
        }
        save(true);
        return START_NOT_STICKY;
    }

    @Override
    public void onLocationChanged(Location l) {
        if (l == null || (l.hasAccuracy() && l.getAccuracy() > 35f)) return;
        if (last != null) {
            float d = last.distanceTo(l);
            float secs = Math.max(1f, (l.getTime() - last.getTime()) / 1000f);
            if (d / secs > 12f) return; // faster than a sprint: a GPS jump, skip it
            if (d < 3f) return;
            dist += d;
        }
        last = l;
        try { pts.put(new JSONArray().put(round(l.getLatitude())).put(round(l.getLongitude())).put(System.currentTimeMillis() - start)); } catch (Exception ignored) { /* skip point */ }
        long now = System.currentTimeMillis();
        if (now - lastSave > 10000L) save(false);
        if (now - lastNote > 15000L) {
            lastNote = now;
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.notify(NOTIF, note());
        }
    }

    private static double round(double v) { return Math.round(v * 1e6) / 1e6; }

    private void save(boolean force) {
        lastSave = System.currentTimeMillis();
        try {
            JSONObject r = new JSONObject();
            r.put("kind", kind); r.put("start", start); r.put("dist", Math.round(dist)); r.put("secs", (System.currentTimeMillis() - start) / 1000L); r.put("pts", pts);
            prefs(this).edit().putString("route", r.toString()).apply();
        } catch (Exception ignored) {
            // keep recording
        }
    }

    private Notification note() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null && nm.getNotificationChannel(CHANNEL) == null)
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Walk and run tracking", NotificationManager.IMPORTANCE_LOW));
        long secs = start > 0 ? (System.currentTimeMillis() - start) / 1000L : 0;
        Intent open = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("mm_action", "route");
        PendingIntent pi = PendingIntent.getActivity(this, 7010, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_kw).setColor(0xFF3F51D9)
            .setContentTitle(String.format(Locale.US, "%s · %.2f km", "run".equals(kind) ? "Run" : "Walk", dist / 1000.0))
            .setContentText(String.format(Locale.US, "%d:%02d elapsed · tap to open", secs / 60, secs % 60))
            .setOngoing(true).setOnlyAlertOnce(true).setContentIntent(pi).build();
    }

    private void finish() {
        try { if (lm != null) lm.removeUpdates(this); } catch (Exception ignored) { /* not listening */ }
        save(true);
        prefs(this).edit().putBoolean("running", false).apply();
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        try { if (lm != null) lm.removeUpdates(this); } catch (Exception ignored) { /* not listening */ }
        prefs(this).edit().putBoolean("running", false).apply();
        super.onDestroy();
    }

    @Override public void onStatusChanged(String p, int s, Bundle b) {}
    @Override public void onProviderEnabled(String p) {}
    @Override public void onProviderDisabled(String p) {}
}
