import { Navigate, Route, Routes } from 'react-router-dom';
import PublicShell from './components/PublicShell';
import AppShell from './components/AppShell';
import RequireAuth from './components/RequireAuth';
import Landing from './pages/Landing';
import Login from './pages/Login';
import RoleSelect from './pages/RoleSelect';
import Onboarding from './pages/Onboarding';
import Analyzing from './pages/Analyzing';
import Browse from './pages/Browse';
import ProfileDetail from './pages/ProfileDetail';
import Meetings from './pages/Meetings';
import Notifications from './pages/Notifications';
import MyProfile from './pages/MyProfile';
import NotFound from './pages/NotFound';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicShell />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/join" element={<RoleSelect />} />
        <Route path="/join/analyzing" element={<Analyzing />} />
        <Route path="/join/:role" element={<Onboarding />} />
      </Route>

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/app/browse" replace />} />
        <Route path="browse" element={<Browse />} />
        <Route path="p/:profileId" element={<ProfileDetail />} />
        <Route path="meetings" element={<Meetings />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<MyProfile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
