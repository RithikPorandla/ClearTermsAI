const POLICY_KEYWORDS = [
  "terms and conditions",
  "terms & conditions",
  "terms of service",
  "terms of use",
  "user agreement",
  "service agreement",
  "subscription terms",
  "end user license",
  "eula",
  "privacy policy",
  "privacy notice",
  "data policy",
  "data processing",
  "data protection",
  "cookie policy",
  "acceptable use",
  "dpa",
  "legal terms"
];

const LEGAL_TERMS = [
  "arbitration",
  "class action",
  "governing law",
  "liability",
  "limitation of liability",
  "disclaimer",
  "indemnify",
  "termination",
  "refund",
  "auto-renew",
  "subscription",
  "opt out",
  "personal data",
  "third party",
  "share",
  "sell",
  "cookies",
  "tracking",
  "processing",
  "data protection"
];

const URL_PATTERNS = [
  /terms/i,
  /terms-and-conditions/i,
  /terms-conditions/i,
  /termsandconditions/i,
  /user-agreement/i,
  /service-agreement/i,
  /subscription-terms/i,
  /eula/i,
  /privacy/i,
  /cookie/i,
  /policy/i,
  /legal/i,
  /tos/i,
  /dpa/i
];

const DETECTOR_DEFAULTS = {
  weights: {
    url_pattern: 2,
    title_keyword: 2,
    heading_keyword: 2,
    body_keyword: 1,
    legal_terms: 2,
    longform_text: 1
  },
  threshold: 5
};

const DETECTOR_STORAGE_KEY = "policy_detector";
const MAX_TEXT_LENGTH = 24000;
const PANEL_ID = "clearterms-ai-panel";
const PANEL_TOGGLE_ID = "clearterms-ai-toggle";

const hashText = (text) => {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getDetectorConfig = async () => {
  const stored = await chrome.storage.local.get(DETECTOR_STORAGE_KEY);
  const detector = stored[DETECTOR_STORAGE_KEY] || {};
  const weights = {
    ...DETECTOR_DEFAULTS.weights,
    ...(detector.weights || {})
  };
  const threshold =
    typeof detector.threshold === "number" ? detector.threshold : DETECTOR_DEFAULTS.threshold;
  return { weights, threshold };
};

const detectPolicyPage = async (textSnapshot) => {
  const signals = [];
  const url = location.href;
  const title = (document.title || "").toLowerCase();
  const ogTitle = (document.querySelector("meta[property='og:title']")?.content || "").toLowerCase();
  const bodyText = (textSnapshot || document.body?.innerText || "").toLowerCase();

  const urlMatch = URL_PATTERNS.some((re) => re.test(url));
  if (urlMatch) signals.push("url_pattern");

  const titleMatch = POLICY_KEYWORDS.some((kw) => title.includes(kw) || ogTitle.includes(kw));
  if (titleMatch) signals.push("title_keyword");

  const headings = Array.from(document.querySelectorAll("h1, h2"))
    .map((el) => el.innerText.toLowerCase())
    .join(" ");
  const headingMatch = POLICY_KEYWORDS.some((kw) => headings.includes(kw));
  if (headingMatch) signals.push("heading_keyword");

  const bodyMatch = POLICY_KEYWORDS.some((kw) => bodyText.includes(kw));
  if (bodyMatch) signals.push("body_keyword");

  const legalHits = LEGAL_TERMS.filter((term) => bodyText.includes(term)).length;
  if (legalHits >= 4) signals.push("legal_terms");

  const longform = bodyText.length >= 3000;
  if (longform) signals.push("longform_text");

  const { weights, threshold } = await getDetectorConfig();

  let score = 0;
  if (urlMatch) score += weights.url_pattern || 0;
  if (titleMatch) score += weights.title_keyword || 0;
  if (headingMatch) score += weights.heading_keyword || 0;
  if (bodyMatch) score += weights.body_keyword || 0;
  if (legalHits >= 4) score += weights.legal_terms || 0;
  if (longform) score += weights.longform_text || 0;

  const isPolicyPage =
    score >= threshold ||
    (urlMatch && (titleMatch || headingMatch)) ||
    (titleMatch && headingMatch) ||
    (legalHits >= 6 && longform);

  return { isPolicyPage, signals, score };
};

const stripNoise = (root) => {
  const selectors = [
    "nav", "footer", "header", "aside", "form", "button", "input",
    "select", "textarea", "[role='navigation']",
    "[aria-label*='cookie' i]", ".cookie", ".cookies", "#cookie", "#cookies",
    ".banner", ".advert", ".ad", "script", "style"
  ];
  selectors.forEach((selector) => {
    root.querySelectorAll(selector).forEach((el) => el.remove());
  });
};

const extractPolicyText = () => {
  if (!document.body) return "";
  const clone = document.body.cloneNode(true);
  stripNoise(clone);

  const candidates = Array.from(clone.querySelectorAll("main, article, [role='main'], section"));
  const best = candidates
    .map((el) => ({ el, len: (el.innerText || "").length }))
    .sort((a, b) => b.len - a.len)[0];

  const main = best?.el || clone;
  let text = main.innerText || "";

  if (text.length < 800) {
    const blocks = Array.from(clone.querySelectorAll("p, li"));
    text = blocks.map((el) => el.innerText).join(" ");
  }
  if (text.length < 800) {
    text = clone.innerText || text;
  }
  text = text.replace(/\s+/g, " ").trim();
  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH) + " [TRUNCATED]";
  }
  return text;
};

