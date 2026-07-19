import { cap, money } from '../../lib/format';

export default function StepReview({ role, values, submitError }) {
  const row = (label, value) => value != null && value !== '' && (
    <div className="vn-detail-fact" key={label}><span className="vn-detail-fact-dot" />{label}: {value}</div>
  );
  return (
    <div>
      <h2 className="serif-h2">Review & submit</h2>
      <p className="lede" style={{ marginTop: 8, marginBottom: 22 }}>
        We'll create your account and immediately start building your match signals.
      </p>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-label">{role === 'founder' ? 'Company' : 'Firm'}</div>
        <div className="vn-detail-facts" style={{ marginTop: 12 }}>
          {row('Name', values.displayName)}
          {row('Headline', values.headline)}
          {row('Country', values.country)}
          {row('Sectors', (values.sectors || []).map(cap).join(', '))}
          {role === 'founder' && row('Stage', values.stage && cap(values.stage))}
          {role === 'founder' && row('Funding ask', money(values.fundingAskUsd))}
          {role === 'investor' && row('Check size', values.checkSizeMinUsd || values.checkSizeMaxUsd
            ? `${money(values.checkSizeMinUsd) || '$0'}–${money(values.checkSizeMaxUsd) || '∞'}` : null)}
          {role === 'founder' && values.financialReportName && row('Financial report', values.financialReportName)}
        </div>
      </div>
      {submitError && <div className="field-error" style={{ marginBottom: 12 }}>{submitError}</div>}
    </div>
  );
}
