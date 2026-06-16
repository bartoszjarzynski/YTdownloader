# ============================================================================
#  Instalator "Pobieracza MP4 dla Taty" (Windows)
#  Uruchom: kliknij plik prawym przyciskiem -> "Uruchom za pomoca programu
#  PowerShell"  ALBO w PowerShell:
#     powershell -ExecutionPolicy Bypass -File install-windows.ps1
# ============================================================================
$ErrorActionPreference = "Stop"

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallDir  = Join-Path $env:LOCALAPPDATA "TataYTDownloader"
$HostPy      = Join-Path $InstallDir "host.py"
$HostBat     = Join-Path $InstallDir "run-host.bat"
$ManifestPath= Join-Path $InstallDir "com.tata.ytdownloader.json"
$ExtId       = "dnopdapdomlpnmimalcbdhajjeindhhe"
$HostName    = "com.tata.ytdownloader"

function Say($m){ Write-Host "`n$m" -ForegroundColor Cyan }
function Ok($m){ Write-Host "  [OK] $m" -ForegroundColor Green }
function Warn($m){ Write-Host "  [!] $m" -ForegroundColor Yellow }

Say "Instaluje Pobieracza MP4 dla Taty..."

# --- Python ---
$py = (Get-Command python -ErrorAction SilentlyContinue)
if (-not $py) { $py = (Get-Command py -ErrorAction SilentlyContinue) }
if (-not $py) {
  Warn "Brak Pythona. Zainstaluj go z https://www.python.org/downloads/ (zaznacz 'Add to PATH'),"
  Warn "a nastepnie uruchom instalator ponownie."
  Read-Host "Nacisnij Enter, aby zamknac"
  exit 1
}
Ok "Python znaleziony: $($py.Source)"

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item (Join-Path $ScriptDir "host\host.py") $HostPy -Force
Ok "Pomocnik skopiowany do: $InstallDir"

# wrapper .bat (Native Messaging na Windows wymaga pliku wykonywalnego)
"@echo off`r`n`"$($py.Source)`" `"$HostPy`" %*" | Set-Content -Encoding ASCII $HostBat
Ok "Utworzono wrapper run-host.bat"

# --- yt-dlp.exe ---
Say "Pobieram yt-dlp..."
$ytdlp = Join-Path $InstallDir "yt-dlp.exe"
if (Test-Path $ytdlp) { Ok "yt-dlp juz jest" }
else {
  Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile $ytdlp
  Ok "yt-dlp zainstalowany"
}

# --- ffmpeg.exe ---
Say "Pobieram ffmpeg..."
$ffmpeg = Join-Path $InstallDir "ffmpeg.exe"
if (Test-Path $ffmpeg) { Ok "ffmpeg juz jest" }
else {
  $tmp = Join-Path $env:TEMP "tata_ffmpeg.zip"
  Invoke-WebRequest -Uri "https://github.com/yt-dlp/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl.zip" -OutFile $tmp
  $ex = Join-Path $env:TEMP "tata_ffmpeg"
  if (Test-Path $ex) { Remove-Item -Recurse -Force $ex }
  Expand-Archive -Path $tmp -DestinationPath $ex -Force
  $found = Get-ChildItem -Path $ex -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1
  if ($found) { Copy-Item $found.FullName $ffmpeg -Force; Ok "ffmpeg zainstalowany" }
  else { Warn "Nie udalo sie wypakowac ffmpeg." }
  Remove-Item -Force $tmp -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $ex -ErrorAction SilentlyContinue
}

# --- Node.js (wymagany przez yt-dlp: rozwiazywanie podpisow + PO token) ---
# Kopiujemy CALA dystrybucje (z npm) - npm jest potrzebny do zbudowania
# providera PO tokenow ponizej.
Say "Sprawdzam Node.js..."
$nodeDir = Join-Path $InstallDir "node"
$nodeExe = Join-Path $nodeDir "node.exe"
if (Test-Path $nodeExe) { Ok "Node.js juz jest" }
else {
  $tmp = Join-Path $env:TEMP "tata_node.zip"
  $ex  = Join-Path $env:TEMP "tata_node"
  Invoke-WebRequest -Uri "https://nodejs.org/dist/v22.16.0/node-v22.16.0-win-x64.zip" -OutFile $tmp -UseBasicParsing
  if (Test-Path $ex) { Remove-Item -Recurse -Force $ex }
  Expand-Archive -Path $tmp -DestinationPath $ex -Force
  $inner = Get-ChildItem -Path $ex -Directory | Select-Object -First 1
  if ($inner) {
    New-Item -ItemType Directory -Force -Path $nodeDir | Out-Null
    Copy-Item (Join-Path $inner.FullName "*") $nodeDir -Recurse -Force
    Ok "Node.js zainstalowany"
  } else { Warn "Nie udalo sie wypakowac Node.js." }
  Remove-Item -Force $tmp -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $ex -ErrorAction SilentlyContinue
}