const extractPolicyTextWithRetry = async () => {
  let text = extractPolicyText();
  if (text.length >= 800) return text;
  await wait(600);
  text = extractPolicyText();
  if (text.length >= 800) return text;
  await wait(1200);
  return extractPolicyText();
};

// --------------------------------------------------------------------------
// Floating panel that persists while the user scrolls
// --------------------------------------------------------------------------

const RISK_COLORS = {
  Critical: "#991b1b",
  High: "#c0552e",
  Medium: "#c5883a",
  Low: "#2f7a6d",
  Minimal: "#166534"
};

const riskColor = (level) => RISK_COLORS[level] || "#6b7280";

const injectPanel = () => {
  if (document.getElementById(PANEL_ID)) return;

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <div class="ct-panel-inner">
      <div class="ct-header">
        <div class="ct-brand">
          <div class="ct-logo">CT</div>
          <div>
            <div class="ct-title">ClearTerms AI</div>
            <div class="ct-subtitle">Policy Risk Scanner</div>
          </div>
        </div>
        <div class="ct-header-actions">
          <button class="ct-btn-minimize" id="ct-minimize" title="Minimize">—</button>
          <button class="ct-btn-close" id="ct-close" title="Close">×</button>
        </div>
      </div>
      <div class="ct-body" id="ct-body">
        <div class="ct-score-section" id="ct-score-section">
          <div class="ct-score-ring" id="ct-score-ring">
            <div class="ct-score-value" id="ct-score-value">—</div>
            <div class="ct-score-label" id="ct-score-label">Scanning…</div>
          </div>
        </div>
        <div class="ct-gist" id="ct-gist">Analyzing this page…</div>
        <div class="ct-flags-section" id="ct-flags-section"></div>
        <div class="ct-data-section" id="ct-data-section"></div>
        <div class="ct-actions">
          <button class="ct-btn-primary" id="ct-analyze">Analyze This Policy</button>
          <button class="ct-btn-secondary" id="ct-full-report">Full Report →</button>
        </div>
        <div class="ct-status" id="ct-status"></div>
        <div class="ct-footer">Not legal advice · Evidence-first · Local-first</div>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #${PANEL_ID} {
      position: fixed;
      top: 16px;
      right: 16px;
      width: 380px;
      max-height: calc(100vh - 32px);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
      font-size: 14px;
      color: #0f172a;
      pointer-events: auto;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
    }
    #${PANEL_ID}.ct-minimized {
      width: auto;
      max-height: none;
    }
    #${PANEL_ID}.ct-minimized .ct-panel-inner {
      padding: 0;
      box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    }
    #${PANEL_ID}.ct-minimized .ct-body,
    #${PANEL_ID}.ct-minimized .ct-header {
      display: none;
    }
    #${PANEL_ID}.ct-hidden {
      transform: translateX(420px);
      opacity: 0;
      pointer-events: none;
    }
    .ct-panel-inner {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 32px);
    }
    .ct-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
      background: #fafbfc;
      flex-shrink: 0;
    }
    .ct-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .ct-logo {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #0f172a, #1e3a5f);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.5px;
    }
    .ct-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.2;
    }
    .ct-subtitle {
      font-size: 11px;
      color: #64748b;
      line-height: 1.2;
    }
    .ct-header-actions {
      display: flex;
      gap: 4px;
    }
    .ct-btn-minimize, .ct-btn-close {
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      line-height: 1;
    }
    .ct-btn-minimize:hover, .ct-btn-close:hover {
      background: #f1f5f9;
      color: #475569;
    }
    .ct-body {
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
      flex: 1;
      min-height: 0;
    }
    .ct-score-section {
      display: flex;
      justify-content: center;
      padding: 8px 0;
    }
    .ct-score-ring {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 3px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #fafbfc;
      transition: border-color 0.4s ease;
    }
    .ct-score-value {
      font-size: 32px;
      font-weight: 800;
      line-height: 1;
      font-variant-numeric: tabular-nums;
      color: #0f172a;
    }
    .ct-score-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #64748b;
      margin-top: 2px;
    }
    .ct-gist {
      font-size: 13px;
      line-height: 1.55;
      color: #475569;
      text-align: center;
      padding: 0 8px;
    }
    .ct-flags-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .ct-flag {
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid #f1f5f9;
      background: #fafbfc;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      transition: border-color 0.2s;
    }
    .ct-flag:hover {
      border-color: #e2e8f0;
    }
    .ct-flag-severity {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-top: 6px;
      flex-shrink: 0;
    }
    .ct-flag-content {
      flex: 1;
      min-width: 0;
    }
    .ct-flag-title {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.3;
    }
    .ct-flag-plain {
      font-size: 12px;
      color: #64748b;
      line-height: 1.4;
      margin-top: 2px;
    }
    .ct-flag-quote {
      font-size: 11px;
      color: #94a3b8;
      font-style: italic;
      margin-top: 4px;
      padding-left: 8px;
      border-left: 2px solid #e2e8f0;
      line-height: 1.4;
    }
    .ct-section-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #94a3b8;
      padding: 4px 0;
    }
    .ct-data-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ct-data-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-size: 12px;
      padding: 4px 0;
    }
    .ct-data-label {
      font-weight: 600;
      color: #64748b;
      min-width: 60px;
      flex-shrink: 0;
    }
    .ct-data-value {
      color: #0f172a;
    }
    .ct-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .ct-btn-primary {
      padding: 10px 14px;
      border: none;
      border-radius: 10px;
      background: #0f172a;
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .ct-btn-primary:hover {
      background: #1e293b;
    }
    .ct-btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .ct-btn-secondary {
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: white;
      color: #0f172a;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .ct-btn-secondary:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
    .ct-btn-secondary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .ct-status {
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
      min-height: 14px;
    }
    .ct-footer {
      font-size: 10px;
      color: #cbd5e1;
      text-align: center;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
    }

    /* Floating toggle button when minimized */
    #${PANEL_TOGGLE_ID} {
      position: fixed;
      top: 16px;
      right: 16px;
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, #0f172a, #1e3a5f);
      color: white;
      border: none;
      cursor: pointer;
      z-index: 2147483647;
      display: none;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.5px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #${PANEL_TOGGLE_ID}:hover {
      transform: scale(1.05);
      box-shadow: 0 12px 40px rgba(0,0,0,0.22);
    }
    #${PANEL_TOGGLE_ID}.ct-has-score {
      width: auto;
      padding: 0 14px;
      gap: 8px;
    }
    .ct-toggle-score {
      font-size: 16px;
      font-weight: 800;
    }
    .ct-toggle-label {
      font-size: 10px;
      opacity: 0.7;
    }

    @media (max-width: 480px) {
      #${PANEL_ID} {
        width: calc(100vw - 16px);
        right: 8px;
        top: 8px;
      }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(panel);

  const toggle = document.createElement("button");
  toggle.id = PANEL_TOGGLE_ID;
  toggle.innerHTML = "CT";
  document.body.appendChild(toggle);

  document.getElementById("ct-close").addEventListener("click", () => {
    panel.classList.add("ct-hidden");
    toggle.style.display = "flex";
  });

  document.getElementById("ct-minimize").addEventListener("click", () => {
    panel.classList.add("ct-hidden");
    toggle.style.display = "flex";
  });

  toggle.addEventListener("click", () => {
    panel.classList.remove("ct-hidden");
    toggle.style.display = "none";
  });

  document.getElementById("ct-full-report").addEventListener("click", () => {
    const domain = location.hostname || "unknown";
    const url = chrome.runtime.getURL(`report.html?domain=${encodeURIComponent(domain)}`);
    window.open(url, "_blank");
  });

  return panel;
};

