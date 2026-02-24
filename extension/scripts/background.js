const MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"];
const ANALYSIS_VERSION = 4;
const MAX_INPUT_CHARS = 16000;
const OUTPUT_TOKENS = 2400;

// --------------------------------------------------------------------------
// Multi-dimensional risk scoring
// --------------------------------------------------------------------------

const CLAUSE_CATEGORIES = {
  dispute_resolution: {
    forced_arbitration_class_waiver: { base: 18, severity_multiplier: 1.2 },
    jurisdiction_limitation: { base: 6, severity_multiplier: 1.0 }
  },
  data_practices: {
    data_sale_or_ad_sharing: { base: 16, severity_multiplier: 1.15 },
    ai_training_on_user_data: { base: 14, severity_multiplier: 1.1 },
    cross_border_data_transfer: { base: 8, severity_multiplier: 1.0 },
    biometric_data_collection: { base: 12, severity_multiplier: 1.2 }
  },
  content_rights: {
    broad_user_content_license: { base: 14, severity_multiplier: 1.1 },
    content_monetization: { base: 10, severity_multiplier: 1.0 }
  },
  financial: {
    auto_renewal_or_difficult_cancellation: { base: 10, severity_multiplier: 1.0 },
    no_refunds: { base: 8, severity_multiplier: 1.0 },
    price_change_without_consent: { base: 7, severity_multiplier: 1.0 }
  },
  liability: {
    broad_liability_disclaimers: { base: 7, severity_multiplier: 0.9 },
    indemnification_clause: { base: 8, severity_multiplier: 1.0 }
  },
  governance: {
    unilateral_policy_changes: { base: 10, severity_multiplier: 1.0 },
    account_termination_without_cause: { base: 9, severity_multiplier: 1.05 },
    survivability_of_unfair_terms: { base: 5, severity_multiplier: 0.9 }
  }
};

const ALL_CLAUSE_TYPES = [];
for (const cat of Object.values(CLAUSE_CATEGORIES)) {
  for (const type of Object.keys(cat)) {
    ALL_CLAUSE_TYPES.push(type);
  }
}
ALL_CLAUSE_TYPES.push("other");

const SEVERITY_ENUM = ["low", "medium", "high", "critical"];

const RISK_LEVELS = [
  { min: 80, label: "Critical" },
  { min: 60, label: "High" },
  { min: 35, label: "Medium" },
  { min: 15, label: "Low" },
  { min: 0, label: "Minimal" }
];

const severityWeight = (severity) => {
  switch (severity) {
    case "critical": return 1.4;
    case "high": return 1.15;
    case "medium": return 0.85;
    case "low": return 0.6;
    default: return 1.0;
  }
};

const computeInteractionBonus = (breakdown) => {
  let bonus = 0;
  const cats = Object.keys(breakdown);
  if (cats.includes("dispute_resolution") && cats.includes("liability")) bonus += 5;
  if (cats.includes("data_practices") && cats.includes("content_rights")) bonus += 4;
  if (cats.includes("financial") && cats.includes("governance")) bonus += 3;
  if (cats.length >= 4) bonus += 3;
  return bonus;
};

const computeRiskScore = (flags) => {
  if (!Array.isArray(flags) || flags.length === 0) {
    return { score: 0, level: "Minimal", breakdown: {} };
  }

  const seen = new Set();
  const breakdown = {};
  let rawScore = 0;

  for (const flag of flags) {
    if (!flag?.clause_type || seen.has(flag.clause_type)) continue;
    seen.add(flag.clause_type);

    let basePoints = 5;
    let multiplier = 1.0;
    let category = "other";

    for (const [catName, clauses] of Object.entries(CLAUSE_CATEGORIES)) {
      if (clauses[flag.clause_type]) {
        basePoints = clauses[flag.clause_type].base;
        multiplier = clauses[flag.clause_type].severity_multiplier;
        category = catName;
        break;
      }
    }

    const sevWeight = severityWeight(flag.severity);
    const points = Math.round(basePoints * multiplier * sevWeight);

    if (!breakdown[category]) breakdown[category] = { points: 0, flags: [] };
    breakdown[category].points += points;
    breakdown[category].flags.push(flag.clause_type);

    rawScore += points;
  }

  rawScore += computeInteractionBonus(breakdown);
  const score = Math.min(100, Math.max(0, rawScore));
  const level = RISK_LEVELS.find((r) => score >= r.min)?.label || "Minimal";

  return { score, level, breakdown };
};

