package com.kranthi.workouts;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.HandlerThread;

/** Alarms booked with the system are cleared on restart, so book them again. Also restarts step counting. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        AlarmStore.scheduleAll(c);
        final Context ctx = c.getApplicationContext();
        if (!StepStore.canCount(ctx)) return;
        StepWorker.schedule(ctx);
        StepClockReceiver.scheduleNext(ctx);
        StepService.startIfWanted(ctx);
        // First reading after the restart, so steps from now on are counted from the right starting point.
        final PendingResult pr = goAsync();
        final HandlerThread t = new HandlerThread("kw-steps-boot");
        t.start();
        StepStore.readSensorOnce(ctx, new Handler(t.getLooper()), 8000, value -> {
            try {
                if (value >= 0) StepStore.sample(ctx, value);
            } finally {
                t.quitSafely();
                pr.finish();
            }
        });
    }
}
