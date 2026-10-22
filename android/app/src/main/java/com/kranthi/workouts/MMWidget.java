package com.kranthi.workouts;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.text.NumberFormat;
import java.util.Locale;

/**
 * Home-screen widget: steps today, money left and safe to spend today,
 * today's workout and the workout streak. The app sends fresh numbers
 * through WidgetPlugin; steps are read live from StepStore.
 */
public class MMWidget extends AppWidgetProvider {

    static final String PREFS = "mm_widget";
    private static long lastStepRefresh = 0L;

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, build(ctx));
    }

    /** Redraws every copy of the widget on the home screen. */
    static void refreshAll(Context ctx) {
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
            int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, MMWidget.class));
            if (ids == null || ids.length == 0) return;
            RemoteViews v = build(ctx);
            for (int id : ids) mgr.updateAppWidget(id, v);
        } catch (Exception ignored) {
            // no widget on the home screen
        }
    }

    /** Called after each step reading; redraws at most once a minute. */
    static void maybeRefresh(Context ctx) {
        long now = System.currentTimeMillis();
        if (now - lastStepRefresh < 60000L) return;
        lastStepRefresh = now;
        refreshAll(ctx);
    }

    private static String num(long n) {
        return NumberFormat.getIntegerInstance(new Locale("en", "IN")).format(n);
    }

    private static RemoteViews build(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_mm);
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONObject d;
        try {
            d = new JSONObject(p.getString("data", "{}"));
        } catch (Exception e) {
            d = new JSONObject();
        }
        boolean today = StepStore.todayKey().equals(d.optString("day", ""));
        int accent = Color.parseColor("#00E5FF");
        try {
            accent = Color.parseColor(d.optString("accent", "#00E5FF"));
        } catch (Exception ignored) {
            // keep the default colour
        }

        // Steps: live from the phone's step store when counting is on.
        boolean stepsOn = d.optBoolean("stepsOn", StepStore.isEnabled(ctx));
        int goal = Math.max(1, d.optInt("stepGoal", 8000));
        if (stepsOn) {
            int steps = Math.max(StepStore.todaySteps(ctx), today ? d.optInt("steps", 0) : 0);
            v.setTextViewText(R.id.w_steps, num(steps));
            v.setTextViewText(R.id.w_steps_goal, " / " + num(goal) + " steps");
            v.setProgressBar(R.id.w_steps_bar, 100, Math.min(100, steps * 100 / goal), false);
            v.setViewVisibility(R.id.w_steps_bar, View.VISIBLE);
        } else {
            v.setTextViewText(R.id.w_steps, "Steps off");
            v.setTextViewText(R.id.w_steps_goal, "  turn on in the app");
            v.setViewVisibility(R.id.w_steps_bar, View.GONE);
        }

        // Money: hidden behind the lock when Money lock is on.
        if (!d.optBoolean("money", false)) {
            v.setViewVisibility(R.id.w_money_row, View.GONE);
        } else if (d.optBoolean("locked", false)) {
            v.setViewVisibility(R.id.w_money_row, View.VISIBLE);
            v.setTextViewText(R.id.w_money, "🔒 Money locked");
            v.setTextViewText(R.id.w_safe, "");
        } else {
            v.setViewVisibility(R.id.w_money_row, View.VISIBLE);
            long left = d.optLong("left", 0);
            v.setTextViewText(R.id.w_money, (left < 0 ? "−₹" + num(-left) + " over" : "₹" + num(left) + " left"));
            v.setTextViewText(R.id.w_safe, today ? "  ·  safe today ₹" + num(d.optLong("safe", 0)) : "");
        }

        // Today's workout and streak.
        String workout = today ? d.optString("workout", "") : "Open the app for today's plan";
        boolean done = today && d.optBoolean("done", false);
        v.setTextViewText(R.id.w_workout, (done ? "✓ " : "🏋️ ") + workout);
        int streak = d.optInt("streak", 0);
        v.setTextViewText(R.id.w_streak, streak > 0 ? "🔥 " + streak + (streak == 1 ? " day" : " days") : "");
        v.setTextColor(R.id.w_streak, accent);
        v.setTextColor(R.id.w_steps, Color.WHITE);

        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.w_root, pi);
        return v;
    }
}
