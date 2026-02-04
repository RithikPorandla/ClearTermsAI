import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>ClearTerms AI — Real-Time Policy Risk Translator</title>
        <meta
          name="description"
          content="Understand Terms of Service and Privacy Policies before you accept them. ClearTerms AI translates legal policies into clear, evidence-based risk insights."
        />
      </Head>
      <main className="page">
        <header className="hero">
          <div className="hero-content">
            <div className="eyebrow">ClearTerms AI</div>
            <h1>Make every policy decision with clarity.</h1>
            <p className="lead">
              ClearTerms AI is a real-time legal risk translator. It detects Terms of Service and
              Privacy Policy pages, extracts the key clauses, and delivers evidence-first insights
              before you click “Accept.”
            </p>
            <div className="cta-row">
              <a className="button primary" href="#install">Install Extension</a>
              <a className="button ghost" href="https://github.com/RithikPorandla/ClearTermsAI" target="_blank" rel="noreferrer">
                View on GitHub
              </a>
            </div>
            <div className="trust-row">
              <span>Evidence-first</span>
              <span>Local-first</span>
              <span>No legal advice</span>
            </div>
          </div>
          <div className="hero-card">
            <div className="card-top">
              <div className="risk-ring">
                <div className="risk-score">78</div>
                <div className="risk-label">High Risk</div>
              </div>
              <div>
                <div className="card-title">Policy Snapshot</div>
                <p className="card-text">
                  We flag high-risk clauses and show the exact evidence quotes so you can decide
                  with confidence.
                </p>
              </div>
            </div>
            <div className="card-grid">
              <div className="mini">
                <div className="mini-title">Red Flags</div>
                <div className="mini-text">Arbitration, data sharing, AI training</div>
              </div>
              <div className="mini">
                <div className="mini-title">Rights</div>
                <div className="mini-text">Deletion, access, portability</div>
              </div>
              <div className="mini">
                <div className="mini-title">Escape</div>
                <div className="mini-text">Opt-out and cancellation steps</div>
              </div>
            </div>
          </div>
        </header>

        <section className="section">
          <h2>Why ClearTerms AI</h2>
          <div className="grid">
            <div className="panel">
              <h3>Evidence you can trust</h3>
              <p>Every red flag includes verbatim quotes so you always know what the policy says.</p>
            </div>
            <div className="panel">
              <h3>Actionable insights</h3>
              <p>We surface opt-out steps, data rights, and cancellation details up front.</p>
            </div>
            <div className="panel">
              <h3>Fast, local-first</h3>
              <p>Your API key and results stay local. Analysis happens on-demand.</p>
            </div>
          </div>
        </section>

        <section className="section">
          <h2>How it works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div>
                <h3>Detect the policy</h3>
                <p>The extension recognizes Terms and Privacy pages using URL, title, and content signals.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div>
                <h3>Analyze with Gemini</h3>
                <p>Gemini processes the policy text and outputs structured, evidence-based findings.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div>
                <h3>Decide with confidence</h3>
                <p>Review the risk score, red flags, and actionable steps before you accept.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="install">
          <h2>Install the extension</h2>
          <div className="install">
            <div className="panel">
              <h3>Step 1</h3>
              <p>Download the repo and unzip it locally.</p>
            </div>
            <div className="panel">
              <h3>Step 2</h3>
              <p>Open Chrome → <span className="mono">chrome://extensions</span> → Enable Developer Mode.</p>
            </div>
            <div className="panel">
              <h3>Step 3</h3>
              <p>Click <strong>Load unpacked</strong> and select the <span className="mono">extension/</span> folder.</p>
            </div>
          </div>
          <div className="cta-row">
            <a className="button primary" href="https://github.com/RithikPorandla/ClearTermsAI" target="_blank" rel="noreferrer">
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
