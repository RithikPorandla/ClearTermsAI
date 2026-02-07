"use client";

import { useMemo, useState } from "react";

type ExampleKey = "arbitration" | "data_sale" | "auto_renewal";

type ExampleData = {
  label: string;
  score: number;
  gist: string;
  flags: string[];
  options: string[];
};

const EXAMPLES: Record<ExampleKey, ExampleData> = {
  arbitration: {
    label: "Forced arbitration",
    score: 72,
    gist:
      "Disputes must go to private arbitration, not court.\nClass actions are waived.",
    flags: [
      "“You agree to resolve disputes by binding arbitration…”",
      "“You waive any right to participate in a class action…”"
    ],
    options: ["Decide if arbitration is acceptable", "Save a copy for reference"]
  },
  data_sale: {
    label: "Data sharing / sale",
    score: 81,
    gist:
      "Your data may be shared with partners for ads.\nOpt-out may be limited or buried.",
    flags: [
      "“We may share personal data with third-party partners…”",
      "“You can opt out of certain data uses where required…”"
    ],
    options: ["Look for opt-out steps", "Consider alternatives if needed"]
  },
  auto_renewal: {
    label: "Auto-renewal",
    score: 64,
    gist:
      "Subscription renews automatically unless canceled.\nRefunds may be restricted.",
    flags: [
      "“Your subscription will renew automatically unless canceled…”",
      "“Fees are non-refundable except where required by law…”"
    ],
    options: ["Check cancellation steps", "Set a reminder before renewal"]
  }
};

