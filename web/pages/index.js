import Head from "next/head";
import { useEffect, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";

export default function Home() {
  const { user, isLoading } = useUser();
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("Loading reports...");

  useEffect(() => {
    if (!user) {
      setStatus("Log in to see your reports.");
      return;
    }

    const loadReports = async () => {
      try {
        const res = await fetch("/api/reports");
        const data = await res.json();
        if (!res.ok) {
          setStatus(data.error || "Unable to load reports.");
          return;
        }
        setReports(data.reports || []);
        setStatus(data.reports?.length ? "" : "No reports yet.");
      } catch (err) {
        setStatus("Unable to load reports.");
      }
    };

    loadReports();
  }, [user]);

  return (
    <>
      <Head>
        <title>ClearTerms AI Dashboard</title>
      </Head>
      <main className="page">
        <header className="hero">
          <div>
            <div className="eyebrow">ClearTerms AI</div>
            <h1>Policy Intelligence Dashboard</h1>
            <p>Centralize every policy analysis, risk score, and red flag in one premium workspace.</p>
          </div>
          <div className="actions">
            {isLoading ? null : user ? (
              <a className="button secondary" href="/api/auth/logout">Log out</a>
            ) : (
              <a className="button" href="/api/auth/login">Log in with Auth0</a>
            )}
          </div>
        </header>

        <section className="panel">
          <div className="panel-title">Recent Reports</div>
          {status && <p className="muted">{status}</p>}
          <div className="report-grid">
            {reports.map((report) => (
              <article key={report.id} className="report-card">
                <div className="report-domain">{report.domain}</div>
                <div className="report-title">{report.title || report.url}</div>
                <div className="report-meta">
                  <span>Risk: {report.analysis?.Risk_Level || "Unclear"}</span>
                  <span>Score: {report.analysis?.Risk_Score ?? "--"}</span>
                </div>
                <a className="link" href={`/reports/${report.id}`}>View report</a>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
