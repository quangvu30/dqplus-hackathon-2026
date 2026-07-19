import { useEffect, useRef, useState } from 'react';

// localStorage-backed wizard draft. Excludes password + File objects (kept only
// as a filename hint) so a reload never leaks a secret or a non-serializable blob.
export function useWizardDraft(role, initialValues) {
  const key = `vn2.onboarding.${role}`;
  const [values, setValues] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return initialValues;
      const saved = JSON.parse(raw);
      return { ...initialValues, ...saved, password: '' };
    } catch {
      return initialValues;
    }
  });
  const [stepIndex, setStepIndex] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key))?.stepIndex || 0;
    } catch {
      return 0;
    }
  });
  const [hasDraft] = useState(() => Boolean(localStorage.getItem(key)));
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const { password, financialReport, ...safe } = values;
      localStorage.setItem(key, JSON.stringify({
        ...safe,
        financialReportName: financialReport?.name || safe.financialReportName || null,
        stepIndex,
      }));
    }, 500);
    return () => clearTimeout(timer.current);
  }, [values, stepIndex, key]);

  const clear = () => localStorage.removeItem(key);

  return { values, setValues, stepIndex, setStepIndex, hasDraft, clearDraft: clear };
}
