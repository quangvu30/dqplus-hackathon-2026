import { createContext, useContext, useMemo, useState } from 'react';

const LangContext = createContext({ lang: 'en', setLang: () => {} });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('vn2.lang') || 'en');
  const value = useMemo(
    () => ({
      lang,
      setLang: (l) => {
        localStorage.setItem('vn2.lang', l);
        setLangState(l);
      },
    }),
    [lang]
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