export default function Page() {
  const [example, setExample] = useState<ExampleKey>("arbitration");
  const data = useMemo(() => EXAMPLES[example], [example]);

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-[#101114]">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#f7f3ee]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-lg font-semibold tracking-tight">ClearTerms AI</div>
          <nav className="flex items-center gap-4 text-sm">
            <a
              href="#how"
              className="text-[#1e3a5f] transition hover:opacity-80"
            >
              How it works
            </a>
            <a
              href="#faq"
              className="text-[#1e3a5f] transition hover:opacity-80"
            >
              FAQ
            </a>
            <a
              href="#install"
              className="rounded-full bg-[#1e3a5f] px-4 py-2 text-white shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
            >
              Add to Chrome — Free
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="grid items-center gap-12 pt-16 pb-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="inline-flex rounded-full border border-[#1e3a5f]/20 bg-white/70 px-3 py-1 text-xs uppercase tracking-wide text-[#1e3a5f]">
              ClearTerms AI
            </p>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              Know what you’re agreeing to before you click Accept.
            </h1>
            <p className="text-base md:text-lg text-[#5d636f]">
              Instant plain-English risk summary for Terms of Service & Privacy
              Policies—right in your browser.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="#install"
                className="rounded-2xl bg-[#1e3a5f] px-6 py-3 text-white shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
              >
                Add to Chrome — Free
              </a>
              <a
                href="#example"
                className="rounded-2xl px-6 py-3 text-[#1e3a5f] transition hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
              >
                See a live example
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-2 pb-4">
              <span className="h-2.5 w-2.5 rounded-full bg-[#e0a75e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#1e3a5f]/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#2f7a6d]/60" />
              <div className="ml-auto rounded-md bg-white px-2 py-1 text-xs text-[#5d636f]">
                policy.example.com
              </div>
            </div>
            <div className="relative rounded-xl border border-black/10 bg-white p-4">
              <div className="space-y-2">
                <div className="h-3 w-3/5 rounded bg-[#f1e8df]" />
                <div className="h-2.5 w-full rounded bg-[#f1e8df]" />
                <div className="h-2.5 w-11/12 rounded bg-[#f1e8df]" />
                <div className="h-2.5 w-10/12 rounded bg-[#f1e8df]" />
                <div className="h-2.5 w-9/12 rounded bg-[#f1e8df]" />
              </div>
              <div className="mt-4 rounded-2xl border border-black/10 bg-[#f7f3ee] p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Risk Summary</div>
                  <div className="rounded-full border border-[#1e3a5f]/20 bg-white px-2 py-0.5 text-xs text-[#1e3a5f]">
                    Risk 74
                  </div>
                </div>
                <p className="mt-2 text-sm text-[#5d636f]">
                  Key risks detected with evidence quotes.
                </p>
                <div className="mt-3 space-y-2">
                  <div className="rounded-lg bg-white px-3 py-2 text-xs" />
                  <div className="rounded-lg bg-white px-3 py-2 text-xs" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="py-12">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold">How it works</h2>
            <p className="text-[#5d636f]">
              A simple flow that turns legal text into a clear decision in seconds.
            </p>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Detect",
                text: "Finds Terms & Privacy pages using URL, title, and page signals."
              },
              {
                title: "Analyze",
                text: "Summarizes risks with evidence-first quotes and plain English."
              },
              {
                title: "Decide",
                text: "See the risk score and actions before you accept."
              }
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm transition hover:shadow-md"
              >
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-[#5d636f]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="flags" className="py-12">
          <h2 className="text-3xl font-semibold">What it flags</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              "Forced arbitration",
              "Data sharing/sale",
              "Auto-renewal & cancellation traps",
              "Content/license grabs",
              "Refund/chargeback limits",
              "Liability disclaimers"
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="text-base font-semibold">{item}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="example" className="py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold">Live example</h2>
              <p className="mt-2 text-[#5d636f]">
                Pick a clause and see the risk summary update instantly.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="clause" className="text-sm text-[#5d636f]">
                Clause
              </label>
              <select
                id="clause"
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
                value={example}
                onChange={(e) => setExample(e.target.value as ExampleKey)}
                aria-label="Select a clause"
              >
                {Object.entries(EXAMPLES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm">
              <div className="text-sm uppercase tracking-wide text-[#5d636f]">The gist</div>
              <p className="mt-2 whitespace-pre-line text-lg font-medium">{data.gist}</p>
              <div className="mt-6">
                <div className="text-sm uppercase tracking-wide text-[#5d636f]">
                  Red flags
                </div>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-[#5d636f]">
                  {data.flags.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm">
              <div className="text-sm uppercase tracking-wide text-[#5d636f]">Risk score</div>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#1e3a5f]/20 text-xl font-semibold text-[#1e3a5f]">
                  {data.score}
                </div>
                <div className="text-sm text-[#5d636f]">
                  Higher means more legal risk and tighter limitations.
                </div>
              </div>
              <div className="mt-6">
                <div className="text-sm uppercase tracking-wide text-[#5d636f]">
                  Your options
                </div>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-[#5d636f]">
                  {data.options.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="py-12">
          <h2 className="text-3xl font-semibold">FAQ</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[
              {
                q: "Is this legal advice?",
                a: "No. It is an informational summary to help you understand policies faster."
              },
              {
                q: "Does it send my data anywhere?",
                a: "Your Gemini API key and results stay local on your device by default."
              },
              {
                q: "Which sites does it work on?",
                a: "Most sites with Terms of Service or Privacy Policy pages."
              },
              {
                q: "How accurate is the risk score?",
                a: "It is rule-based and evidence-first, designed to be clear and consistent."
              },
              {
                q: "Do I need an account?",
                a: "No account required for local mode—just add your Gemini API key."
              },
              {
                q: "What if a policy changes?",
                a: "You can re-run analysis any time you revisit the page."
              }
            ].map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm"
              >
                <h3 className="text-base font-semibold">{item.q}</h3>
                <p className="mt-2 text-sm text-[#5d636f]">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="install" className="py-16">
          <div className="rounded-2xl border border-black/10 bg-white/80 p-10 shadow-sm text-center">
            <h2 className="text-3xl font-semibold">Ready to read policies in minutes?</h2>
            <p className="mt-3 text-[#5d636f]">
              Add ClearTerms AI to Chrome and get instant clarity before you accept.
            </p>
            <div className="mt-6">
              <a
                className="rounded-2xl bg-[#1e3a5f] px-6 py-3 text-white shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
                href="https://github.com/RithikPorandla/ClearTermsAI"
                target="_blank"
                rel="noreferrer"
              >
                Add to Chrome — Free
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/10 py-8 text-center text-sm text-[#5d636f]">
        ClearTerms AI — informational only, not legal advice.
      </footer>
    </div>
  );
}
