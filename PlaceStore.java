package com.kranthi.workouts;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

/** Place reminders: Android tells us when you arrive at a saved place, and we show the reminder. */
final class PlaceStore {
    static final String PREFS = "kw_places";
    static final String CHANNEL = "kw_places";
    private PlaceStore() {}

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    static JSONArray list(Context c) {
        try { return new JSONArray(prefs(c).getString("places", "[]")); } catch (Exception e) { return new JSONArray(); }
    }

    static boolean hasFine(Context c) {
        return c.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || c.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private static PendingIntent pending(Context c, int idx, String id, int flags) {
        Intent i = new Intent(c, PlaceReceiver.class).setAction("com.kranthi.workouts.PLACE." + id);
        i.putExtra("id", id);
        return PendingIntent.getBroadcast(c, 9000 + idx, i, flags);
    }

    /** Saves the list and books an arrival alert for each place. */
    static void save(Context c, JSONArray places) {
        JSONArray old = list(c);
        clearAll(c, old);
        prefs(c).edit().putString("places", places.toString()).apply();
        registerAll(c);
    }

    static void clearAll(Context c, JSONArray places) {
        try {
            LocationManager lm = (LocationManager) c.getSystemService(Context.LOCATION_SERVICE);
            if (lm == null) return;
            for (int i = 0; i < places.length(); i++) {
                JSONObject p = places.getJSONObject(i);
                PendingIntent pi = pending(c, i, p.optString("id"), PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_MUTABLE);
                if (pi != null) { lm.removeProximityAlert(pi); pi.cancel(); }
            }
        } catch (Exception ignored) {
            // nothing booked
        }
    }

    @SuppressWarnings("MissingPermission")
    static void registerAll(Context c) {
        if (!hasFine(c)) return;
        try {
            LocationManager lm = (LocationManager) c.getSystemService(Context.LOCATION_SERVICE);
            if (lm == null) return;
            JSONArray ps = list(c);
            for (int i = 0; i < ps.length(); i++) {
                JSONObject p = ps.getJSONObject(i);
                float r = (float) Math.max(100, p.optDouble("radius", 150));
                // Android adds the "entering" flag to this intent, so it must stay mutable.
                lm.addProximityAlert(p.getDouble("lat"), p.getDouble("lng"), r, -1, pending(c, i, p.optString("id"), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE));
            }
        } catch (Exception ignored) {
            // location off or not allowed
        }
    }

    static void notifyArrival(Context c, String id) {
        JSONArray ps = list(c);
        JSONObject hit = null;
        int idx = -1;
        for (int i = 0; i < ps.length(); i++) { JSONObject p = ps.optJSONObject(i); if (p != null && id.equals(p.optString("id"))) { hit = p; idx = i; } }
        if (hit == null) return;
        // Don't repeat the same reminder within 30 minutes (GPS can wobble at the edge).
        long last = prefs(c).getLong("last_" + id, 0L), now = System.currentTimeMillis();
        if (now - last < 30 * 60000L) return;
        prefs(c).edit().putLong("last_" + id, now).apply();
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null)
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Place reminders", NotificationManager.IMPORTANCE_HIGH));
        Intent open = new Intent(c, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("mm_action", "life");
        PendingIntent pi = PendingIntent.getActivity(c, 9500 + idx, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        nm.notify(9500 + idx, new NotificationCompat.Builder(c, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_kw).setColor(0xFF3F51D9)
            .setContentTitle(hit.optString("title", "Reminder"))
            .setContentText(hit.optString("body", "You're at " + hit.optString("place", "this place")))
            .setAutoCancel(true).setContentIntent(pi).build());
        if (hit.optBoolean("once", true)) {
            ps.remove(idx);
            save(c, ps);
            prefs(c).edit().putString("fired", prefs(c).getString("fired", "") + id + ",").apply();
        }
    }
}
