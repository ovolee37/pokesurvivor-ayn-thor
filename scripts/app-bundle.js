/* app-bundle.js — rebuilds www/js/app.min.js for the Android app WITHOUT the
 * obfuscation step of tools/build.js.
 *
 *   node scripts/app-bundle.js            (called by build-www.ps1)
 *
 * Same scripts, same order and same closure wrapper as tools/build.js, only
 * minified with terser. javascript-obfuscator (string array, self-defending)
 * makes the code slower and caused short stutters on the AYN Thor.
 *
 * www/index.html and www/en/index.html keep the ?v= hash of the published
 * app.min.js: js/core/updater.js compares it with version.json, so changing
 * it would make the app think there is a new version and reload.
 */
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'www', 'js', 'app.min.js');
const BEGIN = '<!-- scripts:begin -->', END = '<!-- scripts:end -->';

const dev = fs.readFileSync(path.join(ROOT, 'dev.html'), 'utf8');
const i = dev.indexOf(BEGIN), j = dev.indexOf(END);
if (i < 0 || j < 0) throw new Error('dev.html has no ' + BEGIN + ' / ' + END + ' markers');
const files = [...dev.slice(i, j).matchAll(/<script[^>]*src="(js\/[^"]+\.js)"/g)].map(m => m[1]);

let joined = files.map(f => `/* ${f} */\n` + fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n');
const WIN_G = 'window.G = window.G || {};';
if (!joined.includes(WIN_G)) throw new Error('util.js no longer creates G as expected: check tools/build.js');
joined = '(() => {\n' + joined.replace(WIN_G, 'var G = {};') + '\n})();\n';

const tmp = path.join(ROOT, 'tools', 'cache', 'app-android.js');
fs.mkdirSync(path.dirname(tmp), { recursive: true });
fs.writeFileSync(tmp, joined);
const win = process.platform === 'win32';
execFileSync(win ? 'npx.cmd' : 'npx', ['--yes', 'terser@5', tmp, '--compress', 'passes=1', '--mangle',
  '--comments', 'false', '--ecma', '2020', '-o', OUT], { stdio: 'inherit', shell: win });
console.log(`www/js/app.min.js (not obfuscated): ${files.length} scripts, ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
