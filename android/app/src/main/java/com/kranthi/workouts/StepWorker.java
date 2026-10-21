package com.kranthi.workouts;

import android.content.Context;
import android.os.Handler;
import android.os.HandlerThread;

import androidx.annotation.NonNull;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/** Wakes up about every 15 minutes, even when the app is closed, to save the latest step count. */
public class StepWorker extends Worker {

    private static final String WORK_NAME = "kw-steps";

    public StepWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        final Context ctx = getApplicationContext();
        if (!StepStore.canCount(ctx)) return Result.success();
        HandlerThread thread = new HandlerThread("kw-steps");
        thread.start();
        Handler handler = new Handler(thread.getLooper());
        final CountDownLatch latch = new CountDownLatch(1);
        StepStore.readSensorOnce(ctx, handler, 8000, value -> {
            if (value >= 0) StepStore.sample(ctx, value);
            latch.countDown();
        });
        try {
            latch.await(12, TimeUnit.SECONDS);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
        thread.quitSafely();
        return Result.success();
    }

    static void schedule(Context ctx) {
        PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(StepWorker.class, 15, TimeUnit.MINUTES).build();
        WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, req);
    }

    static void cancel(Context ctx) {
        WorkManager.getInstance(ctx).cancelUniqueWork(WORK_NAME);
    }
}