# --- Wtyczka bgutil (PO token) + provider ---
# YouTube wymaga "PO tokenow" do pobrania danych wideo (inaczej HTTP 403).
# Wtyczka bgutil generuje je lokalnie przez Node. yt-dlp.exe wczytuje wtyczki
# tylko z pliku .zip lezacego w katalogu przekazanym przez --plugin-dirs.
$BgVer = "1.3.1"
Say "Instaluje wtyczke PO token (bgutil $BgVer)..."
$plugDir = Join-Path $InstallDir "ytdlp-plugins"
$plugZip = Join-Path $plugDir "bgutil-pot.zip"
if (Test-Path $plugZip) { Ok "Wtyczka PO token juz jest" }
else {
  New-Item -ItemType Directory -Force -Path $plugDir | Out-Null
  Invoke-WebRequest -Uri "https://github.com/Brainicism/bgutil-ytdlp-pot-provider/releases/download/$BgVer/bgutil-ytdlp-pot-provider.zip" -OutFile $plugZip -UseBasicParsing
  Ok "Wtyczka PO token zainstalowana"
}

# Provider (skrypt generujacy token) - pobieramy zrodla i budujemy przez npm.
$provider = Join-Path $InstallDir "bgutil-provider"
# Pomocnik uruchamia serwer z build\main.js (tryb HTTP) — to nasz wyznacznik builda.
$potServer = Join-Path $provider "server\build\main.js"
if (Test-Path $potServer) { Ok "Provider PO token juz zbudowany" }
else {
  Say "Buduje provider PO token (chwile to potrwa)..."
  $tmp = Join-Path $env:TEMP "tata_bgutil.zip"
  $ex  = Join-Path $env:TEMP "tata_bgutil"
  Invoke-WebRequest -Uri "https://github.com/Brainicism/bgutil-ytdlp-pot-provider/archive/refs/tags/$BgVer.zip" -OutFile $tmp -UseBasicParsing
  if (Test-Path $ex) { Remove-Item -Recurse -Force $ex }
  Expand-Archive -Path $tmp -DestinationPath $ex -Force
  $root = Get-ChildItem -Path $ex -Directory | Select-Object -First 1
  if (Test-Path $provider) { Remove-Item -Recurse -Force $provider }
  Copy-Item $root.FullName $provider -Recurse -Force
  $server = Join-Path $provider "server"
  Push-Location $server
  $env:PATH = "$nodeDir;$env:PATH"
  & (Join-Path $nodeDir "npm.cmd") ci 2>&1 | Out-Null
  & (Join-Path $nodeDir "npx.cmd") tsc 2>&1 | Out-Null
  Pop-Location
  if (Test-Path $potServer) { Ok "Provider PO token zbudowany" }
  else { Warn "Nie udalo sie zbudowac providera PO token." }
  Remove-Item -Force $tmp -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $ex -ErrorAction SilentlyContinue
}

# --- manifest Native Messaging ---
Say "Rejestruje pomocnika w przegladarce..."
$manifest = @{
  name           = $HostName
  description    = "Pomocnik Pobieracza MP4 dla Taty"
  path           = $HostBat
  type           = "stdio"
  allowed_origins= @("chrome-extension://$ExtId/")
} | ConvertTo-Json -Depth 5
Set-Content -Path $ManifestPath -Value $manifest -Encoding ASCII

# wpisy w rejestrze dla Chrome / Edge / Brave
$regBases = @(
  "HKCU:\Software\Google\Chrome\NativeMessagingHosts",
  "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts",
  "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts"
)
foreach ($base in $regBases) {
  $key = Join-Path $base $HostName
  New-Item -Path $key -Force | Out-Null
  Set-ItemProperty -Path $key -Name "(default)" -Value $ManifestPath
}
Ok "Zarejestrowano w Chrome / Edge / Brave"

Say "Gotowe! [OK]"
@"

Pozostal JEDEN raz do zrobienia recznie - wczytanie rozszerzenia w Chrome:

  1. Otworz w Chrome adres:   chrome://extensions
  2. Wlacz (prawy gorny rog):  Tryb dewelopera (Developer mode)
  3. Kliknij:                  Wczytaj rozpakowane (Load unpacked)
  4. Wskaz folder:             $ScriptDir\extension

Potem na kazdej stronie filmu YouTube pojawi sie przycisk pobierania
na pasku odtwarzacza. Jedno klikniecie = plik MP4 w folderze Pobrane.

"@ | Write-Host
Read-Host "Nacisnij Enter, aby zamknac"
