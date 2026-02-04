const apiKeyInput = document.getElementById("api-key");
const saveBtn = document.getElementById("save");
const clearBtn = document.getElementById("clear");
const statusEl = document.getElementById("status");

const loadKey = async () => {
  const result = await chrome.storage.local.get("gemini_api_key");
  if (result.gemini_api_key) {
    apiKeyInput.value = result.gemini_api_key;
    statusEl.textContent = "Key loaded.";
  }
};

saveBtn.addEventListener("click", async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    statusEl.textContent = "Please enter a key.";
    return;
  }
  await chrome.storage.local.set({ gemini_api_key: key });
  statusEl.textContent = "Key saved locally.";
});

clearBtn.addEventListener("click", async () => {
  await chrome.storage.local.remove("gemini_api_key");
  apiKeyInput.value = "";
  statusEl.textContent = "Key cleared.";
});

loadKey();
