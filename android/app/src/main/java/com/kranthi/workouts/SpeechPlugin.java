package com.kranthi.workouts;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.speech.RecognizerIntent;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Locale;

/** Voice add: opens the phone's speech-to-text and returns what was said. Capacitor.Plugins.Speech */
@CapacitorPlugin(name = "Speech")
public class SpeechPlugin extends Plugin {

    @PluginMethod
    public void listen(PluginCall call) {
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, call.getString("lang", Locale.getDefault().toLanguageTag()));
        i.putExtra(RecognizerIntent.EXTRA_PROMPT, call.getString("prompt", "Say a reminder, task, note or expense"));
        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
        try {
            startActivityForResult(call, i, "onResult");
        } catch (ActivityNotFoundException e) {
            call.reject("This phone has no speech-to-text. Install or update the Google app.");
        }
    }

    @ActivityCallback
    private void onResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { call.reject("cancelled"); return; }
        ArrayList<String> said = result.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
        if (said == null || said.isEmpty()) { call.reject("nothing heard"); return; }
        JSObject r = new JSObject();
        r.put("text", said.get(0));
        JSArray all = new JSArray();
        for (String s : said) all.put(s);
        r.put("all", all);
        call.resolve(r);
    }
}
