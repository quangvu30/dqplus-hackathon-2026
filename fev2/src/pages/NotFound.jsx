import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="vn-page" style={{ textAlign: 'center', paddingTop: 120 }}>
      <div className="eyebrow">404</div>
      <h1 className="serif-h1" style={{ marginTop: 10 }}>This page doesn't exist.</h1>
      <p style={{ marginTop: 20 }}>
        <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>Back to VietNexus</Link>
      </p>
    </div>
  );
}
