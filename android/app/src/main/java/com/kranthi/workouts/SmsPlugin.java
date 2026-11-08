package com.kranthi.workouts;

import android.Manifest;
import android.database.Cursor;
import android.net.Uri;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Reads bank and UPI messages from the phone's SMS inbox so Vyora can suggest expenses.
 * Only messages from bank-style senders that mention a debit/credit are returned. Nothing leaves the phone.
 */
@CapacitorPlugin(name = "Sms", permissions = { @Permission(strings = { Manifest.permission.READ_SMS }, alias = "sms") })
public class SmsPlugin extends Plugin {

    private boolean granted() { return getPermissionState("sms") == PermissionState.GRANTED; }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", granted());
        call.resolve(r);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (granted()) { status(call); return; }
        requestPermissionForAlias("sms", call, "permCb");
    }

    @PermissionCallback
    private void permCb(PluginCall call) { status(call); }

    /** Bank/UPI messages received after `since` (ms), newest first, at most 300. */
    @PluginMethod
    public void bankMessages(PluginCall call) {
        if (!granted()) { call.reject("SMS not allowed"); return; }
        long since = call.getLong("since", System.currentTimeMillis() - 45L * 86400000L);
        JSArray out = new JSArray();
        Cursor c = null;
        try {
            c = getContext().getContentResolver().query(Uri.parse("content://sms/inbox"), new String[] { "_id", "address", "body", "date" },
                "date > ?", new String[] { String.valueOf(since) }, "date DESC");
            int n = 0;
            while (c != null && c.moveToNext() && n < 300) {
                String addr = c.getString(1), body = c.getString(2);
                if (addr == null || body == null) continue;
                // Indian bank senders look like "VM-HDFCBK" / "AX-ICICIT"; skip phone numbers (personal chats).
                if (addr.replaceAll("[^0-9]", "").length() >= 10 && !addr.matches(".*[A-Za-z].*")) continue;
                String b = body.toLowerCase(java.util.Locale.ROOT);
                if (!(b.contains("debited") || b.contains("credited") || b.contains("spent") || b.contains("paid") || b.contains("sent") || b.contains("withdrawn") || b.contains("received"))) continue;
                if (!(b.contains("rs") || b.contains("inr") || b.contains("₹"))) continue;
                if (b.contains("otp") && !b.contains("debited")) continue;
                JSObject m = new JSObject();
                m.put("id", c.getString(0));
                m.put("from", addr);
                m.put("body", body);
                try { m.put("at", (Object) Long.valueOf(c.getLong(3))); } catch (Exception ignored) { /* optional */ }
                out.put(m);
                n++;
            }
        } catch (Exception e) {
            call.reject("Could not read messages");
            return;
        } finally {
            if (c != null) c.close();
        }
        JSObject r = new JSObject();
        r.put("messages", out);
        call.resolve(r);
    }
}
