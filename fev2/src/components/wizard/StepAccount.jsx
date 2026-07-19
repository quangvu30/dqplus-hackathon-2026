import { TextField } from './Field';

export default function StepAccount({ values, setValues, errors }) {
  return (
    <div>
      <h2 className="serif-h2">Create your account</h2>
      <p className="lede" style={{ marginTop: 8, marginBottom: 22 }}>Just the basics — you can refine everything later.</p>
      <TextField label="Full name" required value={values.fullName} error={errors.fullName}
        onChange={(v) => setValues((s) => ({ ...s, fullName: v }))} />
      <TextField label="Email" required type="email" value={values.email} error={errors.email}
        onChange={(v) => setValues((s) => ({ ...s, email: v }))} />
      <TextField label="Password" required type="password" value={values.password} error={errors.password}
        onChange={(v) => setValues((s) => ({ ...s, password: v }))} placeholder="At least 8 characters" />
    </div>
  );
}
