"use client";

import { useMemo, useState } from "react";

type ExampleKey = "arbitration" | "data_sale" | "auto_renewal";

type Flag = {
  clause_type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  plain_english: string;
  quote: string;
};

type ExampleData = {
  label: string;
  score: number;
  level: string;
  gist: string;
  flags: Flag[];
  data_practices: string[];
  readability: { grade: string; minutes: number; jargon: string };
};

const EXAMPLES: Record<ExampleKey, ExampleData> = {
  arbitration: {
    label: "Social media ToS",
    score: 74,
    level: "High",
    gist: "This policy forces disputes into private arbitration and waives your right to class action. Your content is licensed broadly for the platform's use.",
    flags: [
      {
        clause_type: "forced_arbitration_class_waiver",
        severity: "critical",
        title: "Forced arbitration & class action waiver",
        plain_english: "You can't sue them in court or join a class action.",
        quote: "You agree to resolve disputes by binding arbitration and waive any right to participate in a class action…"
      },
      {
        clause_type: "broad_user_content_license",
        severity: "high",
        title: "Broad content license",
        plain_english: "They can use your posts and photos however they want, forever.",
        quote: "You grant us a worldwide, non-exclusive, royalty-free, transferable license to use, reproduce, modify, and distribute your content…"
      },
      {
        clause_type: "data_sale_or_ad_sharing",
        severity: "high",
        title: "Data shared with advertisers",
        plain_english: "Your activity data is shared with ad partners for targeting.",
        quote: "We may share information about your activity with advertising partners to deliver personalized ads…"
      },
      {
        clause_type: "unilateral_policy_changes",
        severity: "medium",
        title: "Terms can change without notice",
        plain_english: "They can change the rules and continued use means you agree.",
        quote: "We may modify these Terms at any time. Continued use constitutes acceptance…"
      }
    ],
    data_practices: ["Activity data", "Device info", "Location", "Third-party advertisers"],
    readability: { grade: "College", minutes: 35, jargon: "high" }
  },
  data_sale: {
    label: "Data broker privacy policy",
    score: 88,
    level: "Critical",
    gist: "This policy allows extensive data collection and sharing with third parties for advertising. Opt-out mechanisms are buried and difficult to find.",
    flags: [
      {
        clause_type: "data_sale_or_ad_sharing",
        severity: "critical",
        title: "Data sold to third parties",
        plain_english: "Your personal data is sold to advertisers and data brokers.",
        quote: "We may sell personal data with third-party partners for targeted advertising and marketing purposes…"
      },
      {
        clause_type: "ai_training_on_user_data",
        severity: "high",
        title: "AI training on your data",
        plain_english: "Your data is used to train their machine learning models.",
        quote: "We may use your data to train and improve our machine learning models and AI systems…"
      },
      {
        clause_type: "cross_border_data_transfer",
        severity: "high",
        title: "Cross-border data transfers",
        plain_english: "Your data is sent to countries with weaker privacy laws.",
        quote: "Your information may be transferred to and processed in countries other than your country of residence…"
      },
      {
        clause_type: "broad_liability_disclaimers",
        severity: "medium",
        title: "No liability for data breaches",
        plain_english: "They aren't responsible if your data gets leaked.",
        quote: "We shall not be liable for any unauthorized access to or alteration of your data…"
      }
    ],
    data_practices: ["Personal identifiers", "Browsing history", "Purchase history", "Data brokers", "Ad networks"],
    readability: { grade: "Graduate", minutes: 42, jargon: "extreme" }
  },
  auto_renewal: {
    label: "SaaS subscription terms",
    score: 52,
    level: "Medium",
    gist: "Subscription auto-renews and refunds are limited. Cancellation must happen before the renewal date or you'll be charged again.",
    flags: [
      {
        clause_type: "auto_renewal_or_difficult_cancellation",
        severity: "high",
        title: "Auto-renewal with difficult cancellation",
        plain_english: "Your subscription renews automatically and cancellation is tricky.",
        quote: "Your subscription will automatically renew unless canceled at least 30 days before the renewal date…"
      },
      {
        clause_type: "no_refunds",
        severity: "medium",
        title: "No refunds policy",
        plain_english: "You can't get your money back once charged.",
        quote: "All fees are non-refundable except where required by applicable law…"
      },
      {
        clause_type: "price_change_without_consent",
        severity: "medium",
        title: "Price changes without consent",
        plain_english: "They can raise the price and charge you more at renewal.",
        quote: "We reserve the right to change subscription pricing. Updated pricing takes effect at the next renewal period…"
      }
    ],
    data_practices: ["Email", "Payment info", "Usage analytics"],
    readability: { grade: "College", minutes: 18, jargon: "moderate" }
  }
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#d97706",
  low: "#059669"
};

