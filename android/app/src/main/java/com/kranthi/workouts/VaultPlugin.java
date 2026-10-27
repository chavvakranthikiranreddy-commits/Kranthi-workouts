package com.kranthi.workouts;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Encrypts the Money data with an AES-256-GCM key that lives in the Android Keystore.
 * The key never leaves the phone's secure hardware and is not part of any backup,
 * so the app's own backup file is the way to move Money data to a new phone.
 * Capacitor.Plugins.Vault
 */
@CapacitorPlugin(name = "Vault")
public class VaultPlugin extends Plugin {
    private static final String ALIAS = "vyora_money_v1";
    private static final String STORE = "AndroidKeyStore";

    private SecretKey key() throws Exception {
        KeyStore ks = KeyStore.getInstance(STORE);
        ks.load(null);
        if (ks.containsAlias(ALIAS)) return ((KeyStore.SecretKeyEntry) ks.getEntry(ALIAS, null)).getSecretKey();
        KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, STORE);
        kg.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build());
        return kg.generateKey();
    }

    @PluginMethod
    public void available(PluginCall call) {
        JSObject r = new JSObject();
        try { key(); r.put("available", true); } catch (Exception e) { r.put("available", false); }
        call.resolve(r);
    }

    @PluginMethod
    public void encrypt(PluginCall call) {
        String text = call.getString("text", "");
        try {
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, key());
            byte[] iv = c.getIV();
            byte[] ct = c.doFinal(text.getBytes(StandardCharsets.UTF_8));
            byte[] out = new byte[iv.length + ct.length];
            System.arraycopy(iv, 0, out, 0, iv.length);
            System.arraycopy(ct, 0, out, iv.length, ct.length);
            JSObject r = new JSObject();
            r.put("data", Base64.encodeToString(out, Base64.NO_WRAP));
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Could not encrypt: " + e.getMessage());
        }
    }

    @PluginMethod
    public void decrypt(PluginCall call) {
        String data = call.getString("data", "");
        try {
            byte[] in = Base64.decode(data, Base64.NO_WRAP);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, in, 0, 12));
            byte[] pt = c.doFinal(in, 12, in.length - 12);
            JSObject r = new JSObject();
            r.put("text", new String(pt, StandardCharsets.UTF_8));
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Could not decrypt: " + e.getMessage());
        }
    }
}
