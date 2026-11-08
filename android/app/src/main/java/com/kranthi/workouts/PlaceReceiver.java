package com.kranthi.workouts;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.location.LocationManager;

/** Called by Android when you enter (or leave) a saved place. Only arrivals show a reminder. */
public class PlaceReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        if (i == null) return;
        boolean entering = i.getBooleanExtra(LocationManager.KEY_PROXIMITY_ENTERING, false);
        String id = i.getStringExtra("id");
        if (entering && id != null) PlaceStore.notifyArrival(c.getApplicationContext(), id);
    }
}
