import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>ClearTerms AI — Real-Time Legal Risk Translator</title>
        <meta
          name="description"
          content="ClearTerms AI helps you understand Terms of Service and Privacy Policies in real time with evidence-first risk insights."
        />
      </Head>
      <main className="page">
        <header className="hero">
          <nav className="nav">
            <div className="logo">ClearTerms AI</div>
            <div className="nav-links">
              <a href="#use-cases">Use Cases</a>
              <a href="#how">How It Works</a>
              <a href="#install">Install</a>
              <a className="button small" href="#install">Install Extension</a>
            </div>
          </nav>

          <div className="hero-grid">
            <div className="hero-copy">
              <span className="pill">Real-Time Clarity</span>
              <h1>Know what you are accepting before you accept it.</h1>
              <p>
                ClearTerms AI sits in your browser and translates legal policies into clear, evidence‑first
                risk insights. It is built for the exact moment you are asked to click “Accept.”
              </p>
              <div className="cta-row">
                <a className="button primary" href="#install">Install Extension</a>
                <a
                  className="button ghost"
                  href="https://github.com/RithikPorandla/ClearTermsAI"
                  target="_blank"
                  rel="noreferrer"
                >
                  View on GitHub
                </a>
              </div>
              <div className="trust-row">
                <span>Evidence-first</span>
                <span>Local-first</span>
                <span>No legal advice</span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="visual-card">
                <div className="visual-header">
                  <div>
                    <div className="visual-title">Risk Brief</div>
                    <div className="visual-sub">Example policy page</div>
                  </div>
                  <div className="risk-badge">78 • High</div>
                </div>
                <div className="visual-grid">
                  <div className="metric">
                    <div className="metric-label">Risk Index</div>
                    <div className="metric-value">78</div>
                  </div>
                  <div className="metric">
                    <div className="metric-label">Red Flags</div>
                    <div className="metric-value">4</div>
                  </div>
                  <div className="metric">
                    <div className="metric-label">Data Rights</div>
                    <div className="metric-value">5</div>
                  </div>
                </div>
                <div className="quote"></div>
              </div>
              <div className="visual-stack">
                <div className="stack-card">
                  <h3>Red Flags</h3>
                  <p>Arbitration, AI training, data sharing.</p>
                </div>
                <div className="stack-card">
                  <h3>Escape Plan</h3>
                  <p>Opt‑out + deletion steps extracted.</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="section" id="use-cases">
          <div className="section-head">
            <span className="pill">Use Cases</span>
            <h2>Built for real‑world moments where decisions matter.</h2>
            <p>
              ClearTerms AI is most powerful when you are about to submit, sign up, or subscribe — the
              exact moment the policy matters.
            </p>
          </div>
          <div className="use-case-grid">
            <article className="use-case">
              <h3>Job Applications</h3>
              <p>Understand arbitration clauses, background check consent, and data reuse before you submit.</p>
            </article>
            <article className="use-case">
              <h3>SaaS Sign‑Ups</h3>
              <p>Evaluate whether tools can use your data for training, ads, or internal analytics.</p>
            </article>
            <article className="use-case">
              <h3>Subscriptions & Trials</h3>
              <p>Find auto‑renewal and refund rules early so you can cancel on time.</p>
            </article>
            <article className="use-case">
              <h3>AI & Creative Platforms</h3>
              <p>See whether your content can be reused or trained on — with exact evidence quotes.</p>
            </article>
            <article className="use-case">
              <h3>Finance & Health Apps</h3>
              <p>Check how sensitive information is shared, stored, or retained.</p>
            </article>
            <article className="use-case">
              <h3>Student Services</h3>
              <p>Understand data rights and deletion policies across education tools.</p>
            </article>
          </div>
        </section>

        <section className="section" id="how">
          <div className="section-head">
            <span className="pill">How It Works</span>
            <h2>Three steps, zero legalese.</h2>
          </div>
          <div className="timeline">
            <div className="step">
              <div className="step-index">1</div>
              <div>
                <h3>Detect</h3>
                <p>We identify Terms and Privacy pages using URL, title, and content signals.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-index">2</div>
              <div>
                <h3>Analyze</h3>
                <p>Gemini extracts risk clauses and returns structured, evidence‑based insights.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-index">3</div>
              <div>
                <h3>Decide</h3>
                <p>Review the risk score, red flags, and opt‑out steps before you accept.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="features">
          <div className="section-head">
            <span className="pill">What You Get</span>
            <h2>Premium clarity at the moment of consent.</h2>
          </div>
          <div className="bento">
            <article className="bento-card">
              <h3>Evidence‑first red flags</h3>
              <p>Every risk claim includes exact policy quotes so you always see the source.</p>
            </article>
            <article className="bento-card feature">
              <h3>Instant risk score</h3>
              <p>Rule‑based scoring turns legal complexity into a clear signal.</p>
            </article>
            <article className="bento-card">
              <h3>Actionable rights</h3>
              <p>We surface deletion, opt‑out, and portability steps in plain English.</p>
            </article>
            <article className="bento-card">
              <h3>Local‑first privacy</h3>
              <p>Your API key and results stay on device by default.</p>
            </article>
            <article className="bento-card feature">
              <h3>Fast detection</h3>
              <p>Smart URL, title, and content signals identify policy pages instantly.</p>
            </article>
            <article className="bento-card">
              <h3>Designed for trust</h3>
              <p>Luxury UI with clarity‑first layout and measured language.</p>
            </article>
          </div>
        </section>

        <section className="section install" id="install">
          <div className="section-head">
            <span className="pill">Install</span>
            <h2>Install the extension in minutes.</h2>
            <p>Download the repo, load the extension locally, and start analyzing policies right away.</p>
          </div>
          <div className="install-steps">
            <div className="install-card">
              <div className="install-title">1. Download</div>
              <p>Get the latest version from GitHub.</p>
            </div>
            <div className="install-card">
              <div className="install-title">2. Enable Dev Mode</div>
              <p>Open <span className="mono">chrome://extensions</span> and enable Developer Mode.</p>
            </div>
            <div className="install-card">
              <div className="install-title">3. Load Extension</div>
              <p>Click <strong>Load unpacked</strong> and select the <span className="mono">extension/</span> folder.</p>
            </div>
          </div>
          <div className="cta-row">
            <a
              className="button primary"
              href="https://github.com/RithikPorandla/ClearTermsAI"
              target="_blank"
              rel="noreferrer"
            >
              Download from GitHub
            </a>
          </div>
        </section>

        <footer className="footer">
          <div>ClearTerms AI — informational only, not legal advice.</div>
          <div className="muted">© 2026 ClearTerms AI</div>
        </footer>
      </main>
    </>
  );
}
