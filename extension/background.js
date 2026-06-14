// background.js — laczy rozszerzenie z lokalnym pomocnikiem (native messaging).
// Pomocnik (yt-dlp) wykonuje faktyczne pobieranie i odsyla postep.

const HOST_NAME = "com.tata.ytdownloader";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "download") return;

  const tabId = sender.tab && sender.tab.id;
  const relay = (payload) => {
    if (tabId != null) chrome.tabs.sendMessage(tabId, { type: "progress", ...payload });
  };

  let port;
  try {
    port = chrome.runtime.connectNative(HOST_NAME);
  } catch (e) {
    relay({ status: "error", message: "Pomocnik nie jest zainstalowany." });
    sendResponse({ ok: false });
    return true;
  }

  port.onMessage.addListener((m) => relay(m));

  port.onDisconnect.addListener(() => {
    const err = chrome.runtime.lastError;
    if (err) {
      relay({
        status: "error",
        message:
          "Nie znaleziono pomocnika. Uruchom instalator (install-mac.command).",
      });
    }
  });

  relay({ status: "start" });
  port.postMessage({ url: msg.url, format: msg.format || "mp4" });
  sendResponse({ ok: true });
  return true;
});
