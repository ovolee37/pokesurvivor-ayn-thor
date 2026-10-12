/* ============ native.js — when the game runs inside the Android app (Capacitor) ============
 * - G.Native.isApp: true inside the app (the app sets window.Capacitor before
 *   any script runs).
 * - Google sign-in: Google doesn't allow it inside the app (WebView), so it
 *   happens in Chrome (GoogleLoginPlugin.java) and the Google token arrives here
 *   to sign in with signInWithCredential (see db.js).
 * - The Android Back key and the controller's B button don't close the app:
 *   MainActivity turns them into the 'ps-back' event, handled here as the game's "back".
 */
G.Native = (() => {
  const cap = window.Capacitor;
  const isApp = !!(cap && (cap.isNativePlatform ? cap.isNativePlatform() : cap.platform && cap.platform !== 'web'));
  if (isApp) {
    document.documentElement.classList.add('app');
    const css = document.createElement('style');
    css.textContent = 'html.app #btn-full { display: none !important; }';
    document.head.appendChild(css);
  }
  addEventListener('ps-back', () => { if (G.Gamepad) G.Gamepad.back(); });

  /**
   * Opens Chrome to sign in with Google and returns { idToken, accessToken }.
   * If you return to the game without signing in, it cancels itself after a few seconds.
   */
  function googleSignIn(config) {
    if (!isApp || !cap.nativePromise) return Promise.reject({ code: 'auth/operation-not-supported-in-this-environment' });
    return new Promise((resolve, reject) => {
      let done = false, timer = 0;
      const onVis = () => {
        clearTimeout(timer);
        if (document.hidden) return;
        timer = setTimeout(() => { if (!done) cap.nativePromise('GoogleLogin', 'cancel', {}).catch(() => {}); }, 4000);
      };
      const end = () => { done = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVis); };
      document.addEventListener('visibilitychange', onVis);
      cap.nativePromise('GoogleLogin', 'signIn', { config }).then(
        r => { end(); resolve(r); },
        e => { end(); reject({ code: (e && e.code) || 'auth/popup-closed-by-user', message: e && e.message }); });
    });
  }

  return { isApp, googleSignIn };
})();
