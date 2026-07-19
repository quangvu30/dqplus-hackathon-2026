import { TextField, NumberField, SelectField, ChipToggleField } from './Field';
import { INVESTOR_TYPE_OPTIONS, STAGES } from '../../data/ecosystem';

export default function StepInvestorThesis({ values, setValues, errors }) {
  return (
    <div>
      <h2 className="serif-h2">Your investment thesis</h2>
      <p className="lede" style={{ marginTop: 8, marginBottom: 22 }}>
        What founders need to know to know if you're a fit.
      </p>
      <SelectField label="Investor type" required options={INVESTOR_TYPE_OPTIONS} value={values.investorType}
        error={errors.investorType} onChange={(v) => setValues((s) => ({ ...s, investorType: v }))} />
      <ChipToggleField label="Stages you invest at" options={STAGES.map((s) => ({ id: s.value, label: s.label }))}
        value={values.stages} onChange={(v) => setValues((s) => ({ ...s, stages: v }))} />
      <div className="vn-field-row">
        <NumberField label="Check size min (USD)" value={values.checkSizeMinUsd}
          onChange={(v) => setValues((s) => ({ ...s, checkSizeMinUsd: v }))} />
        <NumberField label="Check size max (USD)" value={values.checkSizeMaxUsd}
          onChange={(v) => setValues((s) => ({ ...s, checkSizeMaxUsd: v }))} />
      </div>
      <TextField label="Thesis" required textarea value={values.thesis} error={errors.thesis}
        placeholder="What kinds of companies you back and why"
        onChange={(v) => setValues((s) => ({ ...s, thesis: v }))} />
      <TextField label="Portfolio highlights" value={values.portfolioHighlightsText}
        placeholder="Comma-separated, e.g. KiotViet, LogiVan"
        onChange={(v) => setValues((s) => ({
          ...s,
          portfolioHighlightsText: v,
          portfolioHighlights: v.split(',').map((x) => x.trim()).filter(Boolean),
        }))} />
    </div>
  );
}