const severityColor = (severity) => {
  switch (severity) {
    case "critical": return "#dc2626";
    case "high": return "#ea580c";
    case "medium": return "#d97706";
    case "low": return "#059669";
    default: return "#94a3b8";
  }
};

const renderAnalysisToPanel = (analysis) => {
  if (!analysis) return;

  const scoreRing = document.getElementById("ct-score-ring");
  const scoreValue = document.getElementById("ct-score-value");
  const scoreLabel = document.getElementById("ct-score-label");
  const gist = document.getElementById("ct-gist");
  const flagsSection = document.getElementById("ct-flags-section");
  const dataSection = document.getElementById("ct-data-section");
  const fullReportBtn = document.getElementById("ct-full-report");

  const score = analysis.Risk_Score ?? 0;
  const level = analysis.Risk_Level || "Minimal";
  const color = riskColor(level);

  scoreValue.textContent = String(score);
  scoreLabel.textContent = level;
  scoreRing.style.borderColor = color;
  scoreValue.style.color = color;

  gist.textContent = analysis.The_Gist || "Analysis complete.";

  flagsSection.innerHTML = "";
  const flags = analysis.Red_Flags || [];
  if (flags.length > 0) {
    const label = document.createElement("div");
    label.className = "ct-section-label";
    label.textContent = `${flags.length} Risk${flags.length > 1 ? "s" : ""} Found`;
    flagsSection.appendChild(label);

    flags.slice(0, 5).forEach((flag) => {
      const el = document.createElement("div");
      el.className = "ct-flag";
      const dotColor = severityColor(flag.severity);
      const quote = flag.evidence_quotes?.[0];
      el.innerHTML = `
        <div class="ct-flag-severity" style="background:${dotColor}"></div>
        <div class="ct-flag-content">
          <div class="ct-flag-title">${escapeHtml(flag.title || flag.clause_type)}</div>
          <div class="ct-flag-plain">${escapeHtml(flag.plain_english || flag.why_it_matters || "")}</div>
          ${quote ? `<div class="ct-flag-quote">"${escapeHtml(quote.slice(0, 120))}${quote.length > 120 ? "…" : ""}"</div>` : ""}
        </div>
      `;
      flagsSection.appendChild(el);
    });
  }

  dataSection.innerHTML = "";
  const dp = analysis.Data_Practices;
  if (dp) {
    const label = document.createElement("div");
    label.className = "ct-section-label";
    label.textContent = "Data Practices";
    dataSection.appendChild(label);

    if (dp.collects?.length) {
      addDataRow(dataSection, "Collects", dp.collects.slice(0, 4).join(", "));
    }
    if (dp.shares_with?.length) {
      addDataRow(dataSection, "Shared with", dp.shares_with.slice(0, 3).join(", "));
    }
    if (dp.retention) {
      addDataRow(dataSection, "Retention", dp.retention);
    }
    if (dp.tracking_methods?.length) {
      addDataRow(dataSection, "Tracking", dp.tracking_methods.slice(0, 3).join(", "));
    }
  }

  if (analysis.Readability) {
    const label2 = document.createElement("div");
    label2.className = "ct-section-label";
    label2.textContent = "Readability";
    dataSection.appendChild(label2);
    addDataRow(dataSection, "Level", analysis.Readability.grade_level || "Unknown");
    addDataRow(dataSection, "Jargon", analysis.Readability.jargon_density || "Unknown");
    if (analysis.Readability.estimated_read_minutes) {
      addDataRow(dataSection, "Read time", `~${analysis.Readability.estimated_read_minutes} min`);
    }
  }

  fullReportBtn.disabled = false;

  const toggle = document.getElementById(PANEL_TOGGLE_ID);
  if (toggle) {
    toggle.innerHTML = `<span class="ct-toggle-score" style="color:white">${score}</span><span class="ct-toggle-label">risk</span>`;
    toggle.classList.add("ct-has-score");
  }
};

