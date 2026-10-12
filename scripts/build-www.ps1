<#
  build-www.ps1 — kopiert die Spieldateien nach www\ (für Capacitor) und
  synchronisiert das Android-Projekt.

    powershell -ExecutionPolicy Bypass -File scripts\build-www.ps1
    powershell -ExecutionPolicy Bypass -File scripts\build-www.ps1 -Bundle   # vorher js/app.min.js neu bauen
    powershell -ExecutionPolicy Bypass -File scripts\build-www.ps1 -NoSync   # nur kopieren

  Das Spiel selbst hat keinen Build: index.html lädt js/app.min.js, das
  tools/build.js aus dev.html erzeugt. Nach Änderungen am JS also -Bundle.
#>
param([switch]$Bundle, [switch]$NoSync)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$www  = Join-Path $root 'www'
Set-Location $root

if ($Bundle) {
  Write-Host '> node tools/build.js'
  node tools/build.js
  if ($LASTEXITCODE -ne 0) { throw 'tools/build.js ist fehlgeschlagen' }
}

# Ordner, die nicht ins Spiel gehören (nur oberste Ebene).
$excludeDirs = @('.git', '.github', '.firebase', '.wrangler', '.claude', 'tools', 'docs', 'android', 'node_modules',
                 'scripts', 'www', 'functions', 'cloudflare', 'videos')
# Dateien, die nicht ins Spiel gehören. ACHTUNG: js/core/firebase-config.js wird
# vom Spiel geladen und bleibt drin; weg sind nur die Firebase-Projektdateien.
$excludeFiles = @('dev.html', 'firebase.json', '.firebaserc', 'database.rules.json', 'firestore.rules',
                  'firestore.indexes.json', 'package.json', 'package-lock.json', 'capacitor.config.json',
                  '.gitignore', '.nojekyll', 'CNAME', '*.md', '*.log', 'Thumbs.db', 'desktop.ini', '.DS_Store')

if (Test-Path $www) { Remove-Item $www -Recurse -Force }
New-Item -ItemType Directory -Path $www | Out-Null

# robocopy: /E rekursiv, /XD Ordner auslassen, /XF Dateien auslassen.
$xd = $excludeDirs | ForEach-Object { Join-Path $root $_ }
robocopy $root $www /E /NFL /NDL /NJH /NP /XD @xd /XF @excludeFiles | Out-Null
# robocopy: 0–7 = Erfolg, ab 8 = Fehler.
if ($LASTEXITCODE -ge 8) { throw "robocopy ist fehlgeschlagen (Code $LASTEXITCODE)" }
$global:LASTEXITCODE = 0

foreach ($need in @('index.html', 'js\app.min.js', 'js\core\firebase-config.js', 'css\style.css')) {
  if (-not (Test-Path (Join-Path $www $need))) { throw "www\$need fehlt" }
}
$files = (Get-ChildItem $www -Recurse -File | Measure-Object -Property Length -Sum)
Write-Host ("www\ fertig: {0} Dateien, {1:N1} MB" -f $files.Count, ($files.Sum / 1MB))

if (-not $NoSync) {
  Write-Host '> npx cap sync android'
  npx cap sync android
  if ($LASTEXITCODE -ne 0) { throw 'npx cap sync android ist fehlgeschlagen' }
}