// --------------------------------------------------------------------------
// Detector config
// --------------------------------------------------------------------------

const DETECTOR_DEFAULTS = {
  weights: {
    url_pattern: 2,
    title_keyword: 2,
    heading_keyword: 2,
    body_keyword: 1,
    legal_terms: 2,
    longform_text: 1
  },
  threshold: 5,
  samples: 0
};

const DETECTOR_MIN_WEIGHT = 0.5;
const DETECTOR_MAX_WEIGHT = 4;
const DETECTOR_MIN_THRESHOLD = 3;
const DETECTOR_MAX_THRESHOLD = 7;
const DETECTOR_WEIGHT_STEP = 0.1;
const DETECTOR_THRESHOLD_STEP = 0.1;

const hashText = (text) => {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};

const findSentenceSnippet = (text, index) => {
  if (!text || index < 0) return "";
  const boundaries = [".", "!", "?", "\n"];
  let start = 0;
  for (const mark of boundaries) {
    const pos = text.lastIndexOf(mark, index);
    if (pos > start) start = pos + 1;
  }
  let end = text.length;
  for (const mark of boundaries) {
    const pos = text.indexOf(mark, index);
    if (pos !== -1 && pos + 1 < end) end = pos + 1;
  }
  let snippet = text.slice(start, end).trim();
  if (snippet.length < 40) {
    const windowStart = Math.max(0, index - 120);
    const windowEnd = Math.min(text.length, index + 120);
    snippet = text.slice(windowStart, windowEnd).trim();
  }
  if (snippet.length > 240) snippet = snippet.slice(0, 240).trim();
  return snippet;
};

const findQuote = (text, patterns) => {
  if (!text || !patterns || patterns.length === 0) return "";
  const lower = text.toLowerCase();
  for (const pattern of patterns) {
    if (!pattern) continue;
    let index = -1;
    if (pattern instanceof RegExp) {
      const match = pattern.exec(lower);
      if (match) index = match.index;
    } else {
      index = lower.indexOf(String(pattern).toLowerCase());
    }
    if (index !== -1) {
      const snippet = findSentenceSnippet(text, index);
      if (snippet) return snippet;
    }
  }
  return "";
};

const buildFallbackAnalysis = (text) => {
  const flags = [];
  const rights = [];
  const escape = [];

  const addFlag = (clauseType, severity, title, plain, why, patterns) => {
    if (flags.length >= 4) return;
    const quote = findQuote(text, patterns);
    if (!quote) return;
    flags.push({
      clause_type: clauseType,
      severity,
      title,
      plain_english: plain,
      why_it_matters: why,
      evidence_quotes: [quote]
    });
  };

  const addRight = (right, available, details, patterns) => {
    if (rights.length >= 3) return;
    const quote = findQuote(text, patterns);
    rights.push({ right, available: !!quote, details, evidence_quotes: quote ? [quote] : [] });
  };

  const addEscape = (action, difficulty, details, patterns) => {
    if (escape.length >= 2) return;
    const quote = findQuote(text, patterns);
    if (!quote) return;
    escape.push({ action, difficulty, details, evidence_quotes: [quote] });
  };

  addFlag("forced_arbitration_class_waiver", "high", "Forced arbitration or class action waiver",
    "You can't sue them in court.", "Limits how disputes can be resolved.",
    ["arbitration", "class action", "waive", "waiver", "binding arbitration"]);
  addFlag("data_sale_or_ad_sharing", "high", "Data sharing for ads or partners",
    "Your data may be sold or shared with advertisers.", "Your data may be shared or sold for advertising or partners.",
    ["share", "sharing", "sell", "sale", "advertising", "marketing", "third party"]);
  addFlag("auto_renewal_or_difficult_cancellation", "medium", "Auto-renewal or difficult cancellation",
    "Your subscription renews automatically.", "Subscriptions may renew automatically or require extra steps to cancel.",
    ["auto-renew", "automatically renew", "cancel", "cancellation", "subscription"]);
  addFlag("broad_user_content_license", "medium", "Broad license to your content",
    "They can use your content however they want.", "Your content may be licensed broadly for platform use.",
    ["license", "worldwide", "royalty-free", "perpetual", "your content"]);

  addRight("Access or delete data", false, "You may be able to access or delete personal data.",
    ["access", "delete", "erase", "request a copy", "data subject"]);
  addRight("Opt out of marketing", false, "You may be able to opt out of marketing.",
    ["opt out", "unsubscribe", "marketing communications"]);

  addEscape("Close your account", "unclear", "Look for account deletion or closure steps.",
    ["delete your account", "close your account", "terminate your account"]);
  addEscape("Contact support", "easy", "Support or privacy contact for requests.",
    ["contact us", "privacy team", "support", "help center"]);

  const gistBase = flags.length > 0
    ? `Potential risks spotted: ${flags.map((f) => f.title).slice(0, 2).join(" and ")}.`
    : "Policy text detected, but specific risk clauses were unclear.";

  return {
    The_Gist: `${gistBase} Review highlighted sections before accepting.`,
    Red_Flags: flags,
    Data_Practices: { collects: [], shares_with: [], retention: "Unclear", tracking_methods: [] },
    Data_Rights: rights,
    The_Escape: escape,
    Readability: { grade_level: "Unknown", jargon_density: "moderate", estimated_read_minutes: 15 },
    Confidence: flags.length > 0 ? 0.45 : 0.3,
    Disclaimers: ["Informational only — not legal advice.", "Quotes are verbatim from the policy text provided."]
  };
};

