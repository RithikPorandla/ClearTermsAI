const qs = new URLSearchParams(location.search);
const domain = qs.get("domain") || "unknown";

const domainEl = document.getElementById("domain");
const timestampEl = document.getElementById("timestamp");
const scoreEl = document.getElementById("report-score");
const levelEl = document.getElementById("report-level");
const gistEl = document.getElementById("report-gist");
const flagsEl = document.getElementById("report-flags");
const rightsEl = document.getElementById("report-rights");
const escapeEl = document.getElementById("report-escape");
const disclaimersEl = document.getElementById("report-disclaimers");
const dataEl = document.getElementById("report-data");
const readabilityEl = document.getElementById("report-readability");

const SEVERITY_COLORS = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#d97706",
  low: "#059669"
};

const RISK_COLORS = {
  Critical: "#991b1b",
  High: "#c0552e",
  Medium: "#d97706",
  Low: "#059669",
  Minimal: "#166534"
};

const escapeHtml = (str) => {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
};

const renderFlags = (container, items) => {
  container.innerHTML = "";
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="card">No major red flags detected.</div>';
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";
    const dotColor = SEVERITY_COLORS[item.severity] || "#94a3b8";
    const quotes = (item.evidence_quotes || []).slice(0, 2)
      .map((q) => `<div class="quote">"${escapeHtml(q)}"</div>`).join("");

    card.innerHTML = `
      <div class="card-header">
        <span class="severity-dot" style="background:${dotColor}"></span>
        <span class="card-title">${escapeHtml(item.title || item.clause_type)}</span>
        <span class="severity-badge" style="background:${dotColor}14;color:${dotColor}">${escapeHtml(item.severity || "")}</span>
      </div>
      <p class="card-plain">${escapeHtml(item.plain_english || "")}</p>
      <p class="card-body">${escapeHtml(item.why_it_matters || "")}</p>
      ${quotes}
    `;
    container.appendChild(card);
  });
};

const renderRights = (container, items) => {
  container.innerHTML = "";
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="card">No data rights information found.</div>';
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";
    const available = item.available ? "✓ Available" : "✗ Not found";
    const availColor = item.available ? "#059669" : "#dc2626";
    const quotes = (item.evidence_quotes || []).slice(0, 2)
      .map((q) => `<div class="quote">"${escapeHtml(q)}"</div>`).join("");

    card.innerHTML = `
      <div class="card-header">
        <span class="card-title">${escapeHtml(item.right)}</span>
        <span class="severity-badge" style="color:${availColor}">${available}</span>
      </div>
      <p class="card-body">${escapeHtml(item.details)}</p>
      ${quotes}
    `;
    container.appendChild(card);
  });
};

const renderEscape = (container, items) => {
  container.innerHTML = "";
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="card">No opt-out or deletion steps found.</div>';
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";
    const quotes = (item.evidence_quotes || []).slice(0, 2)
      .map((q) => `<div class="quote">"${escapeHtml(q)}"</div>`).join("");

    card.innerHTML = `
      <div class="card-header">
        <span class="card-title">${escapeHtml(item.action || item.step)}</span>
        <span class="severity-badge">${escapeHtml(item.difficulty || "")}</span>
      </div>
      <p class="card-body">${escapeHtml(item.details)}</p>
      ${quotes}
    `;
    container.appendChild(card);
  });
};

const renderDataPractices = (container, dp) => {
  container.innerHTML = "";
  if (!dp) {
    container.innerHTML = '<div class="card">No data practices information found.</div>';
    return;
  }

  const rows = [];
  if (dp.collects?.length) rows.push({ label: "Collects", value: dp.collects.join(", ") });
  if (dp.shares_with?.length) rows.push({ label: "Shared with", value: dp.shares_with.join(", ") });
  if (dp.retention) rows.push({ label: "Retention", value: dp.retention });
  if (dp.tracking_methods?.length) rows.push({ label: "Tracking", value: dp.tracking_methods.join(", ") });

  if (rows.length === 0) {
    container.innerHTML = '<div class="card">No data practices information found.</div>';
    return;
  }

  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = rows.map((r) => `
    <div class="data-row">
      <span class="data-label">${escapeHtml(r.label)}</span>
      <span class="data-value">${escapeHtml(r.value)}</span>
    </div>
  `).join("");
  container.appendChild(card);
};

const renderReadability = (container, rd) => {
  container.innerHTML = "";
  if (!rd) return;

  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="data-row">
      <span class="data-label">Grade level</span>
      <span class="data-value">${escapeHtml(rd.grade_level)}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Jargon density</span>
      <span class="data-value" style="text-transform:capitalize">${escapeHtml(rd.jargon_density)}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Est. read time</span>
      <span class="data-value">~${rd.estimated_read_minutes || "?"} min</span>
    </div>
  `;
  container.appendChild(card);
};

const renderDisclaimers = (items) => {
  disclaimersEl.innerHTML = "";
  (items || ["Informational only — not legal advice."]).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    disclaimersEl.appendChild(li);
  });
};

const handleExport = () => { window.print(); };

const loadReport = async () => {
  domainEl.textContent = domain;
  const stored = await chrome.storage.local.get(`analysis:${domain}`);
  const record = stored[`analysis:${domain}`];

  if (!record?.analysis) {
    gistEl.textContent = "No analysis found for this domain. Run the analysis from the popup.";
    scoreEl.textContent = "--";
    levelEl.textContent = "Unclear";
    timestampEl.textContent = "--";
    return;
  }

  const { analysis, meta } = record;
  const color = RISK_COLORS[analysis.Risk_Level] || "#64748b";
  scoreEl.textContent = analysis.Risk_Score ?? "--";
  scoreEl.style.color = color;
  levelEl.textContent = analysis.Risk_Level ?? "Unclear";
  gistEl.textContent = analysis.The_Gist || "Unclear";
  timestampEl.textContent = meta?.analyzed_at
    ? new Date(meta.analyzed_at).toLocaleString()
    : "--";

  const scoreRing = document.getElementById("score-ring");
  if (scoreRing) scoreRing.style.borderColor = color;

  renderFlags(flagsEl, analysis.Red_Flags || []);
  renderDataPractices(dataEl, analysis.Data_Practices);
  renderRights(rightsEl, analysis.Data_Rights || []);
  renderEscape(escapeEl, analysis.The_Escape || []);
  renderReadability(readabilityEl, analysis.Readability);
  renderDisclaimers(analysis.Disclaimers);
};

loadReport();

const exportBtn = document.getElementById("export-pdf");
if (exportBtn) exportBtn.addEventListener("click", handleExport);
