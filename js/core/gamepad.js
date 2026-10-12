/* ============ gamepad.js — controller (Gamepad API) ============
 * - In game: the left stick moves in analog (G.Input.axis() reads it through
 *   vector(), no keys are simulated) and the buttons call the game actions
 *   directly (move 1–4, cycle, pause, settings).
 * - In menus and overlay screens (login, menu, level-up cards, gacha, pause,
 *   settings...): stick/D-pad move a focus frame between the things you can
 *   press, A presses, B goes back, L1/R1 switch tabs.
 * - It switches between the two on its own, based on the game state.
 * - Select + Start for 2 s: debug panel (id, mapping, buttons, axes).
 *
 * Buttons go by POSITION in the standard layout (0 = bottom, 1 = right,
 * 2 = left, 3 = top), not by the printed letter.
 * The whole mapping is in CONFIG (also available as G.Gamepad.config).
 */
G.Gamepad = (() => {
  const CONFIG = {
    deadzone: 0.2,            // radial stick dead zone (in game)
    menuThreshold: 0.5,       // how far the stick must be tilted to move the focus
    repeatDelay: 0.35,        // s until a held direction repeats (menus)
    repeatRate: 0.11,         // s between repeats
    layerGrace: 0.25,         // s during which A/B are ignored after a new screen opens
    axes: { x: 0, y: 1 },     // left stick
    dpad: { up: 12, down: 13, left: 14, right: 15 },
    // In game: button index -> action
    game: { 0: 'move1', 1: 'move2', 2: 'move3', 3: 'move4', 4: 'prev', 5: 'next', 9: 'pause', 8: 'settings' },
    // Menus: button index -> action (the D-pad moves the focus)
    menu: { 0: 'confirm', 1: 'back', 4: 'tabPrev', 5: 'tabNext', 9: 'pause', 8: 'settings' },
    // Start/Select act on RELEASE (so that Select+Start doesn't trigger anything).
    onRelease: [8, 9],
    debugCombo: [8, 9], debugHold: 2,
    // Controllers without the "standard" mapping: which raw button acts as each
    // standard button and where the D-pad comes from (axes or "hat"). Tune it with the debug panel.
    fallback: {
      buttons: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12, 13: 13, 14: 14, 15: 15 },
      dpadAxes: [6, 7],       // D-pad X/Y axes, if any
      hatAxis: 9              // "hat" axis (a single axis with 8 positions), if any
    },
    // When a screen opens, the focus starts on the first of these that exists.
    defaultFocus: ['#btn-resume', '#pull-close', '.menu-item.play', '#btn-guest', '#btn-again', '.card', '.answer', '.btn.gold'],
    // Buttons that count as "back" inside the top screen.
    backButtons: '[data-back], #set-close, #legal-close, #sup-close, #bond-back, [data-a="no"]',
    focusable: 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"]), .menu-item, .tab, .chip, .card, .cell:not(.locked), .answer, .gen-tab, #slot'
  };

  const N = 17;                          // standard buttons (0..16)
  let cur = new Array(N).fill(false), prev = new Array(N).fill(false);
  let stick = [0, 0], dpadVec = [0, 0];
  let pads = [];                         // connected controllers (for the panel)
  let used = false;                      // has the controller been used since the last mouse/touch/keyboard input?
  let unlocked = false;
  let comboT = 0, comboFired = false, comboTouched = false;
  let dbg = null;
  let focusEl = null, focusKey = null, layerEl = null, layerT = 0;
  let navDir = null, navT = 0;
  let lastTs = 0;

  // ---------------- reading ----------------

  function hatToVec(v) {
    // Typical hat: -1 up, -0.71 up-right, ..., 1 up-left; out of range = released.
    if (v == null || v > 1.05 || v < -1.05) return [0, 0];
    const i = Math.round((v + 1) / (2 / 7));          // 0..7
    const DIR = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
    return DIR[i] || [0, 0];
  }

  /** Reads one controller and maps it to the standard layout. */
  function readPad(p) {
    const b = new Array(N).fill(false);
    const raw = i => { const x = p.buttons[i]; return !!x && (x.pressed || x.value > 0.5); };
    let sx = p.axes[CONFIG.axes.x] || 0, sy = p.axes[CONFIG.axes.y] || 0;
    if (p.mapping === 'standard') {
      for (let i = 0; i < N; i++) b[i] = raw(i);
    } else {
      const fb = CONFIG.fallback;
      for (const k in fb.buttons) b[k] = raw(fb.buttons[k]);
      // D-pad as axes or as a hat, if it doesn't come as buttons.
      let dx = 0, dy = 0;
      const [ax, ay] = fb.dpadAxes || [];
      if (ax != null && p.axes.length > Math.max(ax, ay)) { dx = Math.round(p.axes[ax] || 0); dy = Math.round(p.axes[ay] || 0); }
      if (!dx && !dy && fb.hatAxis != null && p.axes.length > fb.hatAxis) [dx, dy] = hatToVec(p.axes[fb.hatAxis]);
      if (dy < 0) b[12] = true; if (dy > 0) b[13] = true;
      if (dx < 0) b[14] = true; if (dx > 0) b[15] = true;
    }
    return { b, sx, sy };
  }

  function poll() {
    pads = [];
    let list = [];
    try { list = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { list = []; }
    const b = new Array(N).fill(false);
    let sx = 0, sy = 0;
    for (const p of list) {
      if (!p || !p.connected) continue;
      pads.push(p);
      const r = readPad(p);
      for (let i = 0; i < N; i++) b[i] = b[i] || r.b[i];
      // With several controllers, the most tilted stick wins.
      if (Math.hypot(r.sx, r.sy) > Math.hypot(sx, sy)) { sx = r.sx; sy = r.sy; }
    }
    prev = cur; cur = b;
    // Stick: radial dead zone, strength rescaled from the edge of the zone.
    const m = Math.hypot(sx, sy), dz = CONFIG.deadzone;
    if (m < dz) stick = [0, 0];
    else { const k = Math.min(1, (m - dz) / (1 - dz)); stick = [sx / m * k, sy / m * k]; }
    const d = CONFIG.dpad;
    const dx = (b[d.right] ? 1 : 0) - (b[d.left] ? 1 : 0), dy = (b[d.down] ? 1 : 0) - (b[d.up] ? 1 : 0);
    dpadVec = G.U.norm(dx, dy);
    return b.some(Boolean) || m >= dz;
  }

  const pressed = i => cur[i] && !prev[i];
  const released = i => !cur[i] && prev[i];

  /** Movement vector: the D-pad (8 directions) has priority; the two are never added. */
  function vector() {
    if (!pads.length) return null;
    if (dpadVec[0] || dpadVec[1]) return dpadVec;
    return stick;
  }

  // ---------------- controller / touch mode ----------------

  function markUsed() {
    if (!unlocked) firstInput();
    if (used) return;
    used = true;
    document.body.classList.add('gamepad');
    // With a controller the touch joystick isn't needed (it comes back when the screen is touched).
    if (G.Touch && G.Touch.setActive) G.Touch.setActive(false);
  }
  function markUnused() {
    if (!used) return;
    used = false;
    document.body.classList.remove('gamepad');
    clearFocus();
  }
  addEventListener('pointerdown', () => markUnused(), true);
  addEventListener('keydown', e => { if (e.isTrusted) markUnused(); }, true);

  /** The first press counts as a click: starts the audio and removes "Tap to start". */
  function firstInput() {
    unlocked = true;
    if (G.Audio) G.Audio.unlock();
  }

  // ---------------- layers (which screen is on top) ----------------

  function visible(el) {
    if (!el || !el.isConnected || el.classList.contains('hidden')) return false;
    if (el.closest('.hidden')) return false;
    const r = el.getClientRects();
    if (!r.length) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  }

  /** The visible layer on top of all others (or null if only the game is shown). */
  function topLayer() {
    const cand = document.querySelectorAll('section.scr, #pull-fx, #tap-start, #sound-panel');
    let best = null, bz = -1;
    cand.forEach(el => {
      if (!visible(el)) return;
      const z = parseInt(getComputedStyle(el).zIndex, 10) || 0;
      if (z >= bz) { best = el; bz = z; }   // with equal z, the later one in the DOM wins
    });
    return best;
  }

  /** In-game controls? Only while playing with nothing on top. */
  function gameMode(layer) {
    return !!(G.Game && G.Game.state === 'playing' && !layer && !(G.SettingsUI && G.SettingsUI.isOpen));
  }

  // ---------------- focus ----------------

  function keyOf(el) {
    const ds = el.dataset || {};
    return el.id || [ds.t, ds.k, ds.v, ds.go, ds.tab, ds.gen, ds.a].filter(x => x != null).join('|') || (el.textContent || '').trim().slice(0, 40);
  }

  function focusables(layer) {
    const roots = [layer];
    // In the main menu the top bar counts too (settings, sound, log out).
    const tb = document.getElementById('topbar');
    if (tb && visible(tb) && (parseInt(getComputedStyle(layer).zIndex, 10) || 0) < 30) roots.push(tb);
    const out = [];
    for (const r of roots) {
      r.querySelectorAll(CONFIG.focusable).forEach(el => {
        if (el.disabled || !visible(el)) return;
        if (el.closest('.cell.locked')) return;
        // A pressable element inside another (e.g. a button inside a card): the outer one counts.
        const outer = el.parentElement && el.parentElement.closest(CONFIG.focusable);
        if (outer && r.contains(outer) && out.includes(outer)) return;
        const rc = el.getBoundingClientRect();
        if (rc.width < 2 || rc.height < 2) return;
        out.push(el);
      });
    }
    return out;
  }

  function setFocus(el, silent = false) {
    if (focusEl === el) return;
    if (focusEl) {
      focusEl.classList.remove('gp-focus');
      if (document.activeElement === focusEl && /^(INPUT|TEXTAREA|SELECT)$/.test(focusEl.tagName)) focusEl.blur();
    }
    focusEl = el;
    focusKey = el ? keyOf(el) : null;
    if (!el) return;
    el.classList.add('gp-focus');
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* nothing */ }
    if (!silent && G.Audio) G.Audio.sfx('hover');
  }
  function clearFocus() { if (focusEl) focusEl.classList.remove('gp-focus'); focusEl = null; }

  function defaultFocus(list) {
    // The screen's own elements first (the top bar only if there's nothing else).
    const own = layerEl ? list.filter(e => layerEl.contains(e)) : list;
    for (const sel of CONFIG.defaultFocus) {
      const el = own.find(e => e.matches(sel));
      if (el) return el;
    }
    return own[0] || list[0] || null;
  }

  /** Keeps the focus valid (if the screen is redrawn, it looks for the same element). */
  function ensureFocus(layer) {
    const list = focusables(layer);
    if (focusEl && list.includes(focusEl)) return list;
    const again = focusKey && list.find(e => keyOf(e) === focusKey);
    if (focusEl) focusEl.classList.remove('gp-focus');
    focusEl = null;
    setFocus(again || defaultFocus(list), true);     // no sound when it repositions itself
    return list;
  }

  /** Spatial navigation: the closest element in that direction. */
  function move(dx, dy, list) {
    if (!focusEl) { setFocus(defaultFocus(list)); return; }
    const a = focusEl.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bs = Infinity;
    for (const el of list) {
      if (el === focusEl) continue;
      const r = el.getBoundingClientRect();
      const bx = r.left + r.width / 2, by = r.top + r.height / 2;
      const vx = bx - ax, vy = by - ay;
      const along = vx * dx + vy * dy;               // progress in the requested direction
      if (along <= 2) continue;
      // Sideways distance measured from the edge (uneven rows and columns).
      const side = dx ? Math.max(0, Math.abs(vy) - (a.height + r.height) / 2) : Math.max(0, Math.abs(vx) - (a.width + r.width) / 2);
      const s = along + side * 3;
      if (s < bs) { bs = s; best = el; }
    }
    if (best) setFocus(best);
  }

  // ---------------- actions ----------------

  function key(code, k) {
    // For "back", reuse whatever Esc already does on each screen.
    dispatchEvent(new KeyboardEvent('keydown', { code, key: k, bubbles: true }));
    dispatchEvent(new KeyboardEvent('keyup', { code, key: k, bubbles: true }));
  }

  function doConfirm(layer, list) {
    if (!focusEl) { setFocus(defaultFocus(list)); return; }
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(focusEl.tagName) && focusEl.type !== 'range' && focusEl.type !== 'checkbox') {
      focusEl.focus();                               // type (on mobile the keyboard comes up)
      return;
    }
    focusEl.click();
  }

  function back(layer) {
    const ae = document.activeElement;
    if (ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName)) { ae.blur(); return; }
    if (layer.id === 'sound-panel') { layer.classList.add('hidden'); return; }
    const b = [...layer.querySelectorAll(CONFIG.backButtons)].find(visible);
    if (b) { b.click(); return; }
    key('Escape', 'Escape');
  }

  function switchTab(layer, dir) {
    const groups = [...layer.querySelectorAll('.tabs, .gen-tabs')].filter(visible);
    for (const g of groups) {
      const tabs = [...g.querySelectorAll('.tab, .gen-tab')].filter(t => visible(t) && !t.disabled);
      if (tabs.length < 2) continue;
      let i = tabs.findIndex(t => t.classList.contains('on'));
      if (i < 0) i = 0;
      const t = tabs[(i + dir + tabs.length) % tabs.length];
      t.click();
      try { t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* nothing */ }
      return;
    }
  }

  function slider(dir) {
    if (!focusEl || focusEl.type !== 'range') return false;
    const step = (+focusEl.max - +focusEl.min) / 20 || 1;
    focusEl.value = Math.max(+focusEl.min, Math.min(+focusEl.max, +focusEl.value + dir * step));
    focusEl.dispatchEvent(new Event('input', { bubbles: true }));
    focusEl.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function openSettings() {
    if (!G.SettingsUI) return;
    if (G.SettingsUI.isOpen) { G.SettingsUI.close(); return; }
    // In game, settings open from the pause screen (otherwise the game would keep running).
    if (G.Game && G.Game.state === 'playing' && !G.Coop.active) G.Game.togglePause();
    G.SettingsUI.open();
  }

  function pause() {
    if (G.SettingsUI && G.SettingsUI.isOpen) { G.SettingsUI.close(); return; }
    const s = G.Game && G.Game.state;
    if (s === 'playing' || s === 'paused') G.Game.togglePause();
  }

  function doGame(act) {
    const pl = G.Game.player;
    if (!pl) return;
    if (act.startsWith('move')) {
      const i = +act.slice(4) - 1;
      if (pl.active !== i) { pl.setActive(i); }
    } else if (act === 'prev') pl.cycle(-1);
    else if (act === 'next') pl.cycle(1);
    else if (act === 'pause') pause();
    else if (act === 'settings') openSettings();
  }

  function doMenu(act, layer, list) {
    const fresh = layerT < CONFIG.layerGrace;
    if (act === 'confirm') { if (!fresh) doConfirm(layer, list); }
    else if (act === 'back') { if (!fresh) back(layer); }
    else if (act === 'tabPrev') switchTab(layer, -1);
    else if (act === 'tabNext') switchTab(layer, 1);
    else if (act === 'pause') pause();
    else if (act === 'settings') openSettings();
  }

  /** Direction to move the focus (D-pad or stick), repeating while held. */
  function navStep(dt) {
    let dx = dpadVec[0] ? Math.sign(dpadVec[0]) : 0, dy = dpadVec[1] ? Math.sign(dpadVec[1]) : 0;
    if (!dx && !dy) {
      const ax = stick[0], ay = stick[1];
      if (Math.hypot(ax, ay) >= CONFIG.menuThreshold) {
        if (Math.abs(ax) > Math.abs(ay)) dx = Math.sign(ax); else dy = Math.sign(ay);
      }
    }
    if (dx && dy) dy = 0;                              // in menus, only 4 directions
    const dir = dx || dy ? dx + ',' + dy : null;
    if (!dir) { navDir = null; return null; }
    if (dir !== navDir) { navDir = dir; navT = CONFIG.repeatDelay; return [dx, dy]; }
    navT -= dt;
    if (navT <= 0) { navT = CONFIG.repeatRate; return [dx, dy]; }
    return null;
  }

  // ---------------- loop ----------------

  function tick(ts) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.1, ((ts - lastTs) / 1000) || 0);
    lastTs = ts;
    try { step(dt); } catch (e) { console.warn('[Gamepad]', e); }
  }

  function step(dt) {
    const active = poll();
    if (!pads.length) { if (dbg) drawDebug(null, false); return; }
    const layer = topLayer();
    if (layer !== layerEl) { layerEl = layer; layerT = 0; clearFocus(); focusKey = null; navDir = null; }
    else layerT += dt;
    const any = cur.some((v, i) => v && !prev[i]);
    if (any || (stick[0] || stick[1]) && !used) markUsed();
    if (!used && !active) { if (dbg) drawDebug(layer, false); return; }
    // "Tap to start": any button works.
    if (layer && layer.id === 'tap-start') { if (any) layer.click(); return; }

    // Select + Start held: debug panel.
    const [c1, c2] = CONFIG.debugCombo;
    if (cur[c1] && cur[c2]) {
      comboTouched = true;
      comboT += dt;
      if (comboT >= CONFIG.debugHold && !comboFired) { comboFired = true; toggleDebug(); }
    } else { comboT = 0; comboFired = false; }
    if (!cur[c1] && !cur[c2] && !prev[c1] && !prev[c2]) comboTouched = false;

    const game = gameMode(layer);
    const map = game ? CONFIG.game : CONFIG.menu;
    const fire = act => game ? doGame(act) : layer ? doMenu(act, layer, list) : (act === 'pause' || act === 'settings') && doGame(act);

    let list = null;
    if (!game && layer) {
      list = ensureFocus(layer);
      const nav = navStep(dt);
      if (nav && !(nav[0] && slider(nav[0]))) move(nav[0], nav[1], list);
    } else { clearFocus(); navDir = null; }

    for (const k in map) {
      const i = +k;
      if (CONFIG.onRelease.includes(i)) {
        // On release, and only if it wasn't used as part of the Select+Start combo.
        if (released(i) && !comboTouched) fire(map[k]);
      } else if (pressed(i)) fire(map[k]);
    }
    if (dbg) drawDebug(layer, game);
  }

  // ---------------- debug panel ----------------

  function toggleDebug() {
    if (dbg) { dbg.remove(); dbg = null; return; }
    dbg = document.createElement('pre');
    dbg.id = 'gp-debug';
    dbg.setAttribute('translate', 'no');             // keep i18n from translating it
    document.body.appendChild(dbg);
  }

  function drawDebug(layer, game) {
    let list = [];
    try { list = navigator.getGamepads ? [...navigator.getGamepads()] : []; } catch (e) { /* nothing */ }
    const lines = ['CONTROLLER · Select+Start 2 s to close', ''];
    list.forEach((p, n) => {
      if (!p) return;
      const on = [];
      p.buttons.forEach((b, i) => { if (b.pressed || b.value > 0.05) on.push(b.value > 0 && b.value < 1 ? i + '(' + b.value.toFixed(2) + ')' : String(i)); });
      lines.push(`#${n} ${p.id}`);
      lines.push(`   mapping: "${p.mapping || '(empty)'}"${p.mapping === 'standard' ? '' : '  -> using CONFIG.fallback'}`);
      lines.push(`   buttons (${p.buttons.length}): ${on.join(' ') || '—'}`);
      lines.push(`   axes (${p.axes.length}): ${p.axes.map((a, i) => i + ':' + (a >= 0 ? ' ' : '') + a.toFixed(2)).join('  ')}`);
    });
    if (!list.some(Boolean)) lines.push('No controller connected (press a button).');
    lines.push('');
    lines.push(`standard: ${cur.map((v, i) => v ? i : null).filter(v => v != null).join(' ') || '—'}`);
    lines.push(`stick: ${stick[0].toFixed(2)}, ${stick[1].toFixed(2)}   d-pad: ${dpadVec[0].toFixed(2)}, ${dpadVec[1].toFixed(2)}`);
    lines.push(`mode: ${game ? 'game' : 'menu'} · state: ${G.Game ? G.Game.state : '?'} · layer: ${layer ? (layer.id || layer.className) : '—'}`);
    lines.push(`focus: ${focusEl ? (focusEl.id || focusEl.className || focusEl.tagName) : '—'}`);
    dbg.textContent = lines.join('\n');
  }

  // ---------------- styles (focus frame and panel) ----------------

  const css = document.createElement('style');
  css.textContent = `
    body.gamepad .gp-focus { outline: 3px solid #ffd23f !important; outline-offset: 3px;
      box-shadow: 0 0 0 7px rgba(255,210,63,.35), 0 0 18px rgba(255,210,63,.55) !important; position: relative; z-index: 1; }
    body.gamepad .menu-item.gp-focus { background: rgba(255,255,255,.08); }
    body.gamepad .menu-item.gp-focus::before { opacity: 1; transform: none; }
    body.gamepad { cursor: none; }
    #gp-debug { position: fixed; left: 8px; top: 8px; z-index: 300; margin: 0; padding: 10px 12px; max-width: calc(100% - 16px);
      background: rgba(0,0,0,.82); color: #9dff9d; font: 12px/1.45 ui-monospace, Consolas, monospace; white-space: pre-wrap;
      border: 1px solid #3a6; border-radius: 8px; pointer-events: none; }`;
  document.head.appendChild(css);

  addEventListener('gamepadconnected', e => console.info('[Gamepad] connected:', e.gamepad.id, '· mapping:', e.gamepad.mapping || '(empty)'));
  addEventListener('gamepaddisconnected', e => console.info('[Gamepad] disconnected:', e.gamepad.id));
  requestAnimationFrame(tick);

  /** "Back" from outside (Android Back key / B button in the app): pauses in game, goes back in menus. */
  function backFromSystem() {
    const layer = topLayer();
    if (gameMode(layer)) { pause(); return; }
    if (!layer) return;                                // nothing to close: never quit the game
    if (layer.id === 'tap-start') { layer.click(); return; }
    back(layer);
  }

  return { config: CONFIG, vector, toggleDebug, back: backFromSystem, get active() { return used; }, get pads() { return pads; } };
})();