const isMeaningfulAnalysis = (analysis) => {
  if (!analysis || typeof analysis !== "object") return false;
  const gist = typeof analysis.The_Gist === "string" ? analysis.The_Gist.trim() : "";
  const flags = Array.isArray(analysis.Red_Flags) ? analysis.Red_Flags : [];
  const rights = Array.isArray(analysis.Data_Rights) ? analysis.Data_Rights : [];
  const escape = Array.isArray(analysis.The_Escape) ? analysis.The_Escape : [];
  return gist.length >= 20 || flags.length > 0 || rights.length > 0 || escape.length > 0;
};

const normalizeDetector = (detector) => {
  const base = DETECTOR_DEFAULTS;
  const weights = { ...base.weights, ...(detector?.weights || {}) };
  const threshold = typeof detector?.threshold === "number" ? detector.threshold : base.threshold;
  const samples = typeof detector?.samples === "number" ? detector.samples : base.samples;
  return { weights, threshold, samples };
};

const logDetectionEvent = async ({ url, domain, isPolicyPage, signals, textLength, success, error }) => {
  const stored = await chrome.storage.local.get("policy_detection_log");
  const list = Array.isArray(stored.policy_detection_log) ? stored.policy_detection_log : [];
  const entry = {
    url, domain, isPolicyPage: Boolean(isPolicyPage),
    signals: Array.isArray(signals) ? signals : [],
    textLength: Number.isFinite(textLength) ? textLength : 0,
    success: Boolean(success), error: error || null,
    timestamp: new Date().toISOString()
  };
  const next = [entry, ...list].slice(0, 50);
  await chrome.storage.local.set({ policy_detection_log: next });
};

const updateDetectorModel = async ({ signals, isPolicyPage, outcome }) => {
  if (!Array.isArray(signals) || signals.length === 0) return;
  const stored = await chrome.storage.local.get("policy_detector");
  const detector = normalizeDetector(stored.policy_detector);
  const weights = { ...detector.weights };
  let threshold = detector.threshold;

  if (outcome === "success") {
    signals.forEach((sig) => {
      const current = typeof weights[sig] === "number" ? weights[sig] : 1;
      weights[sig] = Math.min(DETECTOR_MAX_WEIGHT, current + DETECTOR_WEIGHT_STEP);
    });
    if (!isPolicyPage) threshold = Math.max(DETECTOR_MIN_THRESHOLD, threshold - DETECTOR_THRESHOLD_STEP);
  }
  if (outcome === "no_text" && isPolicyPage) {
    signals.forEach((sig) => {
      const current = typeof weights[sig] === "number" ? weights[sig] : 1;
      weights[sig] = Math.max(DETECTOR_MIN_WEIGHT, current - DETECTOR_WEIGHT_STEP);
    });
    threshold = Math.min(DETECTOR_MAX_THRESHOLD, threshold + DETECTOR_THRESHOLD_STEP);
  }

  const samples = detector.samples + 1;
  await chrome.storage.local.set({
    policy_detector: { weights, threshold, samples, updated_at: new Date().toISOString() }
  });
};

