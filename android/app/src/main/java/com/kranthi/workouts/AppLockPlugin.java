package com.kranthi.workouts;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Fingerprint / face / phone PIN lock for the Money side of the app. */
@CapacitorPlugin(name = "AppLock")
public class AppLockPlugin extends Plugin {

    private static final int AUTH = BiometricManager.Authenticators.BIOMETRIC_WEAK
        | BiometricManager.Authenticators.DEVICE_CREDENTIAL;

    @PluginMethod
    public void available(PluginCall call) {
        int r = BiometricManager.from(getContext()).canAuthenticate(AUTH);
        JSObject o = new JSObject();
        o.put("available", r == BiometricManager.BIOMETRIC_SUCCESS);
        call.resolve(o);
    }

    @PluginMethod
    public void authenticate(final PluginCall call) {
        final String title = call.getString("title", "Unlock Money");
        final boolean[] done = { false };
        getActivity().runOnUiThread(() -> {
            try {
                BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle(title)
                    .setSubtitle("Use your fingerprint or phone screen lock")
                    .setAllowedAuthenticators(AUTH)
                    .build();
                BiometricPrompt prompt = new BiometricPrompt(getActivity(), ContextCompat.getMainExecutor(getContext()),
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                            if (done[0]) return;
                            done[0] = true;
                            JSObject o = new JSObject();
                            o.put("ok", true);
                            call.resolve(o);
                        }

                        @Override
                        public void onAuthenticationError(int code, CharSequence msg) {
                            if (done[0]) return;
                            done[0] = true;
                            JSObject o = new JSObject();
                            o.put("ok", false);
                            o.put("error", msg == null ? "" : msg.toString());
                            call.resolve(o);
                        }
                    });
                prompt.authenticate(info);
            } catch (Exception e) {
                if (done[0]) return;
                done[0] = true;
                JSObject o = new JSObject();
                o.put("ok", false);
                o.put("error", "Lock not available");
                call.resolve(o);
            }
        });
    }

    /** Hide the app content in the recent-apps screen and block screenshots while private screens are open. */
    @PluginMethod
    public void setSecure(final PluginCall call) {
        final boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        if (getActivity() == null) { call.resolve(); return; }
        getActivity().runOnUiThread(() -> {
            try {
                if (on) getActivity().getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE);
                else getActivity().getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE);
            } catch (Exception ignored) {
                // keep going
            }
            call.resolve();
        });
    }
}
