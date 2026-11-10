package com.kranthi.workouts;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AudioDuckPlugin.class);
        registerPlugin(StepsPlugin.class);
        registerPlugin(OcrPlugin.class);
        registerPlugin(AppLockPlugin.class);
        registerPlugin(WidgetPlugin.class);
        registerPlugin(AlarmPlugin.class);
        registerPlugin(SpeechPlugin.class);
        registerPlugin(VaultPlugin.class);
        registerPlugin(PlacePlugin.class);
        registerPlugin(SmsPlugin.class);
        super.onCreate(savedInstanceState);
        applyFontScale();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyFontScale();
    }

    /** Follow the phone's font size setting (Settings → Display → Font size), capped tightly so big numbers (timers, totals) stay inside their circles and cards. */
    private void applyFontScale() {
        try {
            float scale = getResources().getConfiguration().fontScale;
            int zoom = Math.max(90, Math.min(108, Math.round(scale * 100)));
            if (getBridge() != null && getBridge().getWebView() != null) getBridge().getWebView().getSettings().setTextZoom(zoom);
        } catch (Exception ignored) {
            // keep the default size
        }
    }
}
