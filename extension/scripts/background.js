const MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"];
const ANALYSIS_VERSION = 2;
const MAX_INPUT_CHARS = 12000;
const OUTPUT_TOKENS = 700;

const RISK_RULES = {
  forced_arbitration_class_waiver: 20,
  broad_user_content_license: 15,
  data_sale_or_ad_sharing: 15,
  ai_training_on_user_data: 15,
  unilateral_policy_changes: 10,
  auto_renewal_or_difficult_cancellation: 10,
  no_refunds: 8,
  broad_liability_disclaimers: 7
};

const RISK_LEVELS = [
  { min: 75, label: "Extreme" },
  { min: 50, label: "High" },
  { min: 25, label: "Medium" },
  { min: 0, label: "Low" }
];

const CLAUSE_TYPES = [
  "forced_arbitration_class_waiver",
  "broad_user_content_license",
  "data_sale_or_ad_sharing",
  "ai_training_on_user_data",
  "unilateral_policy_changes",
  "auto_renewal_or_difficult_cancellation",
  "no_refunds",
  "broad_liability_disclaimers",
  "other"
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
  const weights = {
    ...base.weights,
    ...(detector?.weights || {})
  };
  const threshold =
    typeof detector?.threshold === "number" ? detector.threshold : base.threshold;
  const samples = typeof detector?.samples === "number" ? detector.samples : base.samples;
  return { weights, threshold, samples };
};

const logDetectionEvent = async ({ url, domain, isPolicyPage, signals, textLength, success, error }) => {
  const stored = await chrome.storage.local.get("policy_detection_log");
  const list = Array.isArray(stored.policy_detection_log)
    ? stored.policy_detection_log
    : [];
  const entry = {
    url,
    domain,
    isPolicyPage: Boolean(isPolicyPage),
    signals: Array.isArray(signals) ? signals : [],
    textLength: Number.isFinite(textLength) ? textLength : 0,
    success: Boolean(success),
    error: error || null,
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
    if (!isPolicyPage) {
      threshold = Math.max(DETECTOR_MIN_THRESHOLD, threshold - DETECTOR_THRESHOLD_STEP);
    }
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
    policy_detector: {
      weights,
      threshold,
      samples,
      updated_at: new Date().toISOString()
    }
  });
};

const normalizeAnalysis = (analysis) => {
  const flags = Array.isArray(analysis.Red_Flags) ? analysis.Red_Flags : [];
  const unique = new Set();
  let score = 0;

  flags.forEach((flag) => {
    if (!flag || !flag.clause_type) return;
    const type = flag.clause_type;
    if (!RISK_RULES[type] || unique.has(type)) return;
    unique.add(type);
    score += RISK_RULES[type];
  });

  score = Math.min(100, score);
  const level = RISK_LEVELS.find((entry) => score >= entry.min)?.label || "Low";

  return {
    ...analysis,
    Risk_Score: score,
    Risk_Level: level
  };
};

const buildSchema = () => ({
  type: "object",
  additionalProperties: false,
  required: [
    "Risk_Score",
    "Risk_Level",
    "The_Gist",
    "Red_Flags",
    "Data_Rights",
    "The_Escape",
    "Confidence",
    "Disclaimers"
  ],
  properties: {
    Risk_Score: { type: "integer", minimum: 0, maximum: 100 },
    Risk_Level: { type: "string", enum: ["Low", "Medium", "High", "Extreme"] },
    The_Gist: { type: "string", maxLength: 400 },
    Red_Flags: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["clause_type", "title", "why_it_matters", "evidence_quotes"],
        properties: {
          clause_type: { type: "string", enum: CLAUSE_TYPES },
          title: { type: "string" },
          why_it_matters: { type: "string" },
          evidence_quotes: {
            type: "array",
            maxItems: 2,
            items: { type: "string" }
          }
        }
      }
    },
    Data_Rights: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["right", "details", "evidence_quotes"],
        properties: {
          right: { type: "string" },
          details: { type: "string" },
          evidence_quotes: {
            type: "array",
            maxItems: 2,
            items: { type: "string" }
          }
        }
      }
    },
    The_Escape: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["step", "details", "evidence_quotes"],
        properties: {
          step: { type: "string" },
          details: { type: "string" },
          evidence_quotes: {
            type: "array",
            maxItems: 2,
            items: { type: "string" }
          }
        }
      }
    },
    Confidence: { type: "number", minimum: 0, maximum: 1 },
    Disclaimers: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: { type: "string" }
    }
  }
});

