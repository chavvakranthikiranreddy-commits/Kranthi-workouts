package com.kranthi.workouts;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AudioDuckPlugin.class);
        registerPlugin(StepsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
