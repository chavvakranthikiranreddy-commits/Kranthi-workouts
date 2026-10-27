package com.kranthi.workouts;

import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Rect;
import android.net.Uri;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Reads text from payment screenshots on the phone (Google ML Kit, works offline).
 * Screenshots arrive either from the in-app picker (recognize) or from the
 * Android share sheet (PhonePe / Google Pay -> Share -> Muscle & Money).
 */
@CapacitorPlugin(name = "Ocr")
public class OcrPlugin extends Plugin {

    private static final int MAX_SIDE = 2400;
    private static final int THUMB_WIDTH = 720;
    private static final int MAX_PDF = 15 * 1024 * 1024;

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final List<JSObject> pending = new ArrayList<>();
    private TextRecognizer recognizer;

    private synchronized TextRecognizer recognizer() {
        if (recognizer == null) recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        return recognizer;
    }

    /** Called for the launch intent and for every later share into the app. */
    @Override
    protected void handleOnNewIntent(Intent intent) {
        if (intent == null) return;
        String type = intent.getType();
        String action = intent.getAction();
        if (type == null) return;
        if (type.equals("application/pdf") && Intent.ACTION_SEND.equals(action)) {
            final Uri pdf = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (pdf == null) return;
            intent.setAction(null);
            io.execute(() -> {
                JSObject r = new JSObject();
                try {
                    byte[] bytes = readBytes(pdf, MAX_PDF);
                    if (bytes == null) r.put("error", "Could not open this PDF");
                    else r.put("pdf", Base64.encodeToString(bytes, Base64.NO_WRAP));
                } catch (Exception e) {
                    r.put("error", "Could not open this PDF");
                }
                synchronized (pending) { pending.add(r); }
                JSObject ev = new JSObject();
                ev.put("count", 1);
                notifyListeners("shared", ev, true);
            });
            return;
        }
        if (!type.startsWith("image/")) return;
        final List<Uri> uris = new ArrayList<>();
        if (Intent.ACTION_SEND.equals(action)) {
            Uri u = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (u != null) uris.add(u);
        } else if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            ArrayList<Uri> list = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (list != null) uris.addAll(list);
        }
        if (uris.isEmpty()) return;
        // Mark as handled so a screen rotation or app restart does not import it again.
        intent.setAction(null);
        io.execute(() -> {
            int added = 0;
            for (Uri u : uris) {
                try {
                    Bitmap bmp = decodeUri(u);
                    if (bmp == null) continue;
                    JSObject r = recognizeBitmap(bmp);
                    r.put("image", "data:image/jpeg;base64," + thumb(bmp));
                    synchronized (pending) { pending.add(r); }
                    added++;
                } catch (Exception e) {
                    JSObject r = new JSObject();
                    r.put("error", friendly(e));
                    synchronized (pending) { pending.add(r); }
                    added++;
                }
            }
            if (added > 0) {
                JSObject ev = new JSObject();
                ev.put("count", added);
                notifyListeners("shared", ev, true);
            }
        });
    }

    /** Screenshots that were shared into the app and not yet shown. */
    @PluginMethod
    public void getPending(PluginCall call) {
        JSArray arr = new JSArray();
        synchronized (pending) {
            for (JSObject o : pending) arr.put(o);
            pending.clear();
        }
        JSObject r = new JSObject();
        r.put("items", arr);
        call.resolve(r);
    }

    /** Reads text from an image picked inside the app (base64 or data URL). */
    @PluginMethod
    public void recognize(final PluginCall call) {
        final String data = call.getString("data", "");
        io.execute(() -> {
            try {
                String b64 = data;
                int comma = b64.indexOf(',');
                if (b64.startsWith("data:") && comma > 0) b64 = b64.substring(comma + 1);
                byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
                Bitmap bmp = decodeBytes(bytes);
                if (bmp == null) {
                    call.reject("Could not open this image");
                    return;
                }
                call.resolve(recognizeBitmap(bmp));
            } catch (Exception e) {
                call.reject(friendly(e));
            }
        });
    }

    /** The text model comes from Google Play services and may still be downloading on first use. */
    static String friendly(Exception e) {
        String m = String.valueOf(e.getMessage()).toLowerCase();
        Throwable c = e.getCause();
        if (c != null) m += " " + String.valueOf(c.getMessage()).toLowerCase();
        if (m.contains("waiting") || m.contains("download") || m.contains("module")) return "The screenshot reader is still downloading on this phone. Try again in a minute";
        return "Could not read this screenshot";
    }

    private JSObject recognizeBitmap(Bitmap bmp) throws Exception {
        Text result = Tasks.await(recognizer().process(InputImage.fromBitmap(bmp, 0)));
        JSArray lines = new JSArray();
        for (Text.TextBlock block : result.getTextBlocks()) {
            for (Text.Line line : block.getLines()) {
                JSObject l = new JSObject();
                l.put("t", line.getText());
                Rect b = line.getBoundingBox();
                if (b != null) {
                    l.put("x", b.left);
                    l.put("y", b.top);
                    l.put("w", b.width());
                    l.put("h", b.height());
                }
                lines.put(l);
            }
        }
        JSObject r = new JSObject();
        r.put("text", result.getText());
        r.put("lines", lines);
        r.put("width", bmp.getWidth());
        r.put("height", bmp.getHeight());
        return r;
    }

    private Bitmap decodeUri(Uri uri) throws Exception {
        byte[] bytes = readBytes(uri, Integer.MAX_VALUE);
        return bytes == null ? null : decodeBytes(bytes);
    }

    private byte[] readBytes(Uri uri, int max) throws Exception {
        try (InputStream in = getContext().getContentResolver().openInputStream(uri)) {
            if (in == null) return null;
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
                if (out.size() > max) return null;
            }
            return out.toByteArray();
        }
    }

    private Bitmap decodeBytes(byte[] bytes) {
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        BitmapFactory.decodeByteArray(bytes, 0, bytes.length, o);
        int side = Math.max(o.outWidth, o.outHeight);
        int sample = 1;
        while (side / sample > MAX_SIDE) sample *= 2;
        BitmapFactory.Options o2 = new BitmapFactory.Options();
        o2.inSampleSize = sample;
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.length, o2);
    }

    private String thumb(Bitmap bmp) {
        Bitmap t = bmp;
        if (bmp.getWidth() > THUMB_WIDTH) {
            int h = Math.round(bmp.getHeight() * (THUMB_WIDTH / (float) bmp.getWidth()));
            t = Bitmap.createScaledBitmap(bmp, THUMB_WIDTH, h, true);
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        t.compress(Bitmap.CompressFormat.JPEG, 70, out);
        return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
    }
}
