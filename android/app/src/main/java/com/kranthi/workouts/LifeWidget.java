package com.kranthi.workouts;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/** Life widget: next alarm, today's tasks and reminders, plus quick Note and Voice buttons. */
public class LifeWidget extends AppWidgetProvider {
    static final String PREFS = "mm_life_widget";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, build(ctx));
    }

    static void refreshAll(Context ctx) {
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
            int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, LifeWidget.class));
            if (ids == null || ids.length == 0) return;
            RemoteViews v = build(ctx);
            for (int id : ids) mgr.updateAppWidget(id, v);
        } catch (Exception ignored) {
            // no widget on the home screen
        }
    }

    static PendingIntent action(Context ctx, String what, int req) {
        Intent i = new Intent(ctx, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        i.putExtra("mm_action", what);
        return PendingIntent.getActivity(ctx, req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static RemoteViews build(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_life);
        JSONObject d;
        try { d = new JSONObject(ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("data", "{}")); } catch (Exception e) { d = new JSONObject(); }
        boolean today = StepStore.todayKey().equals(d.optString("day", ""));
        v.setTextViewText(R.id.l_alarm, d.optString("alarm", "No alarm"));
        int[] rows = { R.id.l_item1, R.id.l_item2, R.id.l_item3 };
        JSONArray items = today ? d.optJSONArray("items") : null;
        int n = items == null ? 0 : items.length();
        for (int i = 0; i < rows.length; i++) {
            if (i < n) { v.setTextViewText(rows[i], items.optString(i, "")); v.setViewVisibility(rows[i], View.VISIBLE); }
            else v.setViewVisibility(rows[i], View.GONE);
        }
        v.setViewVisibility(R.id.l_empty, n == 0 ? View.VISIBLE : View.GONE);
        v.setTextViewText(R.id.l_empty, today ? "Nothing left for today 🎉" : "Open the app to refresh");
        int more = today ? d.optInt("more", 0) : 0;
        v.setTextViewText(R.id.l_more, more > 0 ? "+" + more + " more" : "");
        v.setOnClickPendingIntent(R.id.l_root, action(ctx, "life", 31));
        v.setOnClickPendingIntent(R.id.l_note, action(ctx, "note", 32));
        v.setOnClickPendingIntent(R.id.l_voice, action(ctx, "voice", 33));
        v.setOnClickPendingIntent(R.id.l_task, action(ctx, "task", 34));
        return v;
    }
}