const addDataRow = (container, label, value) => {
  const row = document.createElement("div");
  row.className = "ct-data-row";
  row.innerHTML = `<span class="ct-data-label">${escapeHtml(label)}</span><span class="ct-data-value">${escapeHtml(value)}</span>`;
  container.appendChild(row);
};

const escapeHtml = (str) => {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
};

// --------------------------------------------------------------------------
// Panel logic: auto-detect, analyze, render
// --------------------------------------------------------------------------

let panelPayload = null;
let autoAnalyzeTriggered = false;

const setStatus = (text) => {
  const el = document.getElementById("ct-status");
  if (el) el.textContent = text;
};

const initPanel = async () => {
  const text = await extractPolicyTextWithRetry();
  const { isPolicyPage, signals, score } = await detectPolicyPage(text);

  if (!isPolicyPage) return;

  injectPanel();

  panelPayload = {
    url: location.href,
    title: document.title || "",
    text,
    textHash: hashText(text || ""),
    isPolicyPage,
    signals,
    domain: location.hostname || "unknown"
  };

  const cached = await chrome.runtime.sendMessage({
    type: "getAnalysis",
    payload: { domain: panelPayload.domain, textHash: panelPayload.textHash }
  });

  if (cached?.analysis) {
    renderAnalysisToPanel(cached.analysis);
    setStatus("Loaded cached analysis.");
  } else if (text && text.length >= 400 && !autoAnalyzeTriggered) {
    autoAnalyzeTriggered = true;
    runAnalysis();
  }

  document.getElementById("ct-analyze").addEventListener("click", () => {
    runAnalysis();
  });
};

