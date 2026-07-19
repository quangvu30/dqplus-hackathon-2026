import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationsProvider, useNotifications } from '../context/NotificationsContext';

function Bell() {
  const { unreadCount } = useNotifications();
  return (
    <NavLink to="/app/notifications" className="vn-bell" aria-label="Notifications">
      <span>🔔</span>
      {unreadCount > 0 && <span className="vn-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </NavLink>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  return (
    <div>
      <header className="vn-header">
        <Link to="/app/browse" className="vn-header-brand">
          <img src="/logo.png" alt="" className="vn-header-logo" />
          <span className="vn-header-name">VietNexus</span>
        </Link>
        <nav className="vn-nav">
          <NavLink to="/app/browse" className={({ isActive }) => 'vn-nav-link' + (isActive ? ' active' : '')}>
            Browse
          </NavLink>
          <NavLink to="/app/meetings" className={({ isActive }) => 'vn-nav-link' + (isActive ? ' active' : '')}>
            Meetings
          </NavLink>
          <NavLink to="/app/profile" className={({ isActive }) => 'vn-nav-link' + (isActive ? ' active' : '')}>
            Profile
          </NavLink>
        </nav>
        <div className="vn-header-right">
          <Bell />
          <span className="vn-header-email">{user?.email}</span>
          <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

export default function AppShell() {
  return (
    <NotificationsProvider>
      <Shell />
    </NotificationsProvider>
  );
}
