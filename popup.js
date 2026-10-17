"use strict";

const toggle = document.querySelector("#enabled");
const status = document.querySelector("#status");
const updateStatus = () => {
  status.textContent = toggle.checked
    ? "Enabled. Recommendations appear below the video."
    : "Disabled. YouTube’s usual layout is restored.";
};

chrome.storage.local.get({ enabled: true }).then((settings) => {
  toggle.checked = settings.enabled !== false;
  toggle.disabled = false;
  updateStatus();
}).catch(() => { status.textContent = "Could not read settings. Reopen this popup to retry."; });

toggle.addEventListener("change", async () => {
  toggle.disabled = true;
  try {
    await chrome.storage.local.set({ enabled: toggle.checked });
    updateStatus();
  } catch {
    toggle.checked = !toggle.checked;
    status.textContent = "Could not save. Please try again.";
  } finally {
    toggle.disabled = false;
  }
});
