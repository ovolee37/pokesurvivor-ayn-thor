# PokéSurvivor for AYN Thor

**Android port of [PokéSurvivor](https://github.com/JPTER78/pokesurvivor) by
JPTER78, made for the AYN Thor handheld.**

PokéSurvivor is a Pokémon bullet-heaven in the style of Survivor.io and
Megabonk: sprites from *Pokémon Mystery Dungeon*, a roguelike layer,
966 Pokémon from all 9 generations, shinies and a gacha per region. This
repository wraps the same game in an Android app and adds full controller
support for the Thor. The game itself is free, and so is this app.

### Download

**[Latest release (APK)](https://github.com/ovolee37/pokesurvivor-ayn-thor/releases/latest)**:
download the APK on the Thor and open it. New versions install over the old
one and keep your save data.

### What the Android version adds

- **Controller support:** the left stick moves, A / B / X / Y pick moves 1–4,
  L1 / R1 cycle moves, Start pauses, Select opens the settings. In menus the
  D-pad or stick moves a focus frame, A confirms, B goes back.
- **Manual aiming with the right stick** (Settings > Controls > Aiming), based
  on the fork by [Iván Freire](https://github.com/IvanFreireDacoba/pokesurvivor).
- **L1 / R1 reroll** the level-up cards.
- **Back button** goes back in menus and pauses the game.
- **Sign in with Google** works inside the app (through Chrome), so your cloud
  save is the same as on the website.
- Kept up to date with the original game (see [Android build](#android-build)
  for what changed and how to build the APK yourself).

Tested on the AYN Thor (Android 13). Other Android devices should work too,
but are not tested.

*Free, non-profit fan project, not affiliated with Nintendo, Creatures,
GAME FREAK or The Pokémon Company.*

---

*Below is the original README by JPTER78 (in Spanish), with the Android build
notes added at the end.*

# PokéSurvivor · Mundo Misterioso

Bullet-heaven con Pokémon al estilo de Survivor.io y Megabonk, con sprites de
*Pokémon Mundo Misterioso*, capa roguelike, **966 Pokémon de las 9 generaciones**,
shinies y gacha por región. Música y efectos compuestos para el juego.

HTML + CSS + JavaScript vanilla sobre Canvas 2D. Sin build, sin dependencias y
**todo local**: no necesita internet para jugar.

> **Aviso sobre criptomonedas / Crypto disclaimer**
>
> PokéSurvivor **no tiene ninguna criptomoneda, token ni NFT oficial**, y yo no
> he creado ninguno. Cualquier token que use el nombre del juego lo han creado
> terceros. **No me hago cargo de ninguna compra, venta o inversión** que hagas
> con ellos y nada de lo que hay aquí es una recomendación de inversión. El
> juego es gratis y lo seguirá siendo.
>
> PokéSurvivor has **no official cryptocurrency, token or NFT**, and I have not
> created any. Any token using the game's name was created by third parties.
> **I take no responsibility for any purchase, sale or investment** you make
> with them, and nothing here is investment advice. The game is free and will
> stay free.

## Jugar

Doble clic en `index.html`. Crea una cuenta o entra como invitado, haz el test
de personalidad y a la mazmorra.

| Tecla | Acción |
|---|---|
| `W` `A` `S` `D` / flechas | Moverse |
| `1` `2` `3` `4` | Elegir el movimiento activo |
| `Q` / `E` | Ciclar movimientos |
| `Esc` / `P` | Pausa |

**En móvil o tablet** (en horizontal): pon el dedo en cualquier sitio y arrastra
para moverte (el joystick aparece donde tocas), toca un ataque de abajo para
cambiarlo y el botón de arriba a la derecha para pausar. Se puede instalar como
app ("Añadir a pantalla de inicio"). En **Ajustes** hay sonido, calidad gráfica
(con modo automático), números de daño, menos sacudidas, FPS y la cuenta.

El Pokémon ataca solo con el movimiento activo (o con todos los de un
**vínculo**: cada legendario vencido deja fusionar movimientos para lanzarlos a
la vez desde un solo hueco, hasta 4). Las rocas, cofres y la hierba
alta se rompen; las paredes y los árboles bloquean los disparos enemigos; el
agua frena y la lava quema (también a los enemigos).

En el mapa hay **altares de poder**, **manantiales** que curan, **cofres con
candado** (quédate a su lado unos segundos) y **trampas** que también dañan a
los enemigos. A veces se abre una **grieta**: entra y lucharás contra un
**legendario** en una arena aparte.

Hay **tabla de tipos** (un Rayo Burbuja le quita más a un Charmander) y,
de vez en cuando, **climas** (sol, lluvia, arena, nieve, niebla) que potencian
unos tipos y debilitan otros.

Cada día hay **misiones** (y semanales) que dan tickets y monedas; los
**logros** dan medallas y títulos, y tu **perfil** enseña tus 3 Pokémon
favoritos, tus marcas y tus medallas. En las runs encuentras **objetos** (Restos,
Cinta Elección...) y tus movimientos **evolucionan** al máximo nivel. Los
enemigos tienen personalidad: curan, ponen escudos, llaman a su manada o atacan
con aviso en el suelo.

Las **mejoras** son de cada Pokémon. El **gacha** va con **tickets** que se
ganan jugando (×1 de algunos Pokémon, ×10 de jefes y legendarios), y se tira
en una tragaperras pixel art.

Cada enemigo tiene 1/4096 de salir **shiny**: brilla, una flecha en el borde de
la pantalla te dice dónde está, y si lo derrotas te lo quedas. En el gacha sale
shiny 1 de cada 100 tiradas. En la colección eliges tu compañero en versión
normal o shiny.

La música suena tras el primer clic (los navegadores no dejan reproducir sonido
antes). Volumen y silencio: botón del altavoz arriba a la derecha, o en la pausa.

El guardado vive en el `localStorage` del navegador: si borras los datos del
sitio, se pierde.

En `videos/` hay grabaciones del juego (con su música): un combate contra un
jefe, la captura de un shiny salvaje y un shiny en el gacha.

## Guardado en la nube y publicación

- **Base de datos (Firebase):** cuentas con nombre + contraseña o Google, y la
  partida se sigue en cualquier ordenador. Pasos en [docs/FIREBASE.md](docs/FIREBASE.md).
  Sin configurar, el juego guarda sólo en el navegador, como antes.
- **Jugar con amigos (hasta 4) y ranking:** con cuenta en la nube, menú
  **Amigos** (añadir por apodo, invitar a tu sala) y **Ranking** (tiempo
  aguantado: solo o grupo, de hoy a histórico, amigos, por Pokémon).
- **Publicar gratis en GitHub Pages:** [docs/PUBLICAR.md](docs/PUBLICAR.md).
- Si se juega en dos ordenadores a la vez o sin conexión, las partidas se
  **fusionan**: las colecciones se unen (nunca se pierde un Pokémon ni un
  shiny), mejoras y estadísticas se quedan con el máximo, y monedas y
  compañero con la versión más reciente. Los cambios de otro ordenador llegan
  en directo.

## Licencia

Código bajo MIT. Los sprites (CC BY-NC 4.0), la fuente (OFL) y las marcas de
Pokémon tienen sus propias condiciones: ver [LICENSE](LICENSE) y
[CREDITS.md](CREDITS.md). Proyecto de fan sin ánimo de lucro.

## Estructura

```
index.html              pantallas + orden de carga
css/style.css           interfaz estilo Mundo Misterioso
assets/pokemon/{dex}/   hojas de sprites PMD (Idle, Walk, Attack, Shoot, Charge, Hurt, Faint)
assets/pokemon/{dex}/s/ las mismas en versión shiny
assets/fonts/           Pixelify Sans (OFL) y su versión con números redibujados (tools/make_font.py)
js/
  net/      social (apodo, amigos, salas), net (WebRTC + relé),
            coop (partida en grupo), ranking
  core/     util, db (guardado), audio (sintetizador + efectos), input,
            sprites (animador PMD), camera
  data/     pokedex*, sprites-meta*, moves, starters (+ test), enemies,
            upgrades, music (partituras)
  world/    tiles (pixel art en código), world (terreno, objetos, colisiones)
  entities/ player, enemy, projectile, pickup, fx
  systems/  combat, spawner, levelup, gacha
  ui/       icons (pixel art), ui, hud, login, test, menu, gacha-ui, run-ui,
            social-ui, ranking-ui
  game.js   flujo y bucle principal
tools/      scripts que regeneran los ficheros marcados con *
```

`*` = generado. Para rehacerlos (necesita Python 3 + Pillow e internet, sólo esa vez):

```
python tools/fetch_sprites.py    # sprites normal y shiny + js/data/sprites-meta.js
                                 # (~20 min; se puede cortar y relanzar: usa tools/cache/)
python tools/fetch_pokedex.py    # js/data/pokedex.js
python tools/fetch_credits.py    # CREDITS.md
```

## Notas de implementación

- **Sprites PMD.** Columnas = fotogramas, filas = 8 direcciones (Down, DownRight,
  Right, UpRight, Up, UpLeft, Left, DownLeft — verificado con los `-Offsets.png`).
  Cada animación tiene su propio tamaño de fotograma, así que se alinean por el
  **ancla al suelo** sacada del `-Shadow.png`; sin eso el sprite saltaría al atacar.
- **Coordenadas.** `(x, y)` de una entidad son sus **pies**. Las colisiones
  ocurren en el plano del suelo; los proyectiles vuelan en ese plano y se dibujan
  elevados con su sombra debajo.
- **Mundo.** Chunks de 16×16 tiles: los *datos* (terreno, objetos) son baratos y
  se generan siempre; la *imagen* se hornea a resolución de arte escribiendo en un
  `ImageData` (~4 ms por chunk en Chrome) y sólo para los visibles.
- **Rendimiento.** Rejilla espacial de enemigos reconstruida cada frame. Con 420
  enemigos, simulación + render completo ≈ 3 ms por frame en Chrome.
- **Metadatos en `.js`, no `.json`**, porque `fetch()` está bloqueado en `file://`.
- **Shiny.** Los shiny de SpriteCollab son el mismo dibujo con otra paleta; están
  en `s/` y sólo 30 tienen geometría distinta (campo `sa` en los metadatos).
  Las hojas se guardan como PNG con paleta exacta: misma imagen, la mitad de peso.
- **Audio.** Sintetizador Web Audio con planificador anticipado (programa las
  notas 150 ms por delante) y reverb por convolución con un impulso generado.
  Las partituras están en `js/data/music.js` en un formato de texto propio.
  Los efectos tienen separación mínima entre repeticiones y un tope de voces,
  para que 400 enemigos golpeados a la vez no saturen.
- **Iconos.** Mapas de caracteres convertidos a canvas y data URLs; siempre a
  múltiplos enteros de su tamaño para que el píxel quede limpio.

## Android build

The Android app (built for the AYN Thor, Android 13) is a
[Capacitor 7](https://capacitorjs.com/) wrapper around exactly the same files as
the web version. The game itself is unchanged.

**Requirements:** Node.js LTS, JDK 21, Android SDK (platform-tools,
platforms;android-35, build-tools 34+), `ANDROID_HOME` set.

```powershell
npm install                                                          # once: Capacitor
powershell -ExecutionPolicy Bypass -File scripts\build-www.ps1 -Bundle # build js/app.min.js, copy to www\, cap sync
cd android; .\gradlew.bat assembleDebug                              # debug APK
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

- `scripts/build-www.ps1` copies the game to `www/` (without `.git`, `.github`,
  `tools`, `docs`, `android`, `node_modules`, `scripts`, `functions`,
  `cloudflare`, the Firebase project files and `dev.html`) and runs
  `npx cap sync android`. `-Bundle` runs `node tools/build.js` first, `-NoSync`
  only copies. `js/core/firebase-config.js` stays in, the game needs it.
- Shortcuts: `npm run apk` (debug) or `npm run apk:release` (release).
- **Release APK** (`de.aynthor.pokesurvivor`, not debuggable, signed with its
  own key): `cd android; .\gradlew.bat assembleRelease` →
  `android\app\build\outputs\apk\release\app-release.apk`. The signature comes
  from `android/keystore.properties` and
  `android/keystore/pokesurvivor-release.jks`. Neither file is committed (see
  `android/.gitignore`); without them the release APK is unsigned. To sign your
  own build, create a keystore and a `keystore.properties` with `storeFile`,
  `storePassword`, `keyAlias` and `keyPassword`.
- The app is flagged as a game: `android:appCategory="game"`,
  `android:isGame="true"` and `android.intent.category.APP_GAME` in the
  launcher filter. Landscape (`sensorLandscape`), fullscreen, screen stays on.
- The Back and B buttons don't close the app. In menus they go back one level,
  in game they pause (`MainActivity.java` → event `ps-back` →
  `js/core/native.js`).
- No service worker is registered inside the app.
- "Sign in with Google": Google blocks sign-in inside WebViews, so the app opens
  Chrome with a login page served by a small local server
  (`http://localhost:<port>`, 127.0.0.1 only, with a one-time code;
  `GoogleLoginPlugin.java`, `res/raw/google_login.html`). The Google token goes
  back to the app and the game signs in with `signInWithCredential`
  (`js/core/native.js`, `js/core/db.js`). Requires `localhost` among the
  authorized domains of the Firebase project (the default).
- Controllers: see `js/core/gamepad.js` (mapping in `CONFIG`). Holding
  Select + Start for 2 s opens a debug overlay showing buttons and axes.
- Debugging: with the device connected, open `chrome://inspect` on the PC
  (debug APK only).

### Changes for the Android app

The first version of the APK is in a single commit:
[`a1675dc`](https://github.com/ovolee37/pokesurvivor-ayn-thor/commit/a1675dc52b6051213668de845433c81a3c247112).
It is based on [JPTER78/pokesurvivor](https://github.com/JPTER78/pokesurvivor)
at commit `f552173`.

- **New code:** `js/core/gamepad.js` (controller support), `js/core/native.js`
  (Back button, Google login bridge), `MainActivity.java`,
  `GoogleLoginPlugin.java`, `res/raw/google_login.html`,
  `scripts/build-www.ps1`.
- **Small changes to the game** (8 lines removed in total): `js/core/db.js`,
  `js/core/input.js`, `js/core/touch.js`, `js/main.js`, `index.html`,
  `en/index.html`, `dev.html`, `js/app.min.js` (rebuilt bundle).
- **Generated / boilerplate:** the Capacitor project in `android/` (Gradle
  files, icons, splash screens, example tests), `capacitor.config.json`,
  `package.json`, `package-lock.json`.

Later changes (app v1.2 to v1.4):

- **Upstream update:** merged [JPTER78/pokesurvivor](https://github.com/JPTER78/pokesurvivor)
  up to commit `65b35ef` (v1.2) and `511c65e` (v1.3: fixed move slots, iPhone touch fixes) and `a53d4e9`
  (v1.4: new Firebase project, co-op without the database relay).
- **Manual aiming with the right stick**, based on the fork by
  [Iván Freire (IvanFreireDacoba)](https://github.com/IvanFreireDacoba/pokesurvivor)
  (commit `2451db3`), ported to this controller code in
  [`5b6679e`](https://github.com/ovolee37/pokesurvivor-ayn-thor/commit/5b6679e).
  Choose it in Settings > Controls > Aiming (Automatic / Manual); in manual
  mode, directed attacks only fire while you aim.
- **L1 / R1** reroll the level-up cards.

## Créditos y licencia

Sprites de [SpriteCollab](https://github.com/PMDCollab/SpriteCollab) bajo
**CC BY-NC 4.0** — uso **no comercial** y con atribución; la lista de artistas
está en [`CREDITS.md`](CREDITS.md). Pokémon es propiedad de Nintendo, Creatures
Inc. y GAME FREAK. Proyecto de fan sin ánimo de lucro.
