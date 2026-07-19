import { TextField, NumberField, SelectField, ChipToggleField } from './Field';
import { STAGES, BUSINESS_MODELS, LOOKING_FOR } from '../../data/ecosystem';

export default function StepFounderProduct({ values, setValues, errors }) {
  return (
    <div>
      <h2 className="serif-h2">Product & traction</h2>
      <p className="lede" style={{ marginTop: 8, marginBottom: 22 }}>
        The specifics that let investors judge fit at a glance.
      </p>
      <div className="vn-field-row">
        <SelectField label="Stage" required options={STAGES} value={values.stage} error={errors.stage}
          onChange={(v) => setValues((s) => ({ ...s, stage: v }))} />
        <SelectField label="Business model" options={BUSINESS_MODELS} value={values.businessModel}
          onChange={(v) => setValues((s) => ({ ...s, businessModel: v }))} />
      </div>
      <div className="vn-field-row">
        <NumberField label="Team size" value={values.teamSize}
          onChange={(v) => setValues((s) => ({ ...s, teamSize: v }))} />
        <NumberField label="ARR (USD)" value={values.arrUsd}
          onChange={(v) => setValues((s) => ({ ...s, arrUsd: v }))} />
      </div>
      <NumberField label="Funding ask (USD)" value={values.fundingAskUsd}
        onChange={(v) => setValues((s) => ({ ...s, fundingAskUsd: v }))} />
      <TextField label="Product description" required textarea value={values.productDescription}
        error={errors.productDescription}
        placeholder="What you're building and for whom"
        onChange={(v) => setValues((s) => ({ ...s, productDescription: v }))} />
      <TextField label="Traction" textarea value={values.traction}
        placeholder="Revenue, customers, growth — whatever proves momentum"
        onChange={(v) => setValues((s) => ({ ...s, traction: v }))} />
      <ChipToggleField label="Looking for" options={LOOKING_FOR} value={values.lookingFor}
        onChange={(v) => setValues((s) => ({ ...s, lookingFor: v }))} />
    </div>
  );
}