const logAnalysisDebug = async ({ url, model, error, note, sample }) => {
  const stored = await chrome.storage.local.get("analysis_debug_log");
  const list = Array.isArray(stored.analysis_debug_log) ? stored.analysis_debug_log : [];
  const entry = {
    url: url || "", model: model || null, error: error || null,
    note: note || null, sample: sample || null, timestamp: new Date().toISOString()
  };
  const next = [entry, ...list].slice(0, 30);
  await chrome.storage.local.set({ analysis_debug_log: next });
};

// --------------------------------------------------------------------------
// Gemini prompt & schema
// --------------------------------------------------------------------------

const buildSchema = () => ({
  type: "object",
  additionalProperties: false,
  required: ["The_Gist", "Red_Flags", "Data_Practices", "Data_Rights", "The_Escape", "Readability", "Confidence", "Disclaimers"],
  properties: {
    The_Gist: { type: "string", maxLength: 500 },
    Red_Flags: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["clause_type", "severity", "title", "plain_english", "why_it_matters", "evidence_quotes"],
        properties: {
          clause_type: { type: "string", enum: ALL_CLAUSE_TYPES },
          severity: { type: "string", enum: SEVERITY_ENUM },
          title: { type: "string" },
          plain_english: { type: "string", maxLength: 200 },
          why_it_matters: { type: "string" },
          evidence_quotes: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } }
        }
      }
    },
    Data_Practices: {
      type: "object",
      additionalProperties: false,
      required: ["collects", "shares_with", "retention", "tracking_methods"],
      properties: {
        collects: { type: "array", items: { type: "string" } },
        shares_with: { type: "array", items: { type: "string" } },
        retention: { type: "string" },
        tracking_methods: { type: "array", items: { type: "string" } }
      }
    },
    Data_Rights: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["right", "available", "details", "evidence_quotes"],
        properties: {
          right: { type: "string" },
          available: { type: "boolean" },
          details: { type: "string" },
          evidence_quotes: { type: "array", maxItems: 2, items: { type: "string" } }
        }
      }
    },
    The_Escape: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["action", "difficulty", "details", "evidence_quotes"],
        properties: {
          action: { type: "string" },
          difficulty: { type: "string", enum: ["easy", "moderate", "hard", "unclear"] },
          details: { type: "string" },
          evidence_quotes: { type: "array", maxItems: 2, items: { type: "string" } }
        }
      }
    },
    Readability: {
      type: "object",
      additionalProperties: false,
      required: ["grade_level", "jargon_density", "estimated_read_minutes"],
      properties: {
        grade_level: { type: "string" },
        jargon_density: { type: "string", enum: ["low", "moderate", "high", "extreme"] },
        estimated_read_minutes: { type: "integer", minimum: 1 }
      }
    },
    Confidence: { type: "number", minimum: 0, maximum: 1 },
    Disclaimers: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } }
  }
});

const buildEndpoint = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const buildPrompt = ({ url, title, text }) => {
  return {
    system: [
      "You are ClearTerms AI, an expert legal-risk analyst that translates Terms of Service and Privacy Policies into plain English.",
      "",
      "ANALYSIS METHODOLOGY:",
      "1. Read the full policy text carefully.",
      "2. For each clause type in the schema enum, check whether the policy contains language matching that pattern.",
      "3. For each match, extract one or more EXACT verbatim quotes from the policy as evidence.",
      "4. Assign a severity (low / medium / high / critical) based on how consumer-hostile the clause is.",
      "5. Write plain_english: one sentence a non-lawyer would understand.",
      "6. Write why_it_matters: concrete real-world impact on the user.",
      "",
      "DATA PRACTICES: Identify what personal data is collected, who it is shared with, how long it is retained, and what tracking methods are used.",
      "",
      "DATA RIGHTS: Check for access, correction, deletion, portability, and opt-out rights. Mark available=true only if the policy explicitly grants them.",
      "",
      "THE ESCAPE: Identify concrete actions a user can take. Rate difficulty (easy/moderate/hard/unclear).",
      "",
      "READABILITY: Estimate reading grade level, jargon density, and minutes to read.",
      "",
      "RULES:",
      "- Output valid JSON matching the schema. No markdown, code fences, or commentary.",
      "- Only use the provided policy text. Never infer or speculate.",
      "- Every Red_Flag MUST have at least one evidence_quote that is an exact substring of the policy text.",
      "- Include disclaimers: 'Informational only — not legal advice.' and 'Evidence quotes are verbatim from the policy text.'",
      "- The_Gist: two sentences max, written for a non-expert.",
      "- Prefer fewer, higher-confidence items over exhaustive lists."
    ].join("\n"),
    user: [
      `URL: ${url}`,
      `Title: ${title}`,
      "",
      "--- BEGIN POLICY TEXT ---",
      text,
      "--- END POLICY TEXT ---"
    ].join("\n")
  };
};

