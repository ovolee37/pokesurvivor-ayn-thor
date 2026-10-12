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
 * PokéSurvivor as an Android app (AYN Thor and similar devices).
 *
 * - Fullscreen (immersive), screen stays on, music plays without a tap first.
 * - Google sign-in runs in Chrome instead of the WebView: GoogleLoginPlugin.
 * - The Back key / back gesture do NOT close the app: they are sent to the game
 *   as the 'ps-back' event (js/core/native.js -> G.Gamepad.back()).
 * - Controller buttons (KEYCODE_BUTTON_*, D-pad) and sticks go straight to the
 *   WebView (where they reach the Gamepad API) and are then reported as
 *   consumed: this way Android neither turns them into focus navigation nor
 *   turns the B button into a "Back" that would close the app.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GoogleLoginPlugin.class);   // Google sign-in via Chrome (see there)
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

        // In case "Back" still comes through the dispatcher (e.g. gesture): only to the game as well.
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

    /** Sends "Back" to the game (pauses in game, goes back one level in menus). */
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

        // Back (also when a controller reports B as BACK): never close the app.
        if (code == KeyEvent.KEYCODE_BACK) {
            if (e.getAction() == KeyEvent.ACTION_UP && !e.isCanceled()) sendBack();
            return true;
        }

        // Controller buttons go straight to the WebView (Gamepad API) and are reported as consumed.
        if (KeyEvent.isGamepadButton(code) || (isDpad(code) && fromGamepad(e.getDevice(), e.getSource()))) {
            WebView wv = webView();
            if (wv != null) wv.dispatchKeyEvent(e);
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent e) {
        // Sticks, triggers and hat D-pad: straight to the WebView.
        if (fromGamepad(e.getDevice(), e.getSource()) && e.getAction() == MotionEvent.ACTION_MOVE) {
            WebView wv = webView();
            if (wv != null && wv.dispatchGenericMotionEvent(e)) return true;
        }
        return super.dispatchGenericMotionEvent(e);
    }
}
