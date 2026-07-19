import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth, isNetworkError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await auth.login(email, password);
      login({ token: data.token, user: data.user });
      navigate(location.state?.from || '/app/browse', { replace: true });
    } catch (err) {
      setError(isNetworkError(err) ? 'Cannot reach the server. Is the backend running?' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vn-page vn-page-narrow" style={{ maxWidth: 440 }}>
      <div className="eyebrow">Welcome back</div>
      <h1 className="serif-h1" style={{ marginTop: 10 }}>Sign in</h1>
      <form className="card" style={{ marginTop: 24 }} onSubmit={submit}>
        <div className="vn-field">
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div className="vn-field">
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="field-error" style={{ marginBottom: 12 }}>{error}</div>}
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
          New here? <Link className="link" style={{ fontSize: 13, color: 'var(--accent)' }} to="/join">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
