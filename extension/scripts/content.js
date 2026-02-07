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
    "nav",
    "footer",
    "header",
    "aside",
    "form",
    "button",
    "input",
    "select",
    "textarea",
    "[role='navigation']",
    "[aria-label*='cookie' i]",
    ".cookie",
    ".cookies",
    "#cookie",
    "#cookies",
    ".banner",
    ".advert",
    ".ad",
    "script",
    "style"
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
