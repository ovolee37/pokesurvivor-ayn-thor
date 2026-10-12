package de.aynthor.pokesurvivor;

import android.os.Build;
import android.os.Bundle;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.WindowManager;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * PokéSurvivor als Android-App (AYN Thor & Co.).
 *
 * - Vollbild (Immersive), Bildschirm bleibt an, Musik ohne vorheriges Tippen.
 * - Google-Anmeldung über Chrome statt in der WebView: GoogleLoginPlugin.
 * - Zurück-Taste / Zurück-Geste schließen die App NICHT: sie gehen als Ereignis
 *   'ps-back' ans Spiel (js/core/native.js -> G.Gamepad.back()).
 * - Controller-Tasten (KEYCODE_BUTTON_*, D-Pad) und Sticks gehen direkt an die
 *   WebView (dort landen sie in der Gamepad-API) und werden danach als
 *   verbraucht gemeldet: so macht Android weder Fokus-Navigation daraus noch
 *   aus der B-Taste ein "Zurück", das die App beenden würde.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GoogleLoginPlugin.class);   // Google-Anmeldung über Chrome (siehe dort)
        super.onCreate(savedInstanceState);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        hideSystemBars();

        WebView wv = webView();
        if (wv != null) {
            wv.getSettings().setMediaPlaybackRequiresUserGesture(false);
            wv.setFocusable(true);
            wv.setFocusableInTouchMode(true);
            wv.requestFocus();
        }

        // Falls "Zurück" doch über den Dispatcher kommt (z. B. Geste): auch nur ans Spiel.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                sendBack();
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private WebView webView() {
        return getBridge() != null ? getBridge().getWebView() : null;
    }

    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    /** "Zurück" ans Spiel melden (pausiert im Spiel, geht in Menüs eine Ebene zurück). */
    private void sendBack() {
        WebView wv = webView();
        if (wv == null) return;
        wv.post(() -> wv.evaluateJavascript("window.dispatchEvent(new Event('ps-back'))", null));
    }

    private static boolean fromGamepad(InputDevice dev, int source) {
        int gp = InputDevice.SOURCE_GAMEPAD, js = InputDevice.SOURCE_JOYSTICK;
        if ((source & gp) == gp || (source & js) == js) return true;
        return dev != null && (dev.supportsSource(gp) || dev.supportsSource(js));
    }

    private static boolean isDpad(int code) {
        return code == KeyEvent.KEYCODE_DPAD_UP || code == KeyEvent.KEYCODE_DPAD_DOWN
            || code == KeyEvent.KEYCODE_DPAD_LEFT || code == KeyEvent.KEYCODE_DPAD_RIGHT
            || code == KeyEvent.KEYCODE_DPAD_CENTER;
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();

        // Zurück (auch wenn ein Controller B als BACK meldet): nie die App schließen.
        if (code == KeyEvent.KEYCODE_BACK) {
            if (e.getAction() == KeyEvent.ACTION_UP && !e.isCanceled()) sendBack();
            return true;
        }

        // Controller-Tasten direkt an die WebView (Gamepad-API) und als verbraucht melden.
        if (KeyEvent.isGamepadButton(code) || (isDpad(code) && fromGamepad(e.getDevice(), e.getSource()))) {
            WebView wv = webView();
            if (wv != null) wv.dispatchKeyEvent(e);
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent e) {
        // Sticks, Trigger und Hat-D-Pad: direkt an die WebView.
        if (fromGamepad(e.getDevice(), e.getSource()) && e.getAction() == MotionEvent.ACTION_MOVE) {
            WebView wv = webView();
            if (wv != null && wv.dispatchGenericMotionEvent(e)) return true;
        }
        return super.dispatchGenericMotionEvent(e);
    }
}
