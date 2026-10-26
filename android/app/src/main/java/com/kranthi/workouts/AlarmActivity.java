package com.kranthi.workouts;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONObject;

/** The full-screen alarm shown over the lock screen, with Snooze and Turn off. */
public class AlarmActivity extends Activity {
    private int id;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        AlarmService.screen = new java.lang.ref.WeakReference<>(this);
        build(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        build(intent);
    }

    private float dp(float v) { return v * getResources().getDisplayMetrics().density; }

    private Button button(String text, int bg, int fg) {
        Button btn = new Button(this);
        btn.setText(text);
        btn.setAllCaps(false);
        btn.setTextSize(20);
        btn.setTypeface(Typeface.DEFAULT_BOLD);
        btn.setTextColor(fg);
        GradientDrawable d = new GradientDrawable();
        d.setColor(bg);
        d.setCornerRadius(dp(40));
        btn.setBackground(d);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, (int) dp(72));
        lp.topMargin = (int) dp(14);
        btn.setLayoutParams(lp);
        return btn;
    }

    private void build(Intent intent) {
        id = intent.getIntExtra("id", AlarmService.ringingId);
        JSONObject a = AlarmStore.find(this, id);
        if (AlarmService.ringingId == 0) { finish(); return; }
        String label = a != null ? a.optString("label", "Alarm") : "Alarm";
        int snooze = a != null ? a.optInt("snooze", 0) : 0;

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setBackgroundColor(Color.parseColor("#0D0F12"));
        int pad = (int) dp(28);
        root.setPadding(pad, (int) dp(110), pad, (int) dp(48));

        TextView tag = new TextView(this);
        tag.setText("⏰  " + label);
        tag.setTextColor(Color.parseColor("#00E5FF"));
        tag.setTextSize(20);
        tag.setTypeface(Typeface.DEFAULT_BOLD);
        tag.setGravity(Gravity.CENTER);
        root.addView(tag);

        TextView time = new TextView(this);
        time.setText(AlarmService.timeText(a != null ? a : new JSONObject()));
        time.setTextColor(Color.WHITE);
        time.setTextSize(72);
        time.setTypeface(Typeface.create("sans-serif-light", Typeface.NORMAL));
        time.setGravity(Gravity.CENTER);
        root.addView(time);

        TextView quote = new TextView(this);
        quote.setText("Win the morning, win the day.");
        quote.setTextColor(Color.parseColor("#8B95A3"));
        quote.setTextSize(16);
        quote.setGravity(Gravity.CENTER);
        quote.setPadding(0, (int) dp(8), 0, 0);
        root.addView(quote);

        View spacer = new View(this);
        root.addView(spacer, new LinearLayout.LayoutParams(1, 0, 1f));

        if (snooze > 0) {
            Button s = button("Snooze " + snooze + " min", Color.parseColor("#2C313A"), Color.WHITE);
            s.setOnClickListener(v -> send(AlarmService.ACTION_SNOOZE));
            root.addView(s);
        }
        Button d = button("Turn off", Color.parseColor("#00E5FF"), Color.parseColor("#00262B"));
        d.setOnClickListener(v -> send(AlarmService.ACTION_DISMISS));
        root.addView(d);
        setContentView(root);
    }

    private void send(String action) {
        Intent i = new Intent(this, AlarmService.class);
        i.setAction(action);
        i.putExtra("id", id);
        startService(i);
        finish();
    }

    @Override
    public void onBackPressed() {
        // The alarm keeps ringing until Snooze or Turn off is pressed.
    }
}