const extractResponseText = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    return parts.map((part) => (typeof part?.text === "string" ? part.text : "")).join("\n").trim();
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text === "string") return text.trim();
  return "";
};

const truncateText = (text) => {
  if (!text) return "";
  if (text.length <= MAX_INPUT_CHARS) return text;
  const head = Math.floor(MAX_INPUT_CHARS * 0.7);
  const tail = MAX_INPUT_CHARS - head;
  return text.slice(0, head) + "\n... [TRUNCATED] ...\n" + text.slice(-tail);
};

const stripCodeFences = (text) => {
  if (!text) return "";
  return text.replace(/```[a-zA-Z]*\s*/g, "").replace(/```/g, "");
};

const findJsonObject = (text) => {
  if (!text) return "";
  const cleaned = stripCodeFences(text).trim();
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) return cleaned;
  let depth = 0;
  let start = -1;
  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (ch === "{") { if (depth === 0) start = i; depth += 1; }
    else if (ch === "}") { depth -= 1; if (depth === 0 && start !== -1) return cleaned.slice(start, i + 1); }
  }
  return "";
};

const sanitizeJsonCandidate = (candidate) => {
  return candidate
    .replace(/[\u0000-\u001F]/g, (m) => (m === "\n" ? "\n" : ""))
    .replace(/\u201c|\u201d/g, "\"")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]");
};

const loosenJsonCandidate = (candidate) => {
  let text = candidate;
  text = text.replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, "$1\"$2\":");
  text = text.replace(/:\s*'([^']*)'/g, ": \"$1\"");
  text = text.replace(/'([^']*)'\s*:/g, "\"$1\":");
  return text;
};

const tryParseJson = (text) => {
  const candidate = findJsonObject(text);
  if (!candidate) return null;
  try { return JSON.parse(candidate); } catch (err) {
    const sanitized = sanitizeJsonCandidate(candidate);
    try { return JSON.parse(sanitized); } catch (innerErr) {
      const loosened = loosenJsonCandidate(sanitized);
      try { return JSON.parse(loosened); } catch (finalErr) { return null; }
    }
  }
};

