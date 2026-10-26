package com.kranthi.workouts;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Alarms booked with the system are cleared on restart, so book them again. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        AlarmStore.scheduleAll(c);
    }
}
