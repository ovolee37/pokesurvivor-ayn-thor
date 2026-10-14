<#
  build-www.ps1 — copies the game files to www\ (for Capacitor) and syncs the
  Android project.

    powershell -ExecutionPolicy Bypass -File scripts\build-www.ps1
    powershell -ExecutionPolicy Bypass -File scripts\build-www.ps1 -Bundle   # rebuild js/app.min.js first
    powershell -ExecutionPolicy Bypass -File scripts\build-www.ps1 -NoSync   # copy only

  The game itself has no build step: index.html loads js/app.min.js, which
  tools/build.js generates from dev.html. So after changing the JS, use -Bundle.
#>
param([switch]$Bundle, [switch]$NoSync)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$www  = Join-Path $root 'www'
Set-Location $root

if ($Bundle) {
  Write-Host '> node tools/build.js'
  node tools/build.js
  if ($LASTEXITCODE -ne 0) { throw 'tools/build.js failed' }
}

# Folders that don't belong in the game (top level only).
$excludeDirs = @('.git', '.github', '.firebase', '.wrangler', '.claude', 'tools', 'docs', 'android', 'node_modules',
                 'scripts', 'www', 'functions', 'cloudflare', 'videos')
# Files that don't belong in the game. NOTE: js/core/firebase-config.js is
# loaded by the game and stays; only the Firebase project files are left out.
$excludeFiles = @('dev.html', 'firebase.json', '.firebaserc', 'database.rules.json', 'firestore.rules',
                  'firestore.indexes.json', 'package.json', 'package-lock.json', 'capacitor.config.json',
                  '.gitignore', '.nojekyll', 'CNAME', '*.md', '*.log', 'Thumbs.db', 'desktop.ini', '.DS_Store')

if (Test-Path $www) { Remove-Item $www -Recurse -Force }
New-Item -ItemType Directory -Path $www | Out-Null

# robocopy: /E recursive, /XD skip folders, /XF skip files.
$xd = $excludeDirs | ForEach-Object { Join-Path $root $_ }
robocopy $root $www /E /NFL /NDL /NJH /NP /XD @xd /XF @excludeFiles | Out-Null
# robocopy: 0–7 = success, 8 and up = error.
if ($LASTEXITCODE -ge 8) { throw "robocopy failed (code $LASTEXITCODE)" }
$global:LASTEXITCODE = 0

foreach ($need in @('index.html', 'js\app.min.js', 'js\core\firebase-config.js', 'css\style.css')) {
  if (-not (Test-Path (Join-Path $www $need))) { throw "www\$need is missing" }
}
# The app gets its own app.min.js without the obfuscation (faster, see scripts/app-bundle.js).
Write-Host '> node scripts/app-bundle.js'
node scripts/app-bundle.js
if ($LASTEXITCODE -ne 0) { throw 'scripts/app-bundle.js failed' }

$files = (Get-ChildItem $www -Recurse -File | Measure-Object -Property Length -Sum)
Write-Host ("www\ done: {0} files, {1:N1} MB" -f $files.Count, ($files.Sum / 1MB))

if (-not $NoSync) {
  Write-Host '> npx cap sync android'
  npx cap sync android
  if ($LASTEXITCODE -ne 0) { throw 'npx cap sync android failed' }
}
