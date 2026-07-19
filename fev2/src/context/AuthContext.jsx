import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { loadSession, saveSession, clearSession } from '../lib/session';
import { setToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const s = loadSession();
    if (s) setToken(s.token);
    return s;
  });

  const login = useCallback((s) => {
    saveSession(s);
    setToken(s.token);
    setSession(s);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, user: session?.user || null, role: session?.user?.role || null, login, logout }),
    [session, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