const ensureAnalysisShape = (analysis) => {
  const safeText = (value, fallback = "") => typeof value === "string" ? value : fallback;
  const clampArray = (arr) => (Array.isArray(arr) ? arr : []);

  const sanitizeEvidence = (quotes) =>
    clampArray(quotes).filter((q) => typeof q === "string" && q.trim().length > 0);

  const sanitizeFlags = clampArray(analysis?.Red_Flags)
    .map((flag) => {
      if (!flag || typeof flag !== "object") return null;
      return {
        clause_type: ALL_CLAUSE_TYPES.includes(flag.clause_type) ? flag.clause_type : "other",
        severity: SEVERITY_ENUM.includes(flag.severity) ? flag.severity : "medium",
        title: safeText(flag.title, "Unclear"),
        plain_english: safeText(flag.plain_english, ""),
        why_it_matters: safeText(flag.why_it_matters, ""),
        evidence_quotes: sanitizeEvidence(flag.evidence_quotes)
      };
    })
    .filter((f) => f && f.evidence_quotes.length > 0);

  const sanitizeRights = clampArray(analysis?.Data_Rights)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      return {
        right: safeText(item.right, "Unclear"),
        available: typeof item.available === "boolean" ? item.available : false,
        details: safeText(item.details, ""),
        evidence_quotes: sanitizeEvidence(item.evidence_quotes)
      };
    })
    .filter(Boolean);

  const sanitizeEscape = clampArray(analysis?.The_Escape)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      return {
        action: safeText(item.action, "Unclear"),
        difficulty: ["easy", "moderate", "hard", "unclear"].includes(item.difficulty) ? item.difficulty : "unclear",
        details: safeText(item.details, ""),
        evidence_quotes: sanitizeEvidence(item.evidence_quotes)
      };
    })
    .filter(Boolean);

  const confidenceRaw = typeof analysis?.Confidence === "number" ? analysis.Confidence : 0.3;
  const confidence = Math.min(1, Math.max(0, confidenceRaw));

  const disclaimersRaw = clampArray(analysis?.Disclaimers).filter((item) => typeof item === "string");
  const disclaimers = disclaimersRaw.length > 0 ? disclaimersRaw
    : ["Informational only — not legal advice.", "Quotes are verbatim from the policy text provided."];

  const gist = safeText(analysis?.The_Gist, "");
  const trimmedGist = gist.length > 500 ? gist.slice(0, 500) : gist;

  const dp = analysis?.Data_Practices;
  const dataPractices = {
    collects: clampArray(dp?.collects).filter((s) => typeof s === "string"),
    shares_with: clampArray(dp?.shares_with).filter((s) => typeof s === "string"),
    retention: safeText(dp?.retention, "Unclear"),
    tracking_methods: clampArray(dp?.tracking_methods).filter((s) => typeof s === "string")
  };

  const rd = analysis?.Readability;
  const readability = {
    grade_level: safeText(rd?.grade_level, "Unknown"),
    jargon_density: ["low", "moderate", "high", "extreme"].includes(rd?.jargon_density) ? rd.jargon_density : "moderate",
    estimated_read_minutes: typeof rd?.estimated_read_minutes === "number" ? rd.estimated_read_minutes : 15
  };

  return {
    The_Gist: trimmedGist,
    Red_Flags: sanitizeFlags,
    Data_Practices: dataPractices,
    Data_Rights: sanitizeRights,
    The_Escape: sanitizeEscape,
    Readability: readability,
    Confidence: confidence,
    Disclaimers: disclaimers
  };
};

const truncateForRepair = (text) => {
  if (!text) return "";
  if (text.length <= 12000) return text;
  return text.slice(0, 12000);
};

const buildRepairPrompt = (schema, rawText) => ({
  system: [
    "You are a JSON repair agent.",
    "Convert the model output into valid JSON that matches the schema exactly.",
    "Return only JSON. Use double quotes. No markdown. No code fences.",
    "If required fields are missing, use empty arrays or empty strings.",
    "Preserve any verbatim quotes."
  ].join(" "),
  user: ["Schema:", JSON.stringify(schema), "", "Model Output:", truncateForRepair(rawText)].join("\n")
});

const repairJsonWithGemini = async ({ apiKey, schema, rawText, model }) => {
  const prompt = buildRepairPrompt(schema, rawText);
  const payload = {
    system_instruction: { parts: [{ text: prompt.system }] },
    contents: [{ role: "user", parts: [{ text: prompt.user }] }],
    generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema, temperature: 0, maxOutputTokens: OUTPUT_TOKENS }
  };
  const response = await fetch(buildEndpoint(model), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(payload)
  });
  if (!response.ok) return null;
  const data = await response.json();
  const textOut = extractResponseText(data);
  if (!textOut) return null;
  return tryParseJson(textOut);
};

