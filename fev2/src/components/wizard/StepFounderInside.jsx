import { SelectField } from './Field';

const VISIBILITY_OPTIONS = [
  { value: 'members', label: 'Verified members (default)' },
  { value: 'private', label: 'Private — only you' },
  { value: 'public', label: 'Public — anyone signed in' },
];

const FIELDS = [
  { key: 'grossMargin', label: 'Gross margin' },
  { key: 'burn', label: 'Monthly burn' },
  { key: 'runway', label: 'Runway' },
  { key: 'churn', label: 'Churn' },
  { key: 'pipeline', label: 'Sales pipeline' },
  { key: 'keyRisk', label: 'Key risk investors should know' },
];

export default function StepFounderInside({ values, setValues }) {
  const insideInfo = values.insideInfo || {};
  const setField = (key, v) => setValues((s) => ({ ...s, insideInfo: { ...s.insideInfo, [key]: v } }));

  return (
    <div>
      <h2 className="serif-h2">Inside information</h2>
      <p className="lede" style={{ marginTop: 8, marginBottom: 22 }}>
        Metrics investors want but shouldn't be public. All fields optional — used to
        improve matching and shown in your assessment brief, gated by the visibility you pick.
      </p>
      {FIELDS.map((f) => (
        <div className="vn-field" key={f.key}>
          <label className="label">{f.label}</label>
          <input className="input" value={insideInfo[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} />
        </div>
      ))}
      <SelectField label="Who can see this" value={values.insideInfoVisibility || 'members'}
        options={VISIBILITY_OPTIONS} placeholder="Verified members (default)"
        onChange={(v) => setValues((s) => ({ ...s, insideInfoVisibility: v }))} />
    </div>
  );
}
