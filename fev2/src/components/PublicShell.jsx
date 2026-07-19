import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PublicShell() {
  const { session } = useAuth();
  const { pathname } = useLocation();
  const onLanding = pathname === '/';

  return (
    <div>
      <header className="vn-header">
        <Link to="/" className="vn-header-brand">
          <img src="/logo.png" alt="" className="vn-header-logo" />
          <span className="vn-header-name">VietNexus</span>
        </Link>
        <div className="vn-header-right">
          {session ? (
            <Link to="/app/browse" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Open app
            </Link>
          ) : (
            <>
              <Link to="/login" className="link" style={{ fontSize: 13.5 }}>
                Sign in
              </Link>
              {onLanding && (
                <Link to="/join" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                  Join now
                </Link>
              )}
            </>
          )}
        </div>
      </header>
      <Outlet />
    </div>
  );
}
