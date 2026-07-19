import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

// Generalized loader hook (pattern from /frontend App.jsx match loading):
// runs fetcher on mount/deps change; centralizes 401 -> logout.
export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const { logout } = useAuth();
  const seqRef = useRef(0);

  const run = useCallback(async () => {
    const seq = ++seqRef.current;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const data = await fetcher();
      if (seq === seqRef.current) setState({ status: 'ready', data, error: null });
    } catch (err) {
      if (err?.status === 401) return logout();
      if (seq === seqRef.current) setState({ status: 'error', data: null, error: err });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, retry: run };
}

// Mutation helper: {run, busy, error}.
export function useMutation(fn) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { logout } = useAuth();

  const run = useCallback(async (...args) => {
    setBusy(true);
    setError(null);
    try {
      return await fn(...args);
    } catch (err) {
      if (err?.status === 401) logout();
      setError(err);
      throw err;
    } finally {
      setBusy(false);
    }
  }, [fn, logout]);

  return { run, busy, error };
}