const runAnalysis = async () => {
  if (!panelPayload) return;
  setStatus("Analyzing…");
  const analyzeBtn = document.getElementById("ct-analyze");
  if (analyzeBtn) analyzeBtn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      type: "analyzePolicy",
      payload: panelPayload
    });

    if (response?.error) {
      if (response.error === "NO_API_KEY") {
        setStatus("Add your Gemini API key in extension settings.");
      } else {
        setStatus(response.message || "Analysis failed.");
      }
      if (analyzeBtn) analyzeBtn.disabled = false;
      return;
    }

    renderAnalysisToPanel(response.analysis);
    setStatus("Analysis complete.");
  } catch (err) {
    setStatus("Analysis failed. Try again.");
  } finally {
    if (analyzeBtn) analyzeBtn.disabled = false;
  }
};

// --------------------------------------------------------------------------
// Message listener for popup + panel init
// --------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "collectPolicyData") {
    (async () => {
      const text = await extractPolicyTextWithRetry();
      const { isPolicyPage, signals, score } = await detectPolicyPage(text);
      const textHash = hashText(text || "");
      const domain = location.hostname || "unknown";
      sendResponse({
        url: location.href,
        title: document.title || "",
        text,
        textHash,
        domain,
        isPolicyPage,
        signals,
        score
      });
    })();
    return true;
  }
  return true;
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => setTimeout(initPanel, 500));
} else {
  setTimeout(initPanel, 500);
}
