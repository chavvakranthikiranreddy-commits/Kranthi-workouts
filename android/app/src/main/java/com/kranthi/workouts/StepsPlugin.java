package com.kranthi.workouts;

import android.Manifest;
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
        call.resolve(r);
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
        StepStore.setEnabled(getContext(), true);
        StepWorker.schedule(getContext());
        refreshInto(call);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        StepStore.setEnabled(getContext(), false);
        StepWorker.cancel(getContext());
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
            call.resolve(result());
            return;
        }
        StepStore.readSensorOnce(getContext(), main, 3000, value -> {
            if (value >= 0) StepStore.sample(getContext(), value);
            call.resolve(result());
        });
    }

    private JSObject result() {
        JSObject r = new JSObject();
        r.put("today", StepStore.todaySteps(getContext()));
        try {
            r.put("days", new JSObject(StepStore.days(getContext()).toString()));
        } catch (Exception e) {
            r.put("days", new JSObject());
        }
        return r;
    }
}
