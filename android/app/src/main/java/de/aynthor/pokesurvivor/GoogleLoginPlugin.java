package de.aynthor.pokesurvivor;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Locale;

/**
 * Google-Anmeldung für die App.
 *
 * Google erlaubt die Anmeldung nicht in eingebetteten WebViews. Darum läuft sie
 * im echten Chrome: Die App startet einen kleinen HTTP-Server nur auf
 * 127.0.0.1 (zufälliger Port) und öffnet http://localhost:PORT/login in Chrome.
 * "localhost" ist in jedem Firebase-Projekt als Anmelde-Domain erlaubt. Die Seite
 * (res/raw/google_login.html) meldet sich per Firebase signInWithPopup an und
 * schickt das Google-Token (idToken + accessToken) mit einem Einmal-Code an
 * diesen Server zurück. Das Spiel meldet sich damit in der WebView per
 * signInWithCredential an (siehe js/core/native.js und js/core/db.js).
 *
 * JS: Capacitor.nativePromise('GoogleLogin', 'signIn', { config }) -> { idToken, accessToken }
 */
@CapacitorPlugin(name = "GoogleLogin")
public class GoogleLoginPlugin extends Plugin {
    private static final String TAG = "GoogleLogin";
    private static final long TIMEOUT_MS = 10 * 60 * 1000;   // nach 10 Minuten aufgeben

    private PluginCall pending;
    private ServerSocket server;
    private String nonce;
    private String page;

    @PluginMethod
    public void signIn(PluginCall call) {
        JSObject cfg = call.getObject("config");
        if (cfg == null || !cfg.has("apiKey") || !cfg.has("authDomain")) {
            call.reject("Falta la configuración de Firebase", "config");
            return;
        }
        // Ein früherer, nicht beendeter Versuch wird abgebrochen.
        finish(null, "Cancelado", "auth/popup-closed-by-user");
        try {
            nonce = randomHex(16);
            page = loadPage()
                .replace("__CONFIG__", cfg.toString().replace("</", "<\\/"))
                .replace("__NONCE__", nonce)
                .replace("__RETURN__", "intent://login#Intent;scheme=pokesurvivor;package=" + getContext().getPackageName() + ";end");
            server = new ServerSocket(0, 8, InetAddress.getByName("127.0.0.1"));
        } catch (IOException e) {
            call.reject("No se pudo preparar el inicio de sesión: " + e.getMessage(), "auth/internal-error");
            return;
        }
        pending = call;
        final ServerSocket s = server;
        final int port = s.getLocalPort();
        Thread t = new Thread(() -> serve(s), "google-login-server");
        t.setDaemon(true);
        t.start();
        new Thread(() -> {
            try { Thread.sleep(TIMEOUT_MS); } catch (InterruptedException ignored) { return; }
            if (server == s) finish(null, "Tiempo agotado", "auth/timeout");
        }, "google-login-timeout").start();

        Uri uri = Uri.parse("http://localhost:" + port + "/login?n=" + nonce);
        Intent i = new Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (isInstalled("com.android.chrome")) i.setPackage("com.android.chrome");
        try {
            getActivity().startActivity(i);
        } catch (ActivityNotFoundException e) {
            i.setPackage(null);
            try { getActivity().startActivity(i); }
            catch (ActivityNotFoundException e2) { finish(null, "No hay ningún navegador instalado", "auth/operation-not-supported-in-this-environment"); }
        }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        finish(null, "Cancelado", "auth/popup-closed-by-user");
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        finish(null, "Cancelado", "auth/popup-closed-by-user");
    }

    // ---------------- Ergebnis ----------------

    /** Beendet den laufenden Versuch: mit Token (ok != null) oder mit Fehler. */
    private synchronized void finish(JSObject ok, String error, String code) {
        if (server != null) {
            try { server.close(); } catch (IOException ignored) { }
            server = null;
        }
        PluginCall c = pending;
        pending = null;
        if (c == null) return;
        if (ok != null) c.resolve(ok);
        else c.reject(error, code);
    }

