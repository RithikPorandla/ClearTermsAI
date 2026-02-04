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
      maxItems: 10,
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
            maxItems: 3,
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
            maxItems: 3,
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
            maxItems: 3,
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
      "Output MUST be valid JSON that matches the schema.",
      "All high-risk claims must include verbatim evidence quotes from the policy text.",
      "If information is missing, write 'Unclear' and leave evidence_quotes empty arrays.",
      "Include the disclaimers: 'Informational only — not legal advice.' and 'Quotes are verbatim from the policy text provided.'",
      "Keep The_Gist to at most two sentences."
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
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text === "string") return text.trim();
  return "";
};

const callGemini = async ({ url, title, text }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
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
      temperature: 0.2
    }
  };

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
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

  return { analysis: normalizeAnalysis(analysis) };
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
  res.json({ status: "ok" });
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
  console.log(`ClearTerms API running on port ${PORT}`);
});
