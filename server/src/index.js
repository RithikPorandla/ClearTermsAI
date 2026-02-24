import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import jwksRsa from "jwks-rsa";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const app = express();
const PORT = process.env.PORT || 8787;

app.use(helmet());
app.use(express.json({ limit: "2mb" }));

const allowedOrigins = (process.env.CORS_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const auth0Domain = process.env.AUTH0_DOMAIN;
const auth0Audience = process.env.AUTH0_AUDIENCE;
const apiKey = process.env.INTERNAL_API_KEY;

const jwksClient = auth0Domain
  ? jwksRsa({
      jwksUri: `https://${auth0Domain}/.well-known/jwks.json`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 3600000,
      rateLimit: true,
      jwksRequestsPerMinute: 10
    })
  : null;

const getKey = (header) => {
  return new Promise((resolve, reject) => {
    if (!jwksClient) {
      reject(new Error("JWKS client not configured"));
      return;
    }
    jwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) {
        reject(err);
        return;
      }
      const signingKey = key.getPublicKey();
      resolve(signingKey);
    });
  });
};

const authenticate = async (req, res, next) => {
  const providedKey = req.headers["x-api-key"];
  if (apiKey && providedKey === apiKey) {
    req.user = { sub: "api-key" };
    next();
    return;
  }

  if (!auth0Domain || !auth0Audience) {
    req.user = { sub: "anon" };
    next();
    return;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "missing_authorization" });
    return;
  }

  try {
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(
        token,
        async (header, callback) => {
          try {
            const key = await getKey(header);
            callback(null, key);
          } catch (err) {
            callback(err);
          }
        },
        {
          audience: auth0Audience,
          issuer: `https://${auth0Domain}/`,
          algorithms: ["RS256"]
        },
        (err, payload) => {
          if (err) reject(err);
          else resolve(payload);
        }
      );
    });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "invalid_token" });
  }
};

// --------------------------------------------------------------------------
// Multi-dimensional risk scoring algorithm
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

const RISK_LEVELS = [
  { min: 80, label: "Critical", color: "#991b1b" },
  { min: 60, label: "High", color: "#c0552e" },
  { min: 35, label: "Medium", color: "#c5883a" },
  { min: 15, label: "Low", color: "#2f7a6d" },
  { min: 0, label: "Minimal", color: "#166534" }
];

const SEVERITY_ENUM = ["low", "medium", "high", "critical"];

const severityWeight = (severity) => {
  switch (severity) {
    case "critical": return 1.4;
    case "high": return 1.15;
    case "medium": return 0.85;
    case "low": return 0.6;
    default: return 1.0;
  }
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

  const interactionBonus = computeInteractionBonus(breakdown);
  rawScore += interactionBonus;

  const score = Math.min(100, Math.max(0, rawScore));
  const level = RISK_LEVELS.find((r) => score >= r.min)?.label || "Minimal";

  return { score, level, breakdown };
};

const computeInteractionBonus = (breakdown) => {
  let bonus = 0;
  const cats = Object.keys(breakdown);

  if (cats.includes("dispute_resolution") && cats.includes("liability")) {
    bonus += 5;
  }
  if (cats.includes("data_practices") && cats.includes("content_rights")) {
    bonus += 4;
  }
  if (cats.includes("financial") && cats.includes("governance")) {
    bonus += 3;
  }
  if (cats.length >= 4) {
    bonus += 3;
  }

  return bonus;
};

// --------------------------------------------------------------------------
// Gemini prompt & schema
// --------------------------------------------------------------------------

