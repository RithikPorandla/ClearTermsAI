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

const renderCards = (container, items, emptyMessage) => {
  container.innerHTML = "";
  if (!items || items.length === 0) {
    const div = document.createElement("div");
    div.className = "card";
    div.textContent = emptyMessage;
    container.appendChild(div);
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = item.title || item.right || item.step || "Unclear";

    const body = document.createElement("p");
    body.textContent = item.why_it_matters || item.details || "Unclear";

    card.appendChild(title);
    card.appendChild(body);

    if (item.evidence_quotes && item.evidence_quotes.length) {
      item.evidence_quotes.slice(0, 2).forEach((quote) => {
        const q = document.createElement("div");
        q.className = "quote";
        q.textContent = `"${quote}"`;
        card.appendChild(q);
      });
    }

    container.appendChild(card);
  });
};

const renderDisclaimers = (items) => {
  disclaimersEl.innerHTML = "";
  (items || ["Informational only — not legal advice."]).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    disclaimersEl.appendChild(li);
  });
};

const handleExport = () => {
  window.print();
};

const loadReport = async () => {
  domainEl.textContent = `Domain: ${domain}`;
  const stored = await chrome.storage.local.get(`analysis:${domain}`);
  const record = stored[`analysis:${domain}`];

  if (!record?.analysis) {
    gistEl.textContent = "No analysis found for this domain. Run the analysis from the popup.";
    scoreEl.textContent = "--";
    levelEl.textContent = "Unclear";
    timestampEl.textContent = "Analyzed: --";
    renderCards(flagsEl, [], "No analysis available.");
    renderCards(rightsEl, [], "No analysis available.");
    renderCards(escapeEl, [], "No analysis available.");
    renderDisclaimers(["Informational only — not legal advice."]);
    return;
  }

  const { analysis, meta } = record;
  scoreEl.textContent = analysis.Risk_Score ?? "--";
  levelEl.textContent = analysis.Risk_Level ?? "Unclear";
  gistEl.textContent = analysis.The_Gist || "Unclear";
  timestampEl.textContent = meta?.analyzed_at
    ? `Analyzed: ${new Date(meta.analyzed_at).toLocaleString()}`
    : "Analyzed: --";

  renderCards(flagsEl, analysis.Red_Flags || [], "No major red flags detected or evidence unclear.");
  renderCards(rightsEl, analysis.Data_Rights || [], "No data rights found or evidence unclear.");
  renderCards(escapeEl, analysis.The_Escape || [], "No account deletion or opt-out steps found.");
  renderDisclaimers(analysis.Disclaimers);
};

loadReport();

const exportBtn = document.getElementById("export-pdf");
if (exportBtn) {
  exportBtn.addEventListener("click", handleExport);
}