const buildEndpoint = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const buildPrompt = ({ url, title, text }) => {
  return {
    system: [
      "You are ClearTerms AI, a real-time legal risk translator.",
      "Only use the provided policy text. Do not infer or speculate.",
      "Output MUST be valid JSON that matches the schema exactly.",
      "Return ONLY JSON. Do not include markdown, code fences, or commentary.",
      "Process: identify each clause type, extract exact verbatim quotes, then explain why it matters.",
      "Quotes must be exact substrings of the policy text. If you cannot quote it, mark as Unclear and leave evidence_quotes empty.",
      "Red_Flags items must include at least one evidence quote. Do not include a red flag without evidence.",
      "Data_Rights and The_Escape should only include items with evidence quotes; otherwise leave arrays empty.",
      "Include the disclaimers: 'Informational only - not legal advice.' and 'Quotes are verbatim from the policy text provided.'",
      "Keep The_Gist to at most two sentences and avoid legal advice.",
      "Be concise. Prefer fewer, higher-confidence items over exhaustive lists."
    ].join(" "),
    user: [
      `URL: ${url}`,
      `Title: ${title}`,
      "Policy Text:",
      text
    ].join("\n")
  };
};

const extractResponseText = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    return parts
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("\n")
      .trim();
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
    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        return cleaned.slice(start, i + 1);
      }
    }
  }
  return "";
};

const sanitizeJsonCandidate = (candidate) => {
  return candidate
    .replace(/\u0000/g, "")
    .replace(/\u201c|\u201d/g, "\"")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]");
};

const tryParseJson = (text) => {
  const candidate = findJsonObject(text);
  if (!candidate) return null;

  try {
    return JSON.parse(candidate);
  } catch (err) {
    const sanitized = sanitizeJsonCandidate(candidate);
    try {
      return JSON.parse(sanitized);
    } catch (innerErr) {
      return null;
    }
  }
};

const ensureAnalysisShape = (analysis) => {
  const safeText = (value, fallback = "") =>
    typeof value === "string" ? value : fallback;

  const clampArray = (arr) => (Array.isArray(arr) ? arr : []);

  const sanitizeEvidence = (quotes) =>
    clampArray(quotes).filter((q) => typeof q === "string" && q.trim().length > 0);

  const sanitizeFlags = clampArray(analysis?.Red_Flags)
    .map((flag) => {
      if (!flag || typeof flag !== "object") return null;
      return {
        clause_type: CLAUSE_TYPES.includes(flag.clause_type)
          ? flag.clause_type
          : "other",
        title: safeText(flag.title, "Unclear"),
        why_it_matters: safeText(flag.why_it_matters, ""),
        evidence_quotes: sanitizeEvidence(flag.evidence_quotes)
      };
    })
    .filter((flag) => flag && flag.evidence_quotes.length > 0);

  const sanitizeRights = clampArray(analysis?.Data_Rights)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      return {
        right: safeText(item.right, "Unclear"),
        details: safeText(item.details, ""),
        evidence_quotes: sanitizeEvidence(item.evidence_quotes)
      };
    })
    .filter((item) => item && item.evidence_quotes.length > 0);

  const sanitizeEscape = clampArray(analysis?.The_Escape)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      return {
        step: safeText(item.step, "Unclear"),
        details: safeText(item.details, ""),
        evidence_quotes: sanitizeEvidence(item.evidence_quotes)
      };
    })
    .filter((item) => item && item.evidence_quotes.length > 0);

  const confidenceRaw = typeof analysis?.Confidence === "number" ? analysis.Confidence : 0.3;
  const confidence = Math.min(1, Math.max(0, confidenceRaw));

  const disclaimersRaw = clampArray(analysis?.Disclaimers).filter(
    (item) => typeof item === "string"
  );
  const disclaimers =
    disclaimersRaw.length > 0
      ? disclaimersRaw
      : [
          "Informational only - not legal advice.",
          "Quotes are verbatim from the policy text provided."
        ];

  const gist = safeText(analysis?.The_Gist, "");
  const trimmedGist = gist.length > 400 ? gist.slice(0, 400) : gist;

  return {
    Risk_Score: typeof analysis?.Risk_Score === "number" ? analysis.Risk_Score : 0,
    Risk_Level: safeText(analysis?.Risk_Level, "Low"),
    The_Gist: trimmedGist,
    Red_Flags: sanitizeFlags,
    Data_Rights: sanitizeRights,
    The_Escape: sanitizeEscape,
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
    "Return only JSON. No markdown. No code fences. No commentary.",
    "If required fields are missing, use empty arrays or empty strings, but do not invent facts.",
    "Preserve any verbatim quotes that already exist in the output."
  ].join(" "),
  user: [
    "Schema:",
    JSON.stringify(schema),
    "",
    "Model Output:",
    truncateForRepair(rawText)
  ].join("\n")
});

