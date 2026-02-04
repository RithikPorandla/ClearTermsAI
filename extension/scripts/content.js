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

const MAX_TEXT_LENGTH = 24000;

const hashText = (text) => {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};

const detectPolicyPage = () => {
  const signals = [];
  const url = location.href;
  const title = (document.title || "").toLowerCase();
  const ogTitle = (document.querySelector("meta[property='og:title']")?.content || "").toLowerCase();

  const urlMatch = URL_PATTERNS.some((re) => re.test(url));
  if (urlMatch) signals.push("url_pattern");

  const titleMatch = POLICY_KEYWORDS.some((kw) => title.includes(kw) || ogTitle.includes(kw));
  if (titleMatch) signals.push("title_keyword");

  const headings = Array.from(document.querySelectorAll("h1, h2"))
    .map((el) => el.innerText.toLowerCase())
    .join(" ");
  const headingMatch = POLICY_KEYWORDS.some((kw) => headings.includes(kw));
  if (headingMatch) signals.push("heading_keyword");

  const bodyText = document.body?.innerText?.toLowerCase() || "";
  const bodyMatch = POLICY_KEYWORDS.some((kw) => bodyText.includes(kw));
  if (bodyMatch) signals.push("body_keyword");

  let score = 0;
  if (urlMatch) score += 2;
  if (titleMatch) score += 2;
  if (headingMatch) score += 2;
  if (bodyMatch) score += 1;

  const isPolicyPage = score >= 4 || (urlMatch && (titleMatch || headingMatch)) || (titleMatch && headingMatch);
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
    text = clone.innerText || text;
  }

  text = text.replace(/\s+/g, " ").trim();
  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH) + " [TRUNCATED]";
  }
  return text;
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "collectPolicyData") {
    const { isPolicyPage, signals, score } = detectPolicyPage();
    const text = extractPolicyText();
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
  }
  return true;
});
