package com.kranthi.workouts;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;

import java.util.Calendar;

/**
 * Takes a step reading at moments that matter for accuracy:
 *  - 23:59 every night, so the day's steps are closed off on the right date even if
 *    background readings were held back by the battery saver;
 *  - when the phone is switching off, because a restart resets the phone's step sensor to 0.
 */
public class StepClockReceiver extends BroadcastReceiver {

    static final String ACTION_MIDNIGHT = "com.kranthi.workouts.STEP_MIDNIGHT";
    private static final int REQ = 7102;

    @Override
    public void onReceive(Context c, Intent intent) {
        final Context ctx = c.getApplicationContext();
        String a = intent == null ? "" : String.valueOf(intent.getAction());
        boolean midnight = ACTION_MIDNIGHT.equals(a);
        if (midnight) scheduleNext(ctx);
        if (!StepStore.canCount(ctx)) return;
        final PendingResult pr = goAsync();
        final HandlerThread t = new HandlerThread("kw-steps-clock");
        t.start();
        StepStore.readSensorOnce(ctx, new Handler(t.getLooper()), midnight ? 8000 : 2500, value -> {
            try {
                if (value >= 0) StepStore.sample(ctx, value);
            } finally {
                t.quitSafely();
                pr.finish();
            }
        });
    }

    /** Books tonight's 23:59 reading. Safe to call often: it replaces the previous booking. */
    static void scheduleNext(Context ctx) {
        try {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            PendingIntent pi = pending(ctx);
            if (!StepStore.isEnabled(ctx)) { am.cancel(pi); return; }
            Calendar cal = Calendar.getInstance();
            cal.set(Calendar.HOUR_OF_DAY, 23); cal.set(Calendar.MINUTE, 59); cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0);
            if (cal.getTimeInMillis() <= System.currentTimeMillis() + 5000L) cal.add(Calendar.DAY_OF_MONTH, 1);
            long at = cal.getTimeInMillis();
            boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
            if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        } catch (Exception ignored) {
            // the 15-minute background reading still runs
        }
    }

    static void cancel(Context ctx) {
        try {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (am != null) am.cancel(pending(ctx));
        } catch (Exception ignored) {
            // nothing booked
        }
    }

    private static PendingIntent pending(Context ctx) {
        Intent i = new Intent(ctx, StepClockReceiver.class).setAction(ACTION_MIDNIGHT);
        return PendingIntent.getBroadcast(ctx, REQ, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
