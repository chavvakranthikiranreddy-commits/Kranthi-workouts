package com.kranthi.workouts;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.PowerManager;
import android.provider.Settings;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** JavaScript bridge for the step counter: Capacitor.Plugins.Steps */
@CapacitorPlugin(
    name = "Steps",
    permissions = { @Permission(strings = { Manifest.permission.ACTIVITY_RECOGNITION }, alias = "activity") }
)
public class StepsPlugin extends Plugin {

    private final Handler main = new Handler(Looper.getMainLooper());

    private boolean granted() {
        if (Build.VERSION.SDK_INT < 29) return true;
        return getPermissionState("activity") == PermissionState.GRANTED;
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("available", StepStore.hasSensor(getContext()));
        r.put("granted", granted());
        r.put("enabled", StepStore.isEnabled(getContext()));
        r.put("batteryOk", batteryOk());
        r.put("live", StepStore.isLive(getContext()));
        call.resolve(r);
    }

    /** True when the phone's battery saver will not hold back Vyora's background step readings. */
    private boolean batteryOk() {
        try {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            return pm == null || pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        } catch (Exception e) {
            return true;
        }
    }

    /** Asks Android to let Vyora run in the background (shows the system "Allow" dialog). */
    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        String pkg = getContext().getPackageName();
        try {
            Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + pkg));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Exception e) {
            try {
                Intent i = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
            } catch (Exception e2) {
                Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + pkg));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (granted()) {
            JSObject r = new JSObject();
            r.put("granted", true);
            call.resolve(r);
            return;
        }
        requestPermissionForAlias("activity", call, "permissionResult");
    }

    @PermissionCallback
    private void permissionResult(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", granted());
        call.resolve(r);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (!StepStore.isEnabled(getContext())) StepStore.markFirstStart(getContext());
        StepStore.setEnabled(getContext(), true);
        StepWorker.schedule(getContext());
        StepClockReceiver.scheduleNext(getContext());
        StepService.startIfWanted(getContext());
        refreshInto(call);
    }

    /** Turns always-on counting (with its small notification) on or off. */
    @PluginMethod
    public void setLive(PluginCall call) {
        Boolean on = call.getBoolean("on", true);
        StepStore.setLive(getContext(), on == null || on);
        if (on == null || on) StepService.startIfWanted(getContext()); else StepService.stop(getContext());
        JSObject r = new JSObject();
        r.put("live", StepStore.isLive(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        StepStore.setEnabled(getContext(), false);
        StepWorker.cancel(getContext());
        StepClockReceiver.cancel(getContext());
        StepService.stop(getContext());
        call.resolve();
    }

    @PluginMethod
    public void setGoal(PluginCall call) {
        Integer goal = call.getInt("goal", 8000);
        StepStore.setGoal(getContext(), goal == null ? 8000 : goal);
        call.resolve();
    }

    @PluginMethod
    public void resetToday(PluginCall call) {
        StepStore.resetToday(getContext());
        refreshInto(call);
    }

    @PluginMethod
    public void refresh(PluginCall call) {
        refreshInto(call);
    }

    private void refreshInto(final PluginCall call) {
        if (!StepStore.canCount(getContext())) {
            call.resolve(result(false));
            return;
        }
        // Make sure the background reading and tonight's 23:59 reading are booked (the phone may have dropped them).
        StepWorker.schedule(getContext());
        StepClockReceiver.scheduleNext(getContext());
        StepService.startIfWanted(getContext());
        StepStore.readSensorOnce(getContext(), main, 3000, value -> {
            if (value >= 0) StepStore.sample(getContext(), value);
            call.resolve(result(value >= 0));
        });
    }

    private JSObject result() {
        return result(false);
    }

    private JSObject result(boolean fresh) {
        JSObject r = new JSObject();
        r.put("fresh", fresh);
        try {
            r.put("lastAt", StepStore.lastSampleAt(getContext()));
        } catch (Exception ignored) {
            // optional field
        }
        r.put("today", StepStore.todaySteps(getContext()));
        try {
            r.put("days", new JSObject(StepStore.days(getContext()).toString()));
        } catch (Exception e) {
            r.put("days", new JSObject());
        }
        return r;
    }
}