    // ---------------- Mini-HTTP-Server ----------------

    private void serve(ServerSocket s) {
        while (!s.isClosed()) {
            try (Socket sock = s.accept()) {
                sock.setSoTimeout(15000);
                handle(sock);
            } catch (IOException e) {
                if (!s.isClosed()) Log.w(TAG, "Verbindung: " + e.getMessage());
            }
        }
    }

    private void handle(Socket sock) throws IOException {
        InputStream in = sock.getInputStream();
        String head = readHead(in);
        if (head == null) return;
        String[] lines = head.split("\r\n");
        String[] req = lines[0].split(" ");
        if (req.length < 2) return;
        String method = req[0], path = req[1];
        int len = 0;
        for (String l : lines) {
            if (l.toLowerCase(Locale.ROOT).startsWith("content-length:")) {
                try { len = Integer.parseInt(l.substring(15).trim()); } catch (NumberFormatException ignored) { }
            }
        }
        OutputStream out = sock.getOutputStream();

        if (method.equals("GET") && path.equals("/login?n=" + nonce)) {
            send(out, 200, "text/html; charset=utf-8", page);
            return;
        }
        if (method.equals("POST") && path.equals("/token") && len > 0 && len < 64 * 1024) {
            byte[] body = new byte[len];
            int r = 0;
            while (r < len) {
                int n = in.read(body, r, len - r);
                if (n < 0) break;
                r += n;
            }
            try {
                JSONObject j = new JSONObject(new String(body, 0, r, StandardCharsets.UTF_8));
                if (!nonce.equals(j.optString("n"))) { send(out, 403, "application/json", "{\"ok\":false}"); return; }
                send(out, 200, "application/json", "{\"ok\":true}");
                if (j.has("error")) {
                    finish(null, j.optString("message", "Error"), j.optString("error"));
                } else {
                    JSObject res = new JSObject();
                    res.put("idToken", j.optString("idToken", null));
                    res.put("accessToken", j.optString("accessToken", null));
                    finish(res, null, null);
                }
            } catch (Exception e) {
                send(out, 400, "application/json", "{\"ok\":false}");
            }
            return;
        }
        send(out, 404, "text/plain", "Not found");
    }

    private static String readHead(InputStream in) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        int c, state = 0;
        while ((c = in.read()) >= 0) {
            b.write(c);
            // Ende der Kopfzeilen: \r\n\r\n
            state = (c == '\r' && (state == 0 || state == 2)) ? state + 1 : (c == '\n' && (state == 1 || state == 3)) ? state + 1 : 0;
            if (state == 4) return b.toString("ISO-8859-1");
            if (b.size() > 16 * 1024) return null;
        }
        return null;
    }

    private static void send(OutputStream out, int status, String type, String body) throws IOException {
        byte[] data = body.getBytes(StandardCharsets.UTF_8);
        String reason = status == 200 ? "OK" : status == 403 ? "Forbidden" : status == 400 ? "Bad Request" : "Not Found";
        String head = "HTTP/1.1 " + status + " " + reason + "\r\n"
            + "Content-Type: " + type + "\r\n"
            + "Content-Length: " + data.length + "\r\n"
            + "Cache-Control: no-store\r\n"
            + "Referrer-Policy: no-referrer\r\n"
            + "Connection: close\r\n\r\n";
        out.write(head.getBytes(StandardCharsets.ISO_8859_1));
        out.write(data);
        out.flush();
    }

    // ---------------- Hilfen ----------------

    private String loadPage() throws IOException {
        try (InputStream in = getContext().getResources().openRawResource(R.raw.google_login)) {
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
            return b.toString("UTF-8");
        }
    }

    private boolean isInstalled(String pkg) {
        try {
            getContext().getPackageManager().getPackageInfo(pkg, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    private static String randomHex(int bytes) {
        byte[] b = new byte[bytes];
        new SecureRandom().nextBytes(b);
        StringBuilder sb = new StringBuilder();
        for (byte x : b) sb.append(String.format("%02x", x));
        return sb.toString();
    }
}
