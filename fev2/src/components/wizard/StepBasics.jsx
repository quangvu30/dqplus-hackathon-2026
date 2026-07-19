import { TextField, ChipToggleField } from './Field';
import { SECTORS, REGIONS } from '../../data/ecosystem';

export default function StepBasics({ role, values, setValues, errors }) {
  return (
    <div>
      <h2 className="serif-h2">{role === 'founder' ? 'About your company' : 'About your firm'}</h2>
      <p className="lede" style={{ marginTop: 8, marginBottom: 22 }}>
        This is what the other side sees first.
      </p>
      <TextField label={role === 'founder' ? 'Company name' : 'Firm name'} required
        value={values.displayName} error={errors.displayName}
        onChange={(v) => setValues((s) => ({ ...s, displayName: v }))} />
      <TextField label="One-line headline" value={values.headline}
        placeholder={role === 'founder' ? 'e.g. Smart-grid analytics for industrial parks' : 'e.g. Seed fund for Vietnamese B2B tech'}
        onChange={(v) => setValues((s) => ({ ...s, headline: v }))} />
      <TextField label="Country" value={values.country}
        onChange={(v) => setValues((s) => ({ ...s, country: v }))} />
      <ChipToggleField label="Sectors" required options={SECTORS} value={values.sectors} error={errors.sectors}
        onChange={(v) => setValues((s) => ({ ...s, sectors: v }))} />
      <ChipToggleField label="Regions of interest" options={REGIONS.map((r) => ({ id: r.value, label: r.label }))}
        value={values.regions} onChange={(v) => setValues((s) => ({ ...s, regions: v }))} />
      <TextField label="About you" textarea value={values.bio}
        placeholder="A short personal bio"
        onChange={(v) => setValues((s) => ({ ...s, bio: v }))} />
      <TextField label="Experience" textarea value={values.experience}
        placeholder="Relevant background and experience"
        onChange={(v) => setValues((s) => ({ ...s, experience: v }))} />
    </div>
  );
}
