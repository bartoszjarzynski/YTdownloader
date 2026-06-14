#!/bin/bash
# ============================================================================
#  Instalator "Pobieracza MP4 dla Taty" (macOS)
#  Mozna uruchomic dwuklikiem w Finderze albo komenda:  bash install-mac.command
# ============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$HOME/Library/Application Support/TataYTDownloader"
HOST_PY="$INSTALL_DIR/host.py"
EXT_ID="dnopdapdomlpnmimalcbdhajjeindhhe"
HOST_NAME="com.tata.ytdownloader"

say()  { printf "\n\033[1;36m%s\033[0m\n" "$1"; }
ok()   { printf "  \033[1;32m✓\033[0m %s\n" "$1"; }
warn() { printf "  \033[1;33m!\033[0m %s\n" "$1"; }

say "Instaluje Pobieracza MP4 dla Taty…"

# --- python3 (yt-dlp wymaga wersji 3.10+) ---
PY310=""
for cand in python3.14 python3.13 python3.12 python3.11 python3.10 python3 \
            /opt/homebrew/bin/python3 /usr/local/bin/python3; do
  P="$(command -v "$cand" 2>/dev/null || true)"
  [ -z "$P" ] && [ -x "$cand" ] && P="$cand"
  if [ -n "$P" ] && "$P" -c 'import sys;exit(0 if sys.version_info>=(3,10) else 1)' 2>/dev/null; then
    PY310="$P"; break
  fi
done

if [ -z "$PY310" ]; then
  warn "Nie znaleziono Pythona 3.10 lub nowszego (yt-dlp tego wymaga)."
  warn "Zainstaluj Pythona, np.:  brew install python   albo z https://www.python.org/downloads/"
  warn "Potem uruchom ten instalator ponownie."
  exit 1
fi
ok "Python znaleziony: $PY310 ($("$PY310" --version 2>&1))"

mkdir -p "$INSTALL_DIR"
cp "$SCRIPT_DIR/host/host.py" "$HOST_PY"
chmod +x "$HOST_PY"
# zapisz sciezke do Pythona, by pomocnik uruchamiany przez Chrome ja znalazl
printf '{\n  "python": "%s"\n}\n' "$PY310" > "$INSTALL_DIR/config.json"
ok "Pomocnik skopiowany do: $INSTALL_DIR"

# --- yt-dlp ---
# Uwaga: pobieramy lekka wersje w czystym Pythonie (zipapp), NIE "yt-dlp_macos".
# Paczka "yt-dlp_macos" zawiera niepodpisana Python.framework, ktora macOS
# blokuje, gdy yt-dlp uruchamia Chrome ("library load disallowed by system policy").
say "Pobieram yt-dlp…"
if [ -f "$INSTALL_DIR/yt-dlp" ]; then
  ok "yt-dlp juz jest"
else
  curl -L --fail -o "$INSTALL_DIR/yt-dlp" \
    "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"
  chmod +x "$INSTALL_DIR/yt-dlp"
  ok "yt-dlp zainstalowany"
fi

# --- ffmpeg (potrzebny do polaczenia obrazu i dzwieku w MP4) ---
say "Pobieram ffmpeg…"
if [ -f "$INSTALL_DIR/ffmpeg" ]; then
  ok "ffmpeg juz jest"
else
  ARCH="$(uname -m)"
  if [ "$ARCH" = "arm64" ]; then
    FF_URL="https://ffmpeg.martin-riedl.de/redirect/latest/macos/arm64/release/ffmpeg.zip"
  else
    FF_URL="https://ffmpeg.martin-riedl.de/redirect/latest/macos/amd64/release/ffmpeg.zip"
  fi
  TMP="$(mktemp -d)"
  if curl -L --fail -o "$TMP/ffmpeg.zip" "$FF_URL"; then
    unzip -o -q "$TMP/ffmpeg.zip" -d "$TMP"
    FOUND="$(find "$TMP" -name ffmpeg -type f | head -n1)"
    if [ -n "$FOUND" ]; then
      cp "$FOUND" "$INSTALL_DIR/ffmpeg"
      chmod +x "$INSTALL_DIR/ffmpeg"
      ok "ffmpeg zainstalowany"
    fi
  fi
  rm -rf "$TMP"
  if [ ! -f "$INSTALL_DIR/ffmpeg" ]; then
    if command -v ffmpeg >/dev/null 2>&1; then
      cp "$(command -v ffmpeg)" "$INSTALL_DIR/ffmpeg"
      ok "ffmpeg skopiowany z systemu"
    else
      warn "Nie udalo sie pobrac ffmpeg automatycznie."
      warn "Zainstaluj go (np. 'brew install ffmpeg') i uruchom instalator ponownie."
    fi
  fi
fi

# --- usun kwarantanne Gatekeepera z pobranych binariow ---
xattr -dr com.apple.quarantine "$INSTALL_DIR" 2>/dev/null || true

# --- rejestracja pomocnika w przegladarkach (Native Messaging) ---
say "Rejestruje pomocnika w przegladarkach…"
MANIFEST_JSON=$(cat <<EOF
{
  "name": "$HOST_NAME",
  "description": "Pomocnik Pobieracza MP4 dla Taty",
  "path": "$HOST_PY",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXT_ID/"
  ]
}
EOF
)

APPSUP="$HOME/Library/Application Support"
TARGETS=(
  "$APPSUP/Google/Chrome"
  "$APPSUP/Google/Chrome Beta"
  "$APPSUP/Google/Chrome Canary"
  "$APPSUP/Chromium"
  "$APPSUP/BraveSoftware/Brave-Browser"
  "$APPSUP/Microsoft Edge"
)
INSTALLED_ANY=0
for base in "${TARGETS[@]}"; do
  if [ -d "$base" ]; then
    mkdir -p "$base/NativeMessagingHosts"
    printf "%s\n" "$MANIFEST_JSON" > "$base/NativeMessagingHosts/$HOST_NAME.json"
    ok "Zarejestrowano w: $(basename "$base")"
    INSTALLED_ANY=1
  fi
done
if [ "$INSTALLED_ANY" -eq 0 ]; then
  warn "Nie znaleziono zadnej przegladarki Chrome/Brave/Edge. Zainstaluj Chrome i uruchom ponownie."
fi

say "Gotowe! ✅"
cat <<EOF

Pozostal JEDEN raz do zrobienia recznie — wczytanie rozszerzenia w Chrome:

  1. Otworz w Chrome adres:   chrome://extensions
  2. Wlacz (prawy gorny rog):  Tryb dewelopera
  3. Kliknij:                  Wczytaj rozpakowane
  4. Wskaz folder:             $SCRIPT_DIR/extension

Potem na kazdej stronie filmu YouTube pojawi sie przycisk ⬇ na pasku
odtwarzacza. Jedno klikniecie = plik MP4 w folderze Pobrane.

EOF
