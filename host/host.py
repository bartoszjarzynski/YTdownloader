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

# Katalog, w ktorym lezy ten skrypt — obok niego instalator kladzie yt-dlp i ffmpeg.
HERE = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(HERE, "host.log")

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

    cmd = [
        *launcher,
        "--no-playlist",
        "--newline",
        "--no-color",
        "--no-part",
        "--restrict-filenames",
        # pobieranie kilku fragmentow rownolegle -> omija dlawienie YouTube
        "--concurrent-fragments", "5",
        # limit jakosci do 720p: mniejszy plik = szybsze pobieranie (wystarcza do karaoke)
        "-f", "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/"
              "bv*[height<=720]+ba/b[height<=720]/b",
        "--merge-output-format", "mp4",
        "-o", out_tmpl,
        "--print", "after_move:filepath",
    ]
    if ffmpeg:
        cmd += ["--ffmpeg-location", os.path.dirname(ffmpeg)]
    cmd.append(url)

    log(f"Komenda: {' '.join(cmd)}")

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=1,
            text=True,
            encoding="utf-8",
            errors="replace",
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
