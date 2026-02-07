const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const MODEL_ID = "gemini-2.5-flash";
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

const hashText = (text) => {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
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

const buildPrompt = ({ url, title, text }) => {
  return {
    system: [
      "You are ClearTerms AI, a real-time legal risk translator.",
      "Only use the provided policy text. Do not infer or speculate.",
      "Output MUST be valid JSON that matches the schema exactly.",
      "Process: identify each clause type, extract exact verbatim quotes, then explain why it matters.",
      "Quotes must be exact substrings of the policy text. If you cannot quote it, mark as Unclear and leave evidence_quotes empty.",
      "Red_Flags items must include at least one evidence quote. Do not include a red flag without evidence.",
      "Data_Rights and The_Escape should only include items with evidence quotes; otherwise leave arrays empty.",
      "Include the disclaimers: 'Informational only — not legal advice.' and 'Quotes are verbatim from the policy text provided.'",
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
          "Informational only — not legal advice.",
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

const repairJsonWithGemini = async ({ apiKey, schema, rawText }) => {
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

  const response = await fetch(GEMINI_ENDPOINT, {
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
      temperature: 0.2,
      maxOutputTokens: OUTPUT_TOKENS
    }
  };

  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    return { error: "GEMINI_ERROR", message: errText };
  }

  const data = await response.json();
  const textOut = extractResponseText(data);
  if (!textOut) {
    return { error: "EMPTY_RESPONSE", message: "Gemini returned no output." };
  }

  let analysis = tryParseJson(textOut);
  if (!analysis) {
    const repaired = await repairJsonWithGemini({
      apiKey,
      schema,
      rawText: textOut
    });
    if (!repaired) {
      return { error: "PARSE_ERROR", message: "Unable to parse model output." };
    }
    analysis = repaired;
  }

  const shaped = ensureAnalysisShape(analysis);
  return { analysis: normalizeAnalysis(shaped) };
};

const getCachedAnalysis = async ({ domain, textHash }) => {
  const stored = await chrome.storage.local.get(`analysis:${domain}`);
  const record = stored[`analysis:${domain}`];
  if (record?.meta?.textHash === textHash) {
    return { analysis: record.analysis };
  }
  return { analysis: null };
};

const saveAnalysis = async ({ domain, analysis, meta }) => {
  await chrome.storage.local.set({
    [`analysis:${domain}`]: {
      analysis,
      meta
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
      if (!text || text.length < 400) {
        sendResponse({ error: "NO_TEXT", message: "Policy text is too short or missing." });
        return;
      }

      const cached = await getCachedAnalysis({ domain, textHash });
      if (cached.analysis) {
        sendResponse({ analysis: cached.analysis });
        return;
      }

      const result = await callGemini({ url, title, text });
      if (result.error) {
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
      sendResponse({ analysis: result.analysis });
    })();

    return true;
  }

  return false;
});
