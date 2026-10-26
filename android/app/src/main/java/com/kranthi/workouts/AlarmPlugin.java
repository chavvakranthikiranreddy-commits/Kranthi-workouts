package com.kranthi.workouts;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

/** JavaScript bridge for the alarm clock: Capacitor.Plugins.Alarm */
@CapacitorPlugin(name = "Alarm")
public class AlarmPlugin extends Plugin {

    @PluginMethod
    public void setAll(PluginCall call) {
        try {
            JSArray in = call.getArray("alarms");
            JSONArray out = new JSONArray();
            Context c = getContext();
            for (int i = 0; in != null && i < in.length(); i++) {
                JSONObject o = in.getJSONObject(i);
                // A one-off alarm that already rang stays off until the app has read that.
                if (AlarmStore.isDisabledPending(c, o.optInt("id"))) o.put("enabled", false);
                if (!o.optBoolean("enabled", false)) AlarmStore.clearSnooze(c, o.optInt("id"));
                out.put(o);
            }
            AlarmStore.save(c, out);
            AlarmStore.scheduleAll(c);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not set alarms: " + e.getMessage());
        }
    }

    @PluginMethod
    public void state(PluginCall call) {
        Context c = getContext();
        JSObject r = new JSObject();
        try {
            r.put("disabled", new JSArray(AlarmStore.prefs(c).getString("disabled", "[]")));
            String ld = AlarmStore.prefs(c).getString("lastDismiss", null);
            if (ld != null) r.put("lastDismiss", new JSObject(ld));
        } catch (Exception ignored) { /* keep */ }
        AlarmStore.prefs(c).edit().putString("disabled", "[]").apply();
        call.resolve(r);
    }

    @PluginMethod
    public void permissions(PluginCall call) {
        Context c = getContext();
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        JSObject r = new JSObject();
        r.put("exact", Build.VERSION.SDK_INT < 31 || (am != null && am.canScheduleExactAlarms()));
        r.put("fullScreen", Build.VERSION.SDK_INT < 34 || (nm != null && nm.canUseFullScreenIntent()));
        r.put("notifications", nm == null || nm.areNotificationsEnabled());
        call.resolve(r);
    }

    private void open(String action) {
        try {
            Intent i = new Intent(action, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Exception e) {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        }
    }

    @PluginMethod
    public void openExactSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 31) open(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
        call.resolve();
    }

    @PluginMethod
    public void openFullScreenSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 34) open(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
        call.resolve();
    }
}
