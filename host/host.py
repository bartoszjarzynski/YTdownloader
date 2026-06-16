#!/usr/bin/env python3
"""
host.py — lokalny pomocnik "Pobieracza MP4 dla Taty".

Chrome uruchamia ten skrypt automatycznie po kluknieciu przycisku w rozszerzeniu
(mechanizm Native Messaging). Skrypt odbiera adres filmu, pobiera go przez yt-dlp
jako plik MP4 do folderu Pobrane i odsyla do rozszerzenia postep pobierania.

Protokol: kazda wiadomosc poprzedzona jest 4 bajtami dlugosci (kolejnosc bajtow
natywna), nastepnie tresc JSON zakodowana w UTF-8.
"""

import json
import os
import re
import struct
import subprocess
import sys
import time
import urllib.request

# Katalog, w ktorym lezy ten skrypt — obok niego instalator kladzie yt-dlp i ffmpeg.
HERE = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(HERE, "host.log")

# Lokalny serwer bgutil generujacy PO tokeny (omija blokade 403 YouTube).
POT_SERVER_URL = "http://127.0.0.1:4416"

IS_WINDOWS = sys.platform.startswith("win")
# Na macOS/Linux uzywamy lekkiej wersji yt-dlp w czystym Pythonie (zipapp),
# uruchamianej przez ten sam interpreter co pomocnik. Dzieki temu unikamy
# wbudowanej, niepodpisanej Python.framework z paczki "yt-dlp_macos", ktora
# macOS (Gatekeeper) blokuje przy uruchomieniu przez Chrome.
YTDLP_NAMES = ["yt-dlp.exe", "yt-dlp"] if IS_WINDOWS else ["yt-dlp"]
FFMPEG_NAME = "ffmpeg.exe" if IS_WINDOWS else "ffmpeg"


def log(msg):
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')}  {msg}\n")
    except Exception:
        pass


# --- Komunikacja z Chrome (Native Messaging) ---

def read_message():
    raw_len = sys.stdin.buffer.read(4)
    if len(raw_len) < 4:
        return None
    msg_len = struct.unpack("@I", raw_len)[0]
    data = sys.stdin.buffer.read(msg_len).decode("utf-8")
    return json.loads(data)


def send_message(obj):
    data = json.dumps(obj).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("@I", len(data)))
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()


# --- Lokalizowanie narzedzi ---

def find_tool(names):
    if isinstance(names, str):
        names = [names]
    # 1) obok skryptu (tak instaluje instalator)
    for n in names:
        p = os.path.join(HERE, n)
        if os.path.exists(p):
            return p
    # 2) w systemowym PATH
    from shutil import which
    for n in names:
        p = which(n)
        if p:
            return p
    return None


def downloads_dir():
    d = os.path.join(os.path.expanduser("~"), "Downloads")
    return d if os.path.isdir(d) else os.path.expanduser("~")


def _python_ok(path):
    """Czy dany interpreter to Python >= 3.10 (wymagany przez yt-dlp)?"""
    try:
        r = subprocess.run(
            [path, "-c", "import sys;print(1 if sys.version_info>=(3,10) else 0)"],
            capture_output=True, text=True, timeout=10,
        )
        return r.stdout.strip() == "1"
    except Exception:
        return False


def find_python():
    """Znajduje interpreter Pythona >= 3.10 do uruchomienia yt-dlp.

    Chrome uruchamia pomocnika z ubogim PATH, w ktorym 'python3' to czesto
    systemowy Python 3.9 (za stary). Dlatego szukamy nowszego po absolutnych
    sciezkach, a instalator dodatkowo zapisuje wykryta sciezke do config.json.
    """
    import glob
    from shutil import which

    candidates = []
    cfg = os.path.join(HERE, "config.json")
    if os.path.exists(cfg):
        try:
            with open(cfg, encoding="utf-8") as f:
                p = json.load(f).get("python")
            if p:
                candidates.append(p)
        except Exception:
            pass
    candidates.append(sys.executable)
    for n in ("python3.14", "python3.13", "python3.12", "python3.11", "python3.10", "python3"):
        w = which(n)
        if w:
            candidates.append(w)
    candidates += ["/opt/homebrew/bin/python3", "/usr/local/bin/python3"]
    candidates += sorted(
        glob.glob("/Library/Frameworks/Python.framework/Versions/3.*/bin/python3"), reverse=True)
    candidates += sorted(glob.glob("/opt/homebrew/bin/python3.1*"), reverse=True)
    candidates += sorted(glob.glob("/usr/local/bin/python3.1*"), reverse=True)

    seen = set()
    for c in candidates:
        if c and c not in seen:
            seen.add(c)
            if _python_ok(c):
                return c
    return None


