package com.kranthi.workouts;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** JavaScript bridge for the home-screen widget: Capacitor.Plugins.Widget */
@CapacitorPlugin(name = "Widget")
public class WidgetPlugin extends Plugin {

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
}
