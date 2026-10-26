package com.kranthi.workouts;

import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** JavaScript bridge for the home-screen widgets: Capacitor.Plugins.Widget */
@CapacitorPlugin(name = "Widget")
public class WidgetPlugin extends Plugin {
    private static String pending = null;

    @PluginMethod
    public void update(PluginCall call) {
        JSObject d = call.getData();
        try {
            d.put("day", StepStore.todayKey());
        } catch (Exception ignored) {
            // keep going
        }
        getContext().getSharedPreferences(MMWidget.PREFS, android.content.Context.MODE_PRIVATE)
            .edit().putString("data", d.toString()).apply();
        MMWidget.refreshAll(getContext());
        call.resolve();
    }

    /** Life widget: next alarm and today's items. */
    @PluginMethod
    public void updateLife(PluginCall call) {
        JSObject d = call.getData();
        try {
            d.put("day", StepStore.todayKey());
        } catch (Exception ignored) {
            // keep going
        }
        getContext().getSharedPreferences(LifeWidget.PREFS, android.content.Context.MODE_PRIVATE)
            .edit().putString("data", d.toString()).apply();
        LifeWidget.refreshAll(getContext());
        call.resolve();
    }

    /** The widget button that opened the app (note, voice, task, life), read once. */
    @PluginMethod
    public void pendingAction(PluginCall call) {
        String a = pending;
        pending = null;
        if (a == null && getActivity() != null) {
            Intent i = getActivity().getIntent();
            if (i != null) {
                a = i.getStringExtra("mm_action");
                i.removeExtra("mm_action");
            }
        }
        JSObject r = new JSObject();
        r.put("action", a);
        call.resolve(r);
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        String a = intent != null ? intent.getStringExtra("mm_action") : null;
        if (a == null) return;
        intent.removeExtra("mm_action");
        pending = null;
        JSObject d = new JSObject();
        d.put("action", a);
        notifyListeners("action", d, true);
    }
}
