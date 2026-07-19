export default function StepFounderFinancials({ values, setValues }) {
  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (file) setValues((s) => ({ ...s, financialReport: file, financialReportName: file.name }));
  };
  const clear = () => setValues((s) => ({ ...s, financialReport: null, financialReportName: null }));

  return (
    <div>
      <h2 className="serif-h2">Financial report (optional)</h2>
      <p className="lede" style={{ marginTop: 8, marginBottom: 22 }}>
        Upload a PDF and our AI will generate a brief strengths/risks assessment, visible
        to you and to investors viewing your profile. You can skip this and add it later.
      </p>
      <div className="card" style={{ padding: 20, textAlign: 'center' }}>
        {values.financialReportName ? (
          <>
            <div style={{ fontWeight: 600 }}>{values.financialReportName}</div>
            <button type="button" className="link" style={{ marginTop: 10, fontSize: 12.5 }} onClick={clear}>
              Remove
            </button>
          </>
        ) : (
          <label style={{ cursor: 'pointer' }}>
            <div style={{ color: 'var(--muted)', marginBottom: 10 }}>Click to upload a PDF (max 10 MB)</div>
            <input type="file" accept="application/pdf" onChange={onFile} style={{ display: 'none' }} />
            <span className="btn btn-ghost" style={{ display: 'inline-block' }}>Choose file</span>
          </label>
        )}
      </div>
    </div>
  );
}