# --- Serwer PO token (bgutil) ---

def pot_server_alive():
    """Czy lokalny serwer bgutil odpowiada na /ping?"""
    try:
        with urllib.request.urlopen(POT_SERVER_URL + "/ping", timeout=3) as r:
            return r.status == 200
    except Exception:
        return False


def ensure_pot_server(node_exe):
    """Uruchamia serwer bgutil (PO token) w tle, jesli jeszcze nie dziala.

    Tryb serwera jest duzo pewniejszy niz tryb "script": serwer startuje raz i
    zostaje "cieply", wiec kolejne pobrania nie placa za zimny start Node (ktory
    na wolniejszych komputerach potrafil przekroczyc sztywny limit 15 s wtyczki).
    Pierwszy start moze potrwac (skan antywirusa), wiec czekamy nawet ~60 s.
    """
    server_dir = os.path.join(HERE, "bgutil-provider", "server")
    main_js = os.path.join(server_dir, "build", "main.js")
    if not (node_exe and os.path.exists(node_exe) and os.path.exists(main_js)):
        return False
    if pot_server_alive():
        return True

    log("Uruchamiam serwer PO token (bgutil)...")
    env = os.environ.copy()
    env["PATH"] = os.path.dirname(node_exe) + os.pathsep + env.get("PATH", "")
    popen_kwargs = dict(
        cwd=server_dir,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env=env,
    )
    if IS_WINDOWS:
        # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW —
        # serwer ma przezyc zakonczenie pomocnika i nie pokazywac okna konsoli.
        popen_kwargs["creationflags"] = 0x00000008 | 0x00000200 | 0x08000000
    else:
        popen_kwargs["start_new_session"] = True
    try:
        subprocess.Popen([node_exe, main_js], **popen_kwargs)
    except Exception as e:
        log(f"Nie udalo sie uruchomic serwera PO token: {e}")
        return False

    for _ in range(60):
        if pot_server_alive():
            log("Serwer PO token gotowy.")
            return True
        time.sleep(1)
    log("Serwer PO token nie wstal w 60 s — probuje pobierac mimo to.")
    return False


# --- Pobieranie ---

