/* ============ native.js — cuando el juego va dentro de la app Android (Capacitor) ============
 * - G.Native.isApp: true dentro de la app (window.Capacitor lo pone la app antes
 *   que cualquier script).
 * - Entrar con Google: Google no deja hacerlo dentro de la app (WebView), así que
 *   se hace en Chrome (GoogleLoginPlugin.java) y aquí llega el token de Google
 *   para entrar con signInWithCredential (ver db.js).
 * - La tecla Atrás de Android y el botón B del mando no cierran la app: MainActivity
 *   las convierte en el evento 'ps-back' y aquí se tratan como "volver" del juego.
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
   * Abre Chrome para entrar con Google y devuelve { idToken, accessToken }.
   * Si vuelves al juego sin haber entrado, se cancela solo a los pocos segundos.
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