const callGemini = async ({ url, title, text }) => {
  const keyResult = await chrome.storage.local.get("gemini_api_key");
  const apiKey = keyResult.gemini_api_key;
  if (!apiKey) return { error: "NO_API_KEY" };

  const prompt = buildPrompt({ url, title, text: truncateText(text) });
  const schema = buildSchema();
  let lastError = "Unable to parse model output.";

  for (const model of MODEL_FALLBACKS) {
    const payload = {
      system_instruction: { parts: [{ text: prompt.system }] },
      contents: [{ role: "user", parts: [{ text: prompt.user }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema, temperature: 0.1, maxOutputTokens: OUTPUT_TOKENS }
    };

    const response = await fetch(buildEndpoint(model), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      lastError = errText || lastError;
      await logAnalysisDebug({ url, model, error: lastError, note: "model_error" });
      continue;
    }

    const data = await response.json();
    const textOut = extractResponseText(data);
    if (!textOut) {
      lastError = "Gemini returned no output.";
      await logAnalysisDebug({ url, model, error: lastError, note: "empty_output" });
      continue;
    }

    let analysis = tryParseJson(textOut);
    if (!analysis) {
      const repaired = await repairJsonWithGemini({ apiKey, schema, rawText: textOut, model });
      if (!repaired) {
        lastError = "Unable to parse model output.";
        await logAnalysisDebug({ url, model, error: lastError, note: "parse_error" });
        continue;
      }
      analysis = repaired;
    }

    const shaped = ensureAnalysisShape(analysis);
    if (!isMeaningfulAnalysis(shaped)) {
      lastError = "EMPTY_ANALYSIS";
      await logAnalysisDebug({ url, model, error: lastError, note: "empty_analysis" });
      continue;
    }

    const { score, level, breakdown } = computeRiskScore(shaped.Red_Flags);
    shaped.Risk_Score = score;
    shaped.Risk_Level = level;
    shaped.Risk_Breakdown = breakdown;

    return { analysis: shaped };
  }

  const fallback = buildFallbackAnalysis(text);
  const shapedFallback = ensureAnalysisShape(fallback);
  if (isMeaningfulAnalysis(shapedFallback)) {
    const { score, level, breakdown } = computeRiskScore(shapedFallback.Red_Flags);
    shapedFallback.Risk_Score = score;
    shapedFallback.Risk_Level = level;
    shapedFallback.Risk_Breakdown = breakdown;
    await logAnalysisDebug({ url, model: "heuristic", error: lastError, note: "fallback_used" });
    return { analysis: shapedFallback, fallback: true };
  }

  return { error: "PARSE_ERROR", message: lastError };
};

const getCachedAnalysis = async ({ domain, textHash }) => {
  const key = `analysis:${domain}`;
  const stored = await chrome.storage.local.get(key);
  const record = stored[key];
  const isSameText = record?.meta?.textHash === textHash;
  const isCurrentVersion = record?.meta?.analysis_version === ANALYSIS_VERSION;
  const isValid = isSameText && isCurrentVersion && isMeaningfulAnalysis(record?.analysis);
  if (isValid) return { analysis: record.analysis };
  if (record) await chrome.storage.local.remove(key);
  return { analysis: null };
};

const saveAnalysis = async ({ domain, analysis, meta }) => {
  await chrome.storage.local.set({
    [`analysis:${domain}`]: {
      analysis,
      meta: { ...meta, analysis_version: ANALYSIS_VERSION }
    }
  });
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "getAnalysis") {
    getCachedAnalysis(message.payload).then(sendResponse);
    return true;
  }

  if (message?.type === "analyzePolicy") {
    const payload = message.payload || {};
    const { url, title, text } = payload;
    let domain = "unknown";
    try { domain = new URL(url).hostname || "unknown"; } catch (err) { domain = "unknown"; }
    const textHash = payload.textHash || hashText(text || "");

    (async () => {
      const detectionMeta = {
        url, domain, isPolicyPage: payload.isPolicyPage,
        signals: payload.signals, textLength: text ? text.length : 0
      };

      if (!text || text.length < 400) {
        await logDetectionEvent({ ...detectionMeta, success: false, error: "NO_TEXT" });
        await updateDetectorModel({ signals: payload.signals, isPolicyPage: payload.isPolicyPage, outcome: "no_text" });
        sendResponse({ error: "NO_TEXT", message: "Policy text is too short or missing." });
        return;
      }

      const cached = await getCachedAnalysis({ domain, textHash });
      if (cached.analysis) {
        await logDetectionEvent({ ...detectionMeta, success: true, error: null });
        await updateDetectorModel({ signals: payload.signals, isPolicyPage: payload.isPolicyPage, outcome: "success" });
        sendResponse({ analysis: cached.analysis });
        return;
      }

      const result = await callGemini({ url, title, text });
      if (result.error) {
        await logDetectionEvent({ ...detectionMeta, success: false, error: result.error });
        sendResponse(result);
        return;
      }

      const meta = { url, title, analyzed_at: new Date().toISOString(), textHash };
      await saveAnalysis({ domain, analysis: result.analysis, meta });
      await logDetectionEvent({ ...detectionMeta, success: true, error: null });
      await updateDetectorModel({ signals: payload.signals, isPolicyPage: payload.isPolicyPage, outcome: "success" });
      sendResponse({ analysis: result.analysis });
    })();

    return true;
  }

  return false;
});