const repairJsonWithGemini = async ({ apiKey, schema, rawText, model }) => {
  const prompt = buildRepairPrompt(schema, rawText);
  const payload = {
    system_instruction: {
      parts: [{ text: prompt.system }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt.user }]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: schema,
      temperature: 0,
      maxOutputTokens: OUTPUT_TOKENS
    }
  };

  const response = await fetch(buildEndpoint(model), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const textOut = extractResponseText(data);
  if (!textOut) return null;
  return tryParseJson(textOut);
};

const callGemini = async ({ url, title, text }) => {
  const keyResult = await chrome.storage.local.get("gemini_api_key");
  const apiKey = keyResult.gemini_api_key;
  if (!apiKey) {
    return { error: "NO_API_KEY" };
  }

  const prompt = buildPrompt({ url, title, text: truncateText(text) });
  const schema = buildSchema();
  let lastError = "Unable to parse model output.";

  for (const model of MODEL_FALLBACKS) {
    const payload = {
      system_instruction: {
        parts: [{ text: prompt.system }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt.user }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: schema,
        temperature: 0.1,
        maxOutputTokens: OUTPUT_TOKENS
      }
    };

    const response = await fetch(buildEndpoint(model), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      lastError = errText || lastError;
      continue;
    }

    const data = await response.json();
    const textOut = extractResponseText(data);
    if (!textOut) {
      lastError = "Gemini returned no output.";
      continue;
    }

    let analysis = tryParseJson(textOut);
    if (!analysis) {
      const repaired = await repairJsonWithGemini({
        apiKey,
        schema,
        rawText: textOut,
        model
      });
      if (!repaired) {
        lastError = "Unable to parse model output.";
        continue;
      }
      analysis = repaired;
    }

    const shaped = ensureAnalysisShape(analysis);
    if (!isMeaningfulAnalysis(shaped)) {
      lastError = "EMPTY_ANALYSIS";
      continue;
    }
    return { analysis: normalizeAnalysis(shaped) };
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

  if (isValid) {
    return { analysis: record.analysis };
  }

  if (record) {
    await chrome.storage.local.remove(key);
  }

  return { analysis: null };
};

const saveAnalysis = async ({ domain, analysis, meta }) => {
  await chrome.storage.local.set({
    [`analysis:${domain}`]: {
      analysis,
      meta: {
        ...meta,
        analysis_version: ANALYSIS_VERSION
      }
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
    try {
      domain = new URL(url).hostname || "unknown";
    } catch (err) {
      domain = "unknown";
    }
    const textHash = payload.textHash || hashText(text || "");

    (async () => {
      const detectionMeta = {
        url,
        domain,
        isPolicyPage: payload.isPolicyPage,
        signals: payload.signals,
        textLength: text ? text.length : 0
      };

      if (!text || text.length < 400) {
        await logDetectionEvent({
          ...detectionMeta,
          success: false,
          error: "NO_TEXT"
        });
        await updateDetectorModel({
          signals: payload.signals,
          isPolicyPage: payload.isPolicyPage,
          outcome: "no_text"
        });
        sendResponse({ error: "NO_TEXT", message: "Policy text is too short or missing." });
        return;
      }

      const cached = await getCachedAnalysis({ domain, textHash });
      if (cached.analysis) {
        await logDetectionEvent({
          ...detectionMeta,
          success: true,
          error: null
        });
        await updateDetectorModel({
          signals: payload.signals,
          isPolicyPage: payload.isPolicyPage,
          outcome: "success"
        });
        sendResponse({ analysis: cached.analysis });
        return;
      }

      const result = await callGemini({ url, title, text });
      if (result.error) {
        await logDetectionEvent({
          ...detectionMeta,
          success: false,
          error: result.error
        });
        sendResponse(result);
        return;
      }

      const meta = {
        url,
        title,
        analyzed_at: new Date().toISOString(),
        textHash
      };

      await saveAnalysis({ domain, analysis: result.analysis, meta });
      await logDetectionEvent({
        ...detectionMeta,
        success: true,
        error: null
      });
      await updateDetectorModel({
        signals: payload.signals,
        isPolicyPage: payload.isPolicyPage,
        outcome: "success"
      });
      sendResponse({ analysis: result.analysis });
    })();

    return true;
  }

  return false;
});
