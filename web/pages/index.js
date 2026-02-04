import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>ClearTerms AI — Real-Time Policy Risk Translator</title>
        <meta
          name="description"
          content="ClearTerms AI detects Terms & Privacy pages and translates legal policies into evidence-based risk insights before you accept."
        />
      </Head>
      <main className="page">
        <section className="hero-surface">
          <nav className="nav">
            <div className="logo">
              <span className="logo-mark">CT</span>
              <span>ClearTerms AI</span>
            </div>
            <div className="nav-links">
              <a href="#solutions">Solutions</a>
              <a href="#benefits">Benefits</a>
              <a href="#install">Install</a>
              <a className="button small" href="#install">Install Extension</a>
            </div>
          </nav>

          <div className="hero">
            <span className="pill">New</span>
            <h1>
              Intelligent policy clarity for the modern internet.
            </h1>
            <p>
              ClearTerms AI detects Terms of Service and Privacy Policy pages, extracts the key clauses,
              and delivers evidence‑first risk insights before you click “Accept.”
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
            <div className="trust">
              Evidence‑first · Local‑first · No legal advice
            </div>
            <div className="logo-row">
              <span>Legal Teams</span>
              <span>Founders</span>
              <span>Students</span>
              <span>Privacy‑First</span>
            </div>
          </div>
        </section>

        <section className="section" id="solutions">
          <div className="section-head">
            <span className="pill">Our Services</span>
            <h2>Risk insights that feel premium and human.</h2>
            <p>
              We surface the clauses that matter most, attach direct evidence quotes, and explain the impact
              in plain English so you can decide fast.
            </p>
          </div>
          <div className="bento">
            <div className="bento-card">
              <div className="bento-title">Policy Scanner</div>
              <p>
                Detects Terms & Privacy pages using URL, title, and content signals — no manual copy/paste.
              </p>
              <div className="chips">
                <span>URL signals</span>
                <span>Heading cues</span>
                <span>Body scan</span>
              </div>
            </div>
            <div className="bento-card highlight">
              <div className="bento-title">Evidence‑First Red Flags</div>
              <p>
                Every risk claim includes verbatim quotes so you know exactly what the policy says.
              </p>
              <div className="mock">
                <div className="mock-line"></div>
                <div className="mock-line"></div>
                <div className="mock-line short"></div>
              </div>
            </div>
            <div className="bento-card">
              <div className="bento-title">Actionable Escape Plan</div>
              <p>
                Find opt‑out, cancellation, and deletion steps in seconds.
              </p>
              <div className="chips">
                <span>Opt‑out</span>
                <span>Delete</span>
                <span>Contact</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="benefits">
          <div className="section-head">
            <span className="pill">Benefits</span>
            <h2>Premium clarity at the moment of consent.</h2>
            <p>
              Built for speed, evidence, and trust — so every decision is informed.
            </p>
          </div>
          <div className="cards">
            <div className="card">
              <h3>Faster decisions</h3>
              <p>Scan and understand policies in minutes, not hours.</p>
            </div>
            <div className="card">
              <h3>Evidence you can audit</h3>
              <p>Quotes are lifted verbatim so you always see the source.</p>
            </div>
            <div className="card">
              <h3>Risk‑aware scoring</h3>
              <p>Rule‑based risk index with clear severity labels.</p>
            </div>
            <div className="card">
              <h3>Local‑first privacy</h3>
              <p>Your analysis stays on device by default.</p>
            </div>
            <div className="card">
              <h3>Actionable rights</h3>
              <p>Find deletion, opt‑out, and portability steps fast.</p>
            </div>
            <div className="card">
              <h3>Designed to feel premium</h3>
              <p>Luxury UI with clarity-first layout and flow.</p>
            </div>
          </div>
        </section>

        <section className="section install" id="install">
          <div className="section-head">
            <span className="pill">Install</span>
            <h2>Install the extension in minutes.</h2>
            <p>Download the repo, load the extension locally, and start analyzing policies right away.</p>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div>
                <h3>Download the repo</h3>
                <p>Get the latest version from GitHub.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div>
                <h3>Enable Developer Mode</h3>
                <p>Open <span className="mono">chrome://extensions</span> and enable Developer Mode.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div>
                <h3>Load the extension</h3>
                <p>Click <strong>Load unpacked</strong> and select the <span className="mono">extension/</span> folder.</p>
              </div>
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
