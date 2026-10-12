/* ============ guard.js — vigilancia anti-trampas ============
 * Un juego del navegador no se puede blindar del todo (el código está en tu
 * ordenador), pero sí se puede hacer que las trampas más fáciles no sirvan
 * para el ranking. Durante la partida se mira una vez por segundo:
 *
 *   reloj       el tiempo de juego no puede ir más deprisa que el real
 *   vida        vida por encima del máximo, o un máximo imposible
 *   velocidad / ataque / nivel / experiencia / recarga / imán
 *               valores que no se pueden alcanzar jugando
 *   derrotados / monedas         subidas imposibles de un segundo a otro
 *   debug       se han usado las herramientas de pruebas o de vídeo
 *
 * Si salta algo, la partida no cuenta para el ranking ni para tus récords
 * (las monedas y lo demás sí, para no castigar un falso positivo). Además,
 * el servidor rechaza marcas imposibles (firestore.rules, validEntry).
 */
G.Guard = (() => {
  let run = null;       // { t0, flags, prev, checkT, coop }

  function start(coop = false) {
    run = { t0: performance.now(), flags: new Set(), prev: null, checkT: 1, coop };
  }

  function flag(why) {
    if (!run || run.flags.has(why)) return;
    run.flags.add(why);
    console.warn('[PokéSurvivor] partida no válida para el ranking:', why);
  }

  /** Una vez por segundo de juego. */
  function tick(dt, time, p) {
    if (!run || !p) return;
    run.checkT -= dt;
    if (run.checkT > 0) return;
    run.checkT = 1;
    const real = (performance.now() - run.t0) / 1000;
    if (time > real + 5) flag('reloj');
    // Topes con margen sobre lo máximo que se puede juntar jugando (mejoras de
    // tienda, cartas con su tope, objeto, altar y potenciadores). Antes eran
    // fijos (ataque 60, velocidad 700, vida 6.000) y las runs de más de una
    // hora, con muchas cartas, los pasaban sin hacer trampas.
    //   ataque     1,4 tienda × 1,1^40 cartas × 1,4 objeto × 2 altar ≈ 177
    //   velocidad  1,24 tienda × 1,07^8 cartas × 1,35 objeto × 1,45 altar ≈ 4,2
    //   vida       ~265 de base y tienda + 20 por nivel (Vigor)
    const buff = b => b.n * b.amount;
    if (!isFinite(p.hp) || p.hp > p.maxHp + 1 || p.maxHp > 400 + 20 * p.level) flag('vida');
    if (p.spdMul > 5 || p.baseSpd > 200 || buff(p.buffs.spd) > 4) flag('velocidad');
    if (p.atkMul > 200 || p.baseAtk > 2 || buff(p.buffs.atk) > 4) flag('ataque');
    //   experiencia  1,4 tienda × 1,12^8 cartas × 1,3 Huevo Suerte ≈ 4,5
    //   recarga      0,76 tienda × 0,92^10 cartas × 0,8 objeto × 0,6 altar ≈ 0,16
    //   imán         78 × 1,72 tienda × 1,3^6 cartas × 4 altar ≈ 2.600
    //   monedas      1,64 tienda × 1,5 Moneda Amuleto ≈ 2,5
    if (p.xpMul > 5) flag('experiencia');
    if (p.cdMul < 0.14) flag('recarga');
    if (p.magnet > 3000) flag('imán');
    if (p.coinMul > 3) flag('monedas');
    if (p.level > 10 + time / 4) flag('nivel');
    // En grupo los derrotados y las monedas los reparte el anfitrión: sólo en solitario.
    if (run.prev && !run.coop) {
      const d = Math.max(1, time - run.prev.time);
      if (p.kills - run.prev.kills > 50 + 60 * d) flag('derrotados');
      if (p.coins - run.prev.coins > 200 + 400 * d) flag('monedas');
    }
    run.prev = { time, kills: p.kills, coins: p.coins };
  }

  /** Al terminar: true si la partida es limpia. */
  function end() {
    const ok = !!run && run.flags.size === 0;
    run = null;
    return ok;
  }

  return { start, flag, tick, end, get flags() { return run ? [...run.flags] : []; } };
})();