const buildSchema = () => ({
  type: "object",
  additionalProperties: false,
  required: [
    "The_Gist",
    "Red_Flags",
    "Data_Practices",
    "Data_Rights",
    "The_Escape",
    "Readability",
    "Confidence",
    "Disclaimers"
  ],
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
          evidence_quotes: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: { type: "string" }
          }
        }
      }
    },
    Data_Practices: {
      type: "object",
      additionalProperties: false,
      required: ["collects", "shares_with", "retention", "tracking_methods"],
      properties: {
        collects: {
          type: "array",
          items: { type: "string" }
        },
        shares_with: {
          type: "array",
          items: { type: "string" }
        },
        retention: { type: "string" },
        tracking_methods: {
          type: "array",
          items: { type: "string" }
        }
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
        required: ["action", "difficulty", "details", "evidence_quotes"],
        properties: {
          action: { type: "string" },
          difficulty: { type: "string", enum: ["easy", "moderate", "hard", "unclear"] },
          details: { type: "string" },
          evidence_quotes: {
            type: "array",
            maxItems: 2,
            items: { type: "string" }
          }
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
      "You are ClearTerms AI, an expert legal-risk analyst that translates Terms of Service and Privacy Policies into plain English.",
      "",
      "ANALYSIS METHODOLOGY:",
      "1. Read the full policy text carefully.",
      "2. For each clause type in the schema enum, check whether the policy contains language matching that pattern.",
      "3. For each match, extract one or more EXACT verbatim quotes from the policy as evidence. Quotes must be copy-paste substrings — do not paraphrase.",
      "4. Assign a severity (low / medium / high / critical) based on how consumer-hostile the clause is relative to industry norms.",
      "5. Write a plain_english field: one sentence a non-lawyer would understand.",
      "6. Write why_it_matters: concrete real-world impact on the user.",
      "",
      "DATA PRACTICES: Identify what personal data is collected, who it is shared with, how long it is retained, and what tracking methods are used (cookies, pixels, fingerprinting, etc.).",
      "",
      "DATA RIGHTS: Check for access, correction, deletion, portability, and opt-out rights. Mark available=true only if the policy explicitly grants them.",
      "",
      "THE ESCAPE: Identify concrete actions a user can take — account deletion, opt-out of data sale, cancellation steps. Rate difficulty.",
      "",
      "READABILITY: Estimate the reading grade level (e.g. 'College', 'Graduate'), jargon density, and how many minutes it would take an average reader.",
      "",
      "RULES:",
      "- Output MUST be valid JSON matching the provided schema. No markdown, no code fences, no commentary.",
      "- Only use the provided policy text. Never infer or speculate. If information is missing, say 'Unclear' or leave arrays empty.",
      "- Every Red_Flag MUST have at least one evidence_quote that is an exact substring of the policy text.",
      "- Do NOT include a Red_Flag if you cannot find a verbatim quote to support it.",
      "- Include disclaimers: 'Informational only — not legal advice.' and 'Evidence quotes are verbatim from the policy text.'",
      "- The_Gist should be two sentences maximum, written for a non-expert.",
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
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text === "string") return text.trim();
  return "";
};

const callGemini = async ({ url, title, text }) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return { error: "NO_GEMINI_KEY" };
  }

  const prompt = buildPrompt({ url, title, text });
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
      temperature: 0.15
    }
  };

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    return { error: "GEMINI_ERROR", message: errText };
  }

  const data = await response.json();
  const textOut = extractResponseText(data);
  if (!textOut) {
    return { error: "EMPTY_RESPONSE", message: "Gemini returned no output." };
  }

  let analysis;
  try {
    analysis = JSON.parse(textOut);
  } catch (err) {
    return { error: "PARSE_ERROR", message: "Unable to parse model output." };
  }

  const { score, level, breakdown } = computeRiskScore(analysis.Red_Flags);
  analysis.Risk_Score = score;
  analysis.Risk_Level = level;
  analysis.Risk_Breakdown = breakdown;

  return { analysis };
};

const hashText = (text) => {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};

const analyzeSchema = z.object({
  url: z.string().url(),
  title: z.string().optional().default(""),
  text: z.string().min(400),
  store_policy: z.boolean().optional().default(false)
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", version: "2.0.0" });
});

app.post("/analyze-policy", authenticate, async (req, res) => {
  const parsed = analyzeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
    return;
  }

  if (!supabase) {
    res.status(500).json({ error: "supabase_not_configured" });
    return;
  }

  const { url, title, text, store_policy } = parsed.data;
  const domain = new URL(url).hostname;
  const textHash = hashText(text);

  const { analysis, error, message } = await callGemini({ url, title, text });
  if (error) {
    res.status(500).json({ error, message });
    return;
  }

  const reportId = crypto.randomUUID();
  const record = {
    id: reportId,
    user_id: req.user?.sub || "anon",
    domain,
    url,
    title,
    text_hash: textHash,
    policy_text: store_policy ? text : null,
    analysis,
    created_at: new Date().toISOString()
  };

  const { error: insertError } = await supabase.from("policy_reports").insert(record);
  if (insertError) {
    res.status(500).json({ error: "db_insert_failed", details: insertError.message });
    return;
  }

  res.json({ report_id: reportId, analysis });
});

app.get("/reports", authenticate, async (req, res) => {
  if (!supabase) {
    res.status(500).json({ error: "supabase_not_configured" });
    return;
  }

  const userId = req.user?.sub || "anon";
  const { data, error } = await supabase
    .from("policy_reports")
    .select("id, domain, url, title, analysis, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    res.status(500).json({ error: "db_fetch_failed", details: error.message });
    return;
  }

  res.json({ reports: data });
});

app.get("/reports/:id", authenticate, async (req, res) => {
  if (!supabase) {
    res.status(500).json({ error: "supabase_not_configured" });
    return;
  }

  const userId = req.user?.sub || "anon";
  const { data, error } = await supabase
    .from("policy_reports")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", userId)
    .single();

  if (error) {
    res.status(404).json({ error: "report_not_found" });
    return;
  }

  res.json({ report: data });
});

app.listen(PORT, () => {
  console.log(`ClearTerms API v2 running on port ${PORT}`);
});
