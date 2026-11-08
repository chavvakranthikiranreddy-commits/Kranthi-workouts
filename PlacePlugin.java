package com.kranthi.workouts;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.List;
import java.util.Locale;

/**
 * JavaScript bridge for location: Capacitor.Plugins.Place
 * Your location is only used on the phone: weather for where you are, place reminders,
 * the place an expense was made, and walk/run routes. Nothing is uploaded.
 */
@CapacitorPlugin(
    name = "Place",
    permissions = {
        @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }, alias = "location"),
        @Permission(strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION }, alias = "background")
    }
)
public class PlacePlugin extends Plugin {

    private final Handler main = new Handler(Looper.getMainLooper());

    private boolean granted() { return getPermissionState("location") == PermissionState.GRANTED; }

    private boolean background() {
        if (Build.VERSION.SDK_INT < 29) return granted();
        return getPermissionState("background") == PermissionState.GRANTED;
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", granted());
        r.put("background", background());
        r.put("routeRunning", RouteService.running(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (granted()) { status(call); return; }
        requestPermissionForAlias("location", call, "permCb");
    }

    /** Place reminders need "Allow all the time". Android shows its own settings page for this. */
    @PluginMethod
    public void requestBackground(PluginCall call) {
        if (!granted()) { requestPermissionForAlias("location", call, "permCb"); return; }
        if (background()) { status(call); return; }
        requestPermissionForAlias("background", call, "permCb");
    }

    @PermissionCallback
    private void permCb(PluginCall call) {
        if (granted()) PlaceStore.registerAll(getContext());
        status(call);
    }

    /** Where the phone is now. Uses a recent fix if there is one, otherwise waits up to 12 seconds. */
    @SuppressLint("MissingPermission")
    @PluginMethod
    public void current(final PluginCall call) {
        if (!granted()) { call.reject("Location not allowed"); return; }
        final LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) { call.reject("No location on this phone"); return; }
        Location best = null;
        for (String p : new String[] { LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER }) {
            try {
                Location l = lm.getLastKnownLocation(p);
                if (l != null && (best == null || l.getTime() > best.getTime())) best = l;
            } catch (Exception ignored) { /* provider off */ }
        }
        if (best != null && System.currentTimeMillis() - best.getTime() < 10 * 60000L) { call.resolve(toJs(best)); return; }
        final Location fallback = best;
        final boolean[] done = { false };
        final LocationListener[] holder = new LocationListener[1];
        holder[0] = new LocationListener() {
            @Override public void onLocationChanged(Location l) {
                if (done[0]) return; done[0] = true;
                try { lm.removeUpdates(this); } catch (Exception ignored) { /* already removed */ }
                call.resolve(toJs(l));
            }
            @Override public void onStatusChanged(String p, int s, Bundle b) {}
            @Override public void onProviderEnabled(String p) {}
            @Override public void onProviderDisabled(String p) {}
        };
        try {
            if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 0L, 0f, holder[0], Looper.getMainLooper());
            if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 0L, 0f, holder[0], Looper.getMainLooper());
        } catch (Exception e) { /* handled by the timeout */ }
        main.postDelayed(() -> {
            if (done[0]) return; done[0] = true;
            try { lm.removeUpdates(holder[0]); } catch (Exception ignored) { /* nothing */ }
            if (fallback != null) call.resolve(toJs(fallback)); else call.reject("Could not find your location. Turn on Location and try again.");
        }, 12000L);
    }

    private JSObject toJs(Location l) {
        JSObject r = new JSObject();
        try {
            r.put("lat", (Object) Double.valueOf(l.getLatitude()));
            r.put("lng", (Object) Double.valueOf(l.getLongitude()));
            r.put("acc", l.hasAccuracy() ? Math.round(l.getAccuracy()) : 0);
            r.put("at", (Object) Double.valueOf(l.getTime()));
        } catch (Exception ignored) {
            // fields are optional
        }
        return r;
    }

    /** Turns coordinates into a short place name, e.g. "HSR Layout, Bengaluru". Needs internet. */
    @PluginMethod
    public void name(final PluginCall call) {
        final double lat = call.getDouble("lat", 0.0), lng = call.getDouble("lng", 0.0);
        new Thread(() -> {
            JSObject r = new JSObject();
            try {
                @SuppressWarnings("deprecation")
                List<Address> a = new Geocoder(getContext(), Locale.getDefault()).getFromLocation(lat, lng, 1);
                if (a != null && !a.isEmpty()) {
                    Address x = a.get(0);
                    String area = x.getSubLocality() != null ? x.getSubLocality() : x.getFeatureName();
                    r.put("area", area == null ? "" : area);
                    r.put("city", x.getLocality() == null ? (x.getSubAdminArea() == null ? "" : x.getSubAdminArea()) : x.getLocality());
                }
            } catch (Exception ignored) { /* offline: no name */ }
            call.resolve(r);
        }).start();
    }

    /** Saves place reminders: [{id, lat, lng, radius, title, body, place, once}]. */
    @PluginMethod
    public void setPlaces(PluginCall call) {
        JSArray a = call.getArray("places");
        try { PlaceStore.save(getContext(), a == null ? new JSONArray() : new JSONArray(a.toString())); } catch (Exception e) { call.reject("Bad places"); return; }
        JSObject r = new JSObject();
        r.put("background", background());
        call.resolve(r);
    }

    /** Reminders that already went off while the app was closed (one-time ones), so the app can mark them done. */
    @PluginMethod
    public void firedPlaces(PluginCall call) {
        String f = PlaceStore.prefs(getContext()).getString("fired", "");
        PlaceStore.prefs(getContext()).edit().putString("fired", "").apply();
        JSObject r = new JSObject();
        r.put("ids", f);
        call.resolve(r);
    }

    @PluginMethod
    public void startRoute(PluginCall call) {
        if (!granted()) { call.reject("Location not allowed"); return; }
        Intent i = new Intent(getContext(), RouteService.class).putExtra("kind", call.getString("kind", "walk"));
        try {
            if (Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(i); else getContext().startService(i);
            call.resolve();
        } catch (Exception e) { call.reject("Could not start tracking"); }
    }

    @PluginMethod
    public void stopRoute(PluginCall call) {
        try { getContext().startService(new Intent(getContext(), RouteService.class).setAction("stop")); } catch (Exception ignored) { /* already stopped */ }
        main.postDelayed(() -> routeStatus(call), 600L);
    }

    @PluginMethod
    public void routeStatus(PluginCall call) {
        JSObject r = new JSObject();
        r.put("running", RouteService.running(getContext()));
        r.put("route", RouteService.prefs(getContext()).getString("route", "{}"));
        call.resolve(r);
    }
}
