package com.kranthi.workouts;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.util.Locale;

/** Today widget: next workout, steps against the goal, and the next agenda item. */
public class TodayWidget extends AppWidgetProvider {
    static final String PREFS = "kw_today_widget";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, build(ctx));
    }

    static void refreshAll(Context ctx) {
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
            int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, TodayWidget.class));
            if (ids == null || ids.length == 0) return;
            RemoteViews v = build(ctx);
            for (int id : ids) mgr.updateAppWidget(id, v);
        } catch (Exception ignored) {
            // no widget placed
        }
    }

    private static RemoteViews build(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_today);
        JSONObject d;
        try { d = new JSONObject(ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("data", "{}")); } catch (Exception e) { d = new JSONObject(); }
        boolean today = StepStore.todayKey().equals(d.optString("day", ""));
        int steps = Math.max(StepStore.todaySteps(ctx), today ? d.optInt("steps", 0) : 0);
        int goal = d.optInt("goal", 8000);
        v.setTextViewText(R.id.t_workout, today ? d.optString("workout", "Plan your workout") : "Open Vyora for today's plan");
        v.setTextViewText(R.id.t_steps, String.format(Locale.US, "%,d / %,d steps", steps, goal));
        v.setProgressBar(R.id.t_bar, 100, goal > 0 ? Math.min(100, steps * 100 / goal) : 0, false);
        v.setTextViewText(R.id.t_next, today ? d.optString("next", "Nothing scheduled") : "");
        v.setOnClickPendingIntent(R.id.t_root, LifeWidget.action(ctx, "today", 41));
        v.setOnClickPendingIntent(R.id.t_expense, LifeWidget.action(ctx, "expense", 42));
        v.setOnClickPendingIntent(R.id.t_water, LifeWidget.action(ctx, "water", 43));
        v.setOnClickPendingIntent(R.id.t_start, LifeWidget.action(ctx, "start", 44));
        return v;
    }
}
