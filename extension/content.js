// content.js — wstrzykuje przycisk "Pobierz MP4" do odtwarzacza YouTube
// oraz pokazuje pasek postepu pobierania.

const BTN_ID = "tata-yt-download-btn";

// Ikona strzalki w dol (SVG dopasowane do paska kontrolek YouTube).
const ICON_SVG = `
<svg height="100%" viewBox="0 0 36 36" width="100%" fill="#fff">
  <path d="M18 11v9m0 0l-4-4m4 4l4-4" stroke="#fff" stroke-width="2.4"
        stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M11 25h14" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
</svg>`;

function isWatchPage() {
  return location.pathname === "/watch" && location.search.includes("v=");
}

function cleanWatchUrl() {
  const u = new URL(location.href);
  const v = u.searchParams.get("v");
  if (!v) return location.href;
  return `https://www.youtube.com/watch?v=${v}`;
}

function makeButton() {
  const btn = document.createElement("button");
  btn.id = BTN_ID;
  btn.className = "ytp-button tata-yt-btn";
  btn.title = "Pobierz ten film jako MP4 do folderu Pobrane";
  btn.innerHTML = ICON_SVG;
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    startDownload();
  });
  return btn;
}

function ensureButton() {
  if (!isWatchPage()) {
    const old = document.getElementById(BTN_ID);
    if (old) old.remove();
    return;
  }
  if (document.getElementById(BTN_ID)) return;
  const controls = document.querySelector(".ytp-right-controls");
  if (!controls) return;
  controls.insertBefore(makeButton(), controls.firstChild);
}

// --- Pasek postepu / powiadomienia ---

let toastEl = null;
let toastTimer = null;

function showToast(text, kind = "info", percent = null) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "tata-yt-toast";
    document.body.appendChild(toastEl);
  }
  toastEl.className = `tata-toast tata-${kind}`;
  const bar = percent !== null
    ? `<div class="tata-bar"><div class="tata-bar-fill" style="width:${percent}%"></div></div>`
    : "";
  toastEl.innerHTML = `<div class="tata-toast-text">${text}</div>${bar}`;
  toastEl.style.display = "block";

  if (toastTimer) clearTimeout(toastTimer);
  if (kind === "done" || kind === "error") {
    toastTimer = setTimeout(() => { if (toastEl) toastEl.style.display = "none"; }, 6000);
  }
}

function startDownload() {
  const url = cleanWatchUrl();
  showToast("Rozpoczynam pobieranie…", "info", 0);
  chrome.runtime.sendMessage({ type: "download", url, format: "mp4" }, (resp) => {
    if (chrome.runtime.lastError) {
      showToast("Blad: nie udalo sie uruchomic pobierania.", "error");
    }
  });
}

// Komunikaty postepu z tla (background.js -> native host)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "trigger") {           // wywolanie z okienka rozszerzenia
    if (isWatchPage()) startDownload();
    return;
  }
  if (msg.type !== "progress") return;

  switch (msg.status) {
    case "start":
      showToast("Pobieram film…", "info", 0);
      break;
    case "progress":
      showToast(`Pobieram… ${msg.percent}%`, "info", msg.percent);
      break;
    case "merging":
      showToast("Lacze obraz i dzwiek…", "info", 100);
      break;
    case "done":
      showToast(`Gotowe! Zapisano w folderze Pobrane:<br><b>${msg.file || "plik MP4"}</b>`, "done");
      break;
    case "error":
      showToast(`Blad pobierania: ${msg.message || "nieznany blad"}`, "error");
      break;
  }
});

// YouTube to aplikacja jednostronicowa — przycisk trzeba wstawiac po nawigacji.
const observer = new MutationObserver(() => ensureButton());
observer.observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener("yt-navigate-finish", ensureButton);
window.addEventListener("load", ensureButton);
ensureButton();
setInterval(ensureButton, 2000);