const LEVEL_COLORS: Record<string, string> = {
  Critical: "#991b1b",
  High: "#c0552e",
  Medium: "#d97706",
  Low: "#059669",
  Minimal: "#166534"
};

export default function Page() {
  const [example, setExample] = useState<ExampleKey>("arbitration");
  const data = useMemo(() => EXAMPLES[example], [example]);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-neutral-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-[11px] font-bold text-white tracking-wider">CT</div>
            <span className="text-[15px] font-semibold tracking-tight text-neutral-900">ClearTerms AI</span>
          </div>
          <nav className="flex items-center gap-6 text-[13px]">
            <a href="#how" className="text-neutral-500 transition hover:text-neutral-900">How it works</a>
            <a href="#demo" className="text-neutral-500 transition hover:text-neutral-900">Live demo</a>
            <a href="#faq" className="text-neutral-500 transition hover:text-neutral-900">FAQ</a>
            <a
              href="#install"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-neutral-800"
            >
              Get the extension
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <section className="pb-20 pt-20 md:pt-28">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[12px] font-medium text-neutral-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Open source · Privacy-first · Evidence-based
            </div>
            <h1 className="text-[40px] font-bold leading-[1.1] tracking-tight text-neutral-900 md:text-[52px]">
              Know what you're<br />agreeing to.
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-[17px] leading-relaxed text-neutral-500">
              ClearTerms AI reads Terms of Service and Privacy Policies so you don't have to. Get a risk score with evidence quotes in seconds.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#install"
                className="rounded-xl bg-neutral-900 px-6 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-neutral-800 hover:shadow-md"
              >
                Add to Chrome — Free
              </a>
              <a
                href="#demo"
                className="rounded-xl border border-neutral-200 bg-white px-6 py-3 text-[15px] font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
              >
                See it in action ↓
              </a>
            </div>
          </div>

          {/* Floating panel mockup */}
          <div className="mx-auto mt-16 max-w-sm">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl shadow-neutral-200/50">
              <div className="flex items-center gap-2.5 pb-4 border-b border-neutral-100">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-[9px] font-bold text-white tracking-wider">CT</div>
                <div>
                  <div className="text-[13px] font-semibold text-neutral-900">ClearTerms AI</div>
                  <div className="text-[10px] text-neutral-400">Policy Risk Scanner</div>
                </div>
              </div>
              <div className="flex justify-center py-5">
                <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-[3px] border-orange-500/80">
                  <div className="text-2xl font-extrabold text-orange-600">74</div>
                  <div className="text-[9px] font-medium uppercase tracking-widest text-neutral-400">High</div>
                </div>
              </div>
              <p className="text-center text-[12px] leading-relaxed text-neutral-500 px-2">
                Forces disputes into private arbitration. Your content is licensed broadly for platform use.
              </p>
              <div className="mt-4 space-y-2">
                {[
                  { color: "#dc2626", title: "Forced arbitration", desc: "Can't sue in court" },
                  { color: "#ea580c", title: "Broad content license", desc: "They can reuse your posts" },
                  { color: "#ea580c", title: "Data shared with advertisers", desc: "Activity shared with ad partners" }
                ].map((f) => (
                  <div key={f.title} className="flex items-start gap-2.5 rounded-lg bg-neutral-50 px-3 py-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: f.color }} />
                    <div>
                      <div className="text-[12px] font-semibold text-neutral-800">{f.title}</div>
                      <div className="text-[11px] text-neutral-400">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-neutral-900 py-2.5 text-center text-[12px] font-semibold text-white">Analyze Policy</div>
                <div className="rounded-lg border border-neutral-200 bg-white py-2.5 text-center text-[12px] font-medium text-neutral-700">Full Report →</div>
              </div>
              <div className="mt-3 text-center text-[9px] text-neutral-300">Not legal advice · Evidence-first · Local-first</div>
            </div>
          </div>
        </section>

        {/* Trust bar */}
        <section className="border-y border-neutral-200/60 py-8">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[12px] font-medium uppercase tracking-wider text-neutral-400">
            <span>Evidence-based analysis</span>
            <span className="hidden sm:inline text-neutral-200">·</span>
            <span>Multi-dimensional risk scoring</span>
            <span className="hidden sm:inline text-neutral-200">·</span>
            <span>Works on any website</span>
            <span className="hidden sm:inline text-neutral-200">·</span>
            <span>Your API key stays local</span>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-20">
          <div className="text-center">
            <h2 className="text-[28px] font-bold tracking-tight text-neutral-900">Three steps. Thirty seconds.</h2>
            <p className="mt-2 text-[15px] text-neutral-500">From confusion to clarity before you click Accept.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { step: "01", title: "Visit any policy page", desc: "The extension auto-detects Terms of Service and Privacy Policy pages using URL patterns, headings, and page content analysis." },
              { step: "02", title: "Get instant analysis", desc: "Gemini AI extracts risk clauses with verbatim evidence quotes. A multi-dimensional algorithm computes severity across 6 risk categories." },
              { step: "03", title: "Make informed decisions", desc: "See your risk score, data practices, readability grade, and concrete opt-out steps — all without leaving the page." }
            ].map((item) => (
              <div key={item.step} className="rounded-2xl border border-neutral-200 bg-white p-6">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-[13px] font-bold text-neutral-400">
                  {item.step}
                </div>
                <h3 className="text-[15px] font-semibold text-neutral-900">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What it catches */}
        <section className="py-16">
          <h2 className="text-[28px] font-bold tracking-tight text-neutral-900">16 clause types. 6 risk categories.</h2>
          <p className="mt-2 text-[15px] text-neutral-500">Every red flag is backed by an exact quote from the policy text.</p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {[
              { cat: "Dispute Resolution", items: ["Forced arbitration", "Class action waiver", "Jurisdiction limits"] },
              { cat: "Data Practices", items: ["Data sale to third parties", "AI training on your data", "Cross-border transfers", "Biometric collection"] },
              { cat: "Content Rights", items: ["Broad content license", "Content monetization"] },
              { cat: "Financial", items: ["Auto-renewal traps", "No refunds", "Hidden price changes"] },
              { cat: "Liability", items: ["Broad disclaimers", "Indemnification clauses"] },
              { cat: "Governance", items: ["Unilateral policy changes", "Account termination", "Survivability of unfair terms"] }
            ].map((cat) => (
              <div key={cat.cat} className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-3">{cat.cat}</div>
                <ul className="space-y-1.5">
                  {cat.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[13px] text-neutral-600">
                      <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-neutral-300" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Live demo */}
        <section id="demo" className="py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[28px] font-bold tracking-tight text-neutral-900">Live demo</h2>
              <p className="mt-1 text-[15px] text-neutral-500">Pick a policy type and see the analysis update.</p>
            </div>
            <div className="flex items-center gap-2">
              {(Object.entries(EXAMPLES) as [ExampleKey, ExampleData][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setExample(key)}
                  className={`rounded-lg px-3.5 py-2 text-[13px] font-medium transition ${
                    example === key
                      ? "bg-neutral-900 text-white"
                      : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_340px]">
            {/* Left: analysis */}
            <div className="space-y-4">
              {/* Score + gist */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6">
                <div className="flex items-start gap-5">
                  <div
                    className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-full border-[3px]"
                    style={{ borderColor: LEVEL_COLORS[data.level] || "#666" }}
                  >
                    <div className="text-[28px] font-extrabold" style={{ color: LEVEL_COLORS[data.level] || "#666" }}>
                      {data.score}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">{data.level}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Executive Summary</div>
                    <p className="text-[14px] leading-relaxed text-neutral-700">{data.gist}</p>
                  </div>
                </div>
              </div>

              {/* Flags */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-4">
                  {data.flags.length} Risk{data.flags.length !== 1 ? "s" : ""} Found
                </div>
                <div className="space-y-3">
                  {data.flags.map((f) => (
                    <div key={f.clause_type} className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-4">
                      <div className="flex items-start gap-2.5">
                        <span
                          className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full"
                          style={{ background: SEVERITY_COLORS[f.severity] }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-neutral-900">{f.title}</span>
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                              style={{
                                background: `${SEVERITY_COLORS[f.severity]}14`,
                                color: SEVERITY_COLORS[f.severity]
                              }}
                            >
                              {f.severity}
                            </span>
                          </div>
                          <p className="mt-1 text-[13px] text-neutral-500">{f.plain_english}</p>
                          <div className="mt-2 border-l-2 border-neutral-200 pl-3 text-[12px] italic text-neutral-400">
                            "{f.quote}"
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: sidebar info */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-3">Data Practices</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.data_practices.map((d) => (
                    <span key={d} className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] text-neutral-600">{d}</span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-3">Readability</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-neutral-500">Grade level</span>
                    <span className="font-medium text-neutral-900">{data.readability.grade}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-neutral-500">Read time</span>
                    <span className="font-medium text-neutral-900">~{data.readability.minutes} min</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-neutral-500">Jargon density</span>
                    <span className="font-medium text-neutral-900 capitalize">{data.readability.jargon}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-3">How the score works</div>
                <p className="text-[12px] leading-relaxed text-neutral-500">
                  Each clause is scored based on its category weight and severity (low → critical). Cross-category interactions add bonus points. The final score is capped at 100.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20">
          <h2 className="text-[28px] font-bold tracking-tight text-neutral-900">FAQ</h2>
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {[
              { q: "Is this legal advice?", a: "No. ClearTerms AI is an informational tool. It summarizes policy text with evidence quotes to help you understand what you're agreeing to. Always consult a lawyer for legal advice." },
              { q: "Does it send my data anywhere?", a: "Your Gemini API key is stored locally in chrome.storage.local. Policy text is sent to the Gemini API for analysis but is not stored by us. Results are cached on your device." },
              { q: "How accurate is the risk score?", a: "The score is computed using a multi-dimensional algorithm across 6 risk categories with severity weighting. Every claim is backed by a verbatim quote from the policy." },
              { q: "Which sites does it work on?", a: "Any website with a Terms of Service, Privacy Policy, or similar legal page. The extension auto-detects policy pages using URL patterns, headings, and content signals." },
              { q: "Do I need an account?", a: "No. The extension works entirely locally with your own Gemini API key. No sign-up required." },
              { q: "Is it open source?", a: "Yes. The entire codebase is available on GitHub. You can audit the extension, the scoring algorithm, and every prompt we send to the AI." }
            ].map((item) => (
              <div key={item.q} className="rounded-xl border border-neutral-200 bg-white p-5">
                <h3 className="text-[14px] font-semibold text-neutral-900">{item.q}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section id="install" className="pb-20 pt-8">
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <h2 className="text-[32px] font-bold tracking-tight text-neutral-900">Stop blindly clicking Accept.</h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] text-neutral-500">
              Install ClearTerms AI and get instant clarity on any policy. Free, open source, privacy-first.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                className="rounded-xl bg-neutral-900 px-7 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-neutral-800 hover:shadow-md"
                href="https://github.com/RithikPorandla/ClearTermsAI"
                target="_blank"
                rel="noreferrer"
              >
                Get the Chrome extension
              </a>
              <a
                className="rounded-xl border border-neutral-200 bg-white px-7 py-3.5 text-[15px] font-medium text-neutral-700 transition hover:border-neutral-300"
                href="https://github.com/RithikPorandla/ClearTermsAI"
                target="_blank"
                rel="noreferrer"
              >
                Star on GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200/60 py-6 text-center text-[12px] text-neutral-400">
        ClearTerms AI — informational only, not legal advice. Open source on GitHub.
      </footer>
    </div>
  );
}
