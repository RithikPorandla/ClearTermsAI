import { withPageAuthRequired, getSession } from "@auth0/nextjs-auth0";

export default withPageAuthRequired(function ReportPage({ report }) {
  return (
    <main className="page">
      <header className="hero small">
        <div>
          <div className="eyebrow">Policy Report</div>
          <h1>{report.domain}</h1>
          <p>{report.title || report.url}</p>
        </div>
        <div className="meta-box">
          <div>Risk Level: {report.analysis?.Risk_Level || "Unclear"}</div>
          <div>Score: {report.analysis?.Risk_Score ?? "--"}</div>
        </div>
      </header>

      <section className="panel">
        <div className="panel-title">Executive Gist</div>
        <p>{report.analysis?.The_Gist || "Unclear."}</p>
      </section>

      <section className="panel">
        <div className="panel-title">Red Flags</div>
        <div className="stack">
          {(report.analysis?.Red_Flags || []).map((flag, idx) => (
            <article key={idx} className="report-card">
              <div className="report-domain">{flag.title || flag.clause_type}</div>
              <div className="report-title">{flag.why_it_matters}</div>
              <div className="report-meta">
                {(flag.evidence_quotes || []).map((quote, qIdx) => (
                  <blockquote key={qIdx} className="quote">"{quote}"</blockquote>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">Data Rights</div>
        <div className="stack">
          {(report.analysis?.Data_Rights || []).map((item, idx) => (
            <article key={idx} className="report-card">
              <div className="report-domain">{item.right}</div>
              <div className="report-title">{item.details}</div>
              <div className="report-meta">
                {(item.evidence_quotes || []).map((quote, qIdx) => (
                  <blockquote key={qIdx} className="quote">"{quote}"</blockquote>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">Opt Out / Delete</div>
        <div className="stack">
          {(report.analysis?.The_Escape || []).map((item, idx) => (
            <article key={idx} className="report-card">
              <div className="report-domain">{item.step}</div>
              <div className="report-title">{item.details}</div>
              <div className="report-meta">
                {(item.evidence_quotes || []).map((quote, qIdx) => (
                  <blockquote key={qIdx} className="quote">"{quote}"</blockquote>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
});

export async function getServerSideProps(context) {
  const session = await getSession(context.req, context.res);
  const token = session?.accessToken;
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!token || !baseUrl) {
    return { notFound: true };
  }

  const response = await fetch(`${baseUrl}/reports/${context.params.id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const data = await response.json();

  if (!response.ok) {
    return { notFound: true };
  }

  return {
    props: {
      report: data.report
    }
  };
}