def download(url):
    ytdlp = find_tool(YTDLP_NAMES)
    if not ytdlp:
        send_message({"status": "error", "message": "Nie znaleziono yt-dlp. Uruchom instalator."})
        return

    ffmpeg = find_tool(FFMPEG_NAME)
    out_tmpl = os.path.join(downloads_dir(), "%(title).150s.%(ext)s")

    # Windows: yt-dlp.exe uruchamiamy bezposrednio.
    # macOS/Linux: yt-dlp to zipapp Pythona -> uruchamiamy przez Python >= 3.10.
    if ytdlp.lower().endswith(".exe"):
        launcher = [ytdlp]
    else:
        py = find_python()
        if not py:
            send_message({"status": "error",
                          "message": "Potrzebny Python 3.10+ (yt-dlp). Zainstaluj go i uruchom instalator ponownie."})
            return
        launcher = [py, ytdlp]

    # Szukaj node.exe (wymagany od yt-dlp 2026.x do rozwiazywania podpisow
    # YouTube oraz do generowania PO tokenow przez wtyczke bgutil).
    node_exe = os.path.join(HERE, "node", "node.exe")
    if not os.path.exists(node_exe):
        from shutil import which
        node_exe = which("node") or ""

    # Wtyczka bgutil (PO token) spakowana w .zip — yt-dlp.exe wczytuje wtyczki
    # tylko z pliku .zip lezacego w katalogu wskazanym przez --plugin-dirs.
    plugin_dir = os.path.join(HERE, "ytdlp-plugins")

    # Wystartuj lokalny serwer PO token (tryb HTTP). Robimy to przez serwer, a nie
    # przez tryb "script", bo script odpala zimny proces Node przy kazdym pobraniu
    # i na wolniejszych komputerach przekraczal sztywny limit 15 s wtyczki (timeout).
    ensure_pot_server(node_exe)

    cmd = [
        *launcher,
        "--no-playlist",
        "--newline",
        "--no-color",
        "--no-part",
        "--restrict-filenames",
        # YouTube blokuje (403) zakresy IPv6 wielu dostawcow -> wymus IPv4
        "--force-ipv4",
        # pobieranie kilku fragmentow rownolegle -> omija dlawienie YouTube
        "--concurrent-fragments", "5",
        # klient web_safari: jego formaty dostaja PO token (omija 403)
        "--extractor-args", "youtube:player_client=web_safari",
        # limit jakosci do 720p: mniejszy plik = szybsze pobieranie (wystarcza do karaoke)
        "-f", "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/"
              "bv*[height<=720]+ba/b[height<=720]/b",
        "--merge-output-format", "mp4",
        "-o", out_tmpl,
        "--print", "after_move:filepath",
    ]
    if node_exe and os.path.exists(node_exe):
        cmd += ["--js-runtimes", f"node:{node_exe}"]
        log(f"Uzywam Node.js: {node_exe}")
    if os.path.isdir(plugin_dir):
        # Wtyczka bgutil sama wykryje serwer na http://127.0.0.1:4416 (tryb HTTP).
        cmd += ["--plugin-dirs", plugin_dir]
    if ffmpeg:
        cmd += ["--ffmpeg-location", os.path.dirname(ffmpeg)]
    cmd.append(url)

    log(f"Komenda: {' '.join(cmd)}")

    # Provider PO tokenu uruchamia "node" — upewnij sie, ze nasz Node jest w PATH
    # (Chrome startuje pomocnika z ubogim PATH, w ktorym moze go nie byc).
    env = os.environ.copy()
    if node_exe and os.path.exists(node_exe):
        env["PATH"] = os.path.dirname(node_exe) + os.pathsep + env.get("PATH", "")

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=1,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=env,
        )
    except Exception as e:
        send_message({"status": "error", "message": f"Nie udalo sie uruchomic yt-dlp: {e}"})
        return

    pct_re = re.compile(r"\[download\]\s+(\d{1,3}(?:\.\d)?)%")
    last_pct = -1
    final_path = None

    for line in proc.stdout:
        line = line.rstrip("\n")
        log(line)
        m = pct_re.search(line)
        if m:
            pct = int(float(m.group(1)))
            if pct != last_pct:
                last_pct = pct
                send_message({"status": "progress", "percent": pct})
            continue
        if "[Merger]" in line or "Merging formats" in line or "[ExtractAudio]" in line:
            send_message({"status": "merging"})
            continue
        # yt-dlp wypisuje sciezke gotowego pliku (--print after_move:filepath)
        if line and os.path.isabs(line) and line.lower().endswith(".mp4"):
            final_path = line

    proc.wait()

    if proc.returncode == 0:
        name = os.path.basename(final_path) if final_path else "plik MP4"
        send_message({"status": "done", "file": name})
    else:
        send_message({"status": "error", "message": f"yt-dlp zakonczyl sie kodem {proc.returncode}. Szczegoly w host.log."})


def main():
    log("Pomocnik uruchomiony.")
    while True:
        try:
            msg = read_message()
        except Exception as e:
            log(f"Blad odczytu wiadomosci: {e}")
            break
        if msg is None:
            break
        url = msg.get("url")
        log(f"Otrzymano zadanie: {url}")
        if url:
            try:
                download(url)
            except Exception as e:
                log(f"Wyjatek podczas pobierania: {e}")
                send_message({"status": "error", "message": str(e)})
    log("Pomocnik zakonczony.")


if __name__ == "__main__":
    main()
