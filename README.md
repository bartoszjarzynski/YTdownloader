# Pobieracz MP4 dla Taty 🎤⬇️

Rozszerzenie do Google Chrome, dzięki któremu **jednym kliknięciem** pobierzesz
film z YouTube jako plik **MP4** prosto do folderu **Pobrane**. Stworzone z myślą
o karaoke dla taty — koniec z podejrzanymi „konwerterami online”.

Na stronie każdego filmu YouTube pojawia się przycisk ⬇ na pasku odtwarzacza.
Klik → na dole ekranu widać pasek postępu → gotowy plik MP4 ląduje w Pobranych.

---

## Jak to działa (w skrócie)

Samo rozszerzenie przeglądarki **nie potrafi** pobrać filmu z YouTube — YouTube
dzieli obraz i dźwięk na osobne, zaszyfrowane strumienie. Dlatego zestaw składa
się z dwóch części:

1. **Rozszerzenie Chrome** — przycisk na stronie YouTube.
2. **Mały pomocnik na komputerze** — używa sprawdzonych, otwartoźródłowych
   narzędzi [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) + `ffmpeg`, które
   wykonują właściwe pobranie i sklejają gotowy plik MP4.

Chrome uruchamia pomocnika automatycznie po kliknięciu (mechanizm *Native
Messaging*) — **nie ma żadnego serwera w tle ani okna terminala**. Instalator
ustawia wszystko raz; potem tata po prostu klika.

---

## Instalacja na macOS

> Wymaga **Pythona 3.10+** (yt-dlp tego wymaga; systemowy Python 3.9 z macOS jest
> za stary). Jeśli go nie masz: `brew install python` lub https://www.python.org/downloads/.
> Instalator sam wykryje właściwą wersję i zapamięta jej ścieżkę.

1. Pobierz/skopiuj cały folder `yt-downloader` na komputer taty.
2. W Finderze wejdź do folderu i **kliknij dwukrotnie** `install-mac.command`.
   - Gdyby macOS zablokował uruchomienie: kliknij plik **prawym przyciskiem →
     Otwórz → Otwórz**. Albo w Terminalu: `bash install-mac.command`.
   - Instalator pobierze `yt-dlp` i `ffmpeg` i zarejestruje pomocnika.
3. Wczytaj rozszerzenie w Chrome (jednorazowo):
   - Otwórz `chrome://extensions`
   - Włącz **Tryb dewelopera** (prawy górny róg)
   - Kliknij **Wczytaj rozpakowane** i wskaż folder `yt-downloader/extension`

Gotowe. Wejdź na dowolny film na YouTube — na pasku odtwarzacza jest przycisk ⬇.

## Instalacja na Windows

1. Skopiuj cały folder `yt-downloader` na komputer.
2. Upewnij się, że jest zainstalowany **Python** (https://www.python.org/downloads/,
   przy instalacji zaznacz „Add Python to PATH”).
3. Kliknij `install-windows.ps1` prawym przyciskiem → **Uruchom za pomocą programu
   PowerShell**. Jeśli system zablokuje skrypt, otwórz PowerShell i wpisz:
   ```powershell
   powershell -ExecutionPolicy Bypass -File install-windows.ps1
   ```
4. Wczytaj rozszerzenie w Chrome — kroki identyczne jak na macOS powyżej
   (folder `yt-downloader\extension`).

---

## Korzystanie

- **Z paska odtwarzacza:** na stronie filmu kliknij przycisk ⬇ (obok ustawień
  jakości). Pasek postępu pojawi się w prawym dolnym rogu.
- **Z ikony rozszerzenia:** kliknij czerwoną ikonę przy pasku adresu i przycisk
  „⬇ Pobierz film z tej karty”.

Pliki zapisują się w folderze **Pobrane** (`~/Downloads`), nazwa = tytuł filmu.

### Jakość i szybkość

