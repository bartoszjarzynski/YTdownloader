// popup.js — przycisk w okienku rozszerzenia wywoluje pobieranie z aktywnej karty.
document.getElementById("dl").addEventListener("click", async () => {
  const status = document.getElementById("status");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/youtube\.com\/watch/.test(tab.url || "")) {
    status.textContent = "Otworz najpierw strone filmu na YouTube.";
    return;
  }
  chrome.tabs.sendMessage(tab.id, { type: "trigger" }, () => {
    if (chrome.runtime.lastError) {
      status.textContent = "Odswiez strone YouTube i sprobuj ponownie.";
    } else {
      status.textContent = "Pobieram… postep widoczny na stronie filmu.";
      setTimeout(() => window.close(), 1200);
    }
  });
});
