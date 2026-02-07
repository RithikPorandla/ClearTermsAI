const statusEl = document.getElementById("status");
const analyzeBtn = document.getElementById("analyze");
const viewBtn = document.getElementById("view-report");
const optionsBtn = document.getElementById("open-options");
const flagsList = document.getElementById("flags-list");
const riskScoreEl = document.getElementById("risk-score");
const riskLevelEl = document.getElementById("risk-level");
const gistEl = document.getElementById("gist");
const meterEl = document.getElementById("risk-meter");

let lastDomain = null;
let lastPayload = null;
let autoAnalyzeTriggered = false;

const setStatus = (text) => {
  statusEl.textContent = text;
};

const setRisk = (score, level) => {
  riskScoreEl.textContent = Number.isFinite(score) ? String(score) : "--";
  riskLevelEl.textContent = level || "Unclear";
  meterEl.classList.remove("risk-low", "risk-med", "risk-high", "risk-extreme");
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  const cls = level === "Low" ? "risk-low"
    : level === "Medium" ? "risk-med"
    : level === "High" ? "risk-high"
    : level === "Extreme" ? "risk-extreme"
    : null;
  if (cls) meterEl.classList.add(cls);
};

const renderFlags = (flags) => {
  flagsList.innerHTML = "";
  if (!flags || flags.length === 0) {
    const li = document.createElement("li");
    li.className = "flag";
    li.textContent = "No major red flags detected or evidence unclear.";
    flagsList.appendChild(li);
    return;
  }
  flags.slice(0, 3).forEach((flag) => {
    const li = document.createElement("li");
    li.className = "flag";
    li.textContent = flag.title || flag.clause_type || "Red flag";
    flagsList.appendChild(li);
  });
};

const renderAnalysis = (analysis) => {
  if (!analysis) return;
  setRisk(analysis.Risk_Score, analysis.Risk_Level);
  gistEl.textContent = analysis.The_Gist || "Unclear.";
  renderFlags(analysis.Red_Flags || []);
  viewBtn.disabled = false;
};

const openReport = () => {
  if (!lastDomain) return;
  const url = chrome.runtime.getURL(`report.html?domain=${encodeURIComponent(lastDomain)}`);
  chrome.tabs.create({ url });
};

const requestAnalysis = async () => {
  if (!lastPayload) {
    setStatus("No policy data available on this page.");
    return;
  }
  setStatus("Analyzing policy…");
  analyzeBtn.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({
      type: "analyzePolicy",
      payload: lastPayload
    });

    if (response?.error) {
      if (response.error === "NO_API_KEY") {
        setStatus("Add your Gemini API key in settings.");
      } else if (response.error === "GEMINI_ERROR") {
        setStatus("Gemini request failed. Check your key and quota.");
      } else if (response.error === "PARSE_ERROR" && response.message === "EMPTY_ANALYSIS") {
        setStatus("Analysis was inconclusive. Try again.");
      } else {
        setStatus(response.message || "Analysis failed.");
      }
      analyzeBtn.disabled = false;
      return;
    }

    renderAnalysis(response.analysis);
    setStatus("Analysis complete.");
  } catch (err) {
    setStatus("Analysis failed. Try again.");
  } finally {
    analyzeBtn.disabled = false;
  }
};

const collectPolicy = async () => {
  setStatus("Checking page…");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus("No active tab.");
    return;
  }

  const handleResponse = async (response) => {
    if (!response) {
      setStatus("Unable to read this page.");
      return;
    }

    lastPayload = {
      url: response.url,
      title: response.title,
      text: response.text,
      textHash: response.textHash,
      isPolicyPage: response.isPolicyPage,
      signals: response.signals
    };

    lastDomain = response.domain;

    if (!response.isPolicyPage) {
      setStatus("This doesn’t look like a policy page. You can still analyze it.");
    } else {
      setStatus("Policy page detected.");
    }

    const cached = await chrome.runtime.sendMessage({
      type: "getAnalysis",
      payload: { domain: response.domain, textHash: response.textHash }
    });

    if (cached?.analysis) {
      renderAnalysis(cached.analysis);
      setStatus("Loaded cached analysis.");
    } else if (response.isPolicyPage && response.text && response.text.length >= 400 && !autoAnalyzeTriggered) {
      autoAnalyzeTriggered = true;
      requestAnalysis();
    }
  };

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "collectPolicyData" });
    await handleResponse(response);
  } catch (err) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["scripts/content.js"]
      });
      const response = await chrome.tabs.sendMessage(tab.id, { type: "collectPolicyData" });
      await handleResponse(response);
    } catch (innerErr) {
      setStatus("Unable to connect to the page.");
    }
  }
};

optionsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

analyzeBtn.addEventListener("click", requestAnalysis);
viewBtn.addEventListener("click", openReport);

collectPolicy();