Domyślnie film pobiera się w jakości **maks. 720p** — to świadomy wybór: plik
jest kilkukrotnie mniejszy niż 4K, więc pobieranie jest dużo szybsze, a obraz w
zupełności wystarcza do karaoke na telewizorze czy laptopie. Dodatkowo yt-dlp
pobiera kilka fragmentów równolegle (`--concurrent-fragments`), co pomaga, gdy
YouTube dławi pojedyncze połączenie.

Aby zmienić limit jakości, w pliku `host.py` (sekcja budowania `cmd`) edytuj
fragment `height<=720` — np. `height<=1080` dla Full HD albo usuń warunki
wysokości, by pobierać najwyższą dostępną jakość.

---

## Rozwiązywanie problemów

- **„Nie znaleziono pomocnika”** — instalator nie został uruchomiony albo
  rozszerzenie ma inny identyfikator. Uruchom ponownie instalator. Identyfikator
  rozszerzenia musi być `dnopdapdomlpnmimalcbdhajjeindhhe` (jest „przyklejony” na
  stałe dzięki polu `key` w `manifest.json`, więc powinien się zgadzać).
- **Pobieranie się nie kończy / błąd** — zajrzyj do logu pomocnika:
  - macOS: `~/Library/Application Support/TataYTDownloader/host.log`
  - Windows: `%LOCALAPPDATA%\TataYTDownloader\host.log`
- **yt-dlp przestał działać po aktualizacji YouTube** — wystarczy zaktualizować
  samo narzędzie. macOS:
  `~/Library/Application\ Support/TataYTDownloader/yt-dlp -U`
  Windows: `%LOCALAPPDATA%\TataYTDownloader\yt-dlp.exe -U`
- **Brak ffmpeg** — instalator próbuje go pobrać automatycznie. Jeśli się nie
  uda, na macOS zainstaluj `brew install ffmpeg`, na Windows pobierz ffmpeg i
  wrzuć `ffmpeg.exe` do folderu instalacyjnego.
- **„Python.framework is damaged" / „library load disallowed"** (macOS) — to był
  błąd starej wersji, która używała paczki `yt-dlp_macos` z wbudowaną, niepodpisaną
  biblioteką Pythona blokowaną przez Gatekeeper. Teraz używamy lekkiego yt-dlp w
  czystym Pythonie uruchamianego przez systemowy Python 3.10+, więc problem nie
  występuje. Jeśli widzisz ten błąd, uruchom instalator ponownie.
- **„Potrzebny Python 3.10+"** (macOS) — zainstaluj nowszego Pythona (patrz wyżej)
  i uruchom instalator ponownie, aby zapisał jego ścieżkę.

---

## Aktualizacja yt-dlp (warto co jakiś czas)

YouTube często coś zmienia; `yt-dlp` nadąża dzięki aktualizacjom. Komenda `-U`
(patrz wyżej) pobiera najnowszą wersję — zwykle to wszystko, czego trzeba, gdy
coś przestanie działać.

---

## Pliki w projekcie

```
yt-downloader/
├─ extension/                 # rozszerzenie Chrome (wczytywane „rozpakowane”)
│  ├─ manifest.json           # konfiguracja + stały identyfikator (pole "key")
│  ├─ content.js / .css       # przycisk na stronie YouTube + pasek postępu
│  ├─ background.js           # łączy z pomocnikiem (Native Messaging)
│  ├─ popup.html / popup.js   # okienko pod ikoną rozszerzenia
│  └─ icons/                  # ikony
├─ host/
│  ├─ host.py                 # pomocnik: uruchamia yt-dlp, raportuje postęp
│  ├─ com.tata.ytdownloader.json  # wzór manifestu Native Messaging
│  └─ gen_icons.py            # generator ikon (uruchamiany raz)
├─ install-mac.command        # instalator macOS
├─ install-windows.ps1        # instalator Windows
└─ README.md
```

---

## Uwaga prawna

Narzędzie przeznaczone do użytku osobistego (np. własne karaoke w domu).
Pobieranie materiałów z YouTube może naruszać Regulamin YouTube oraz prawa
autorskie — pobieraj wyłącznie treści, do których masz prawo (np. własne,
z licencją Creative Commons lub należące do domeny publicznej). Korzystasz na
własną odpowiedzialność.
