import React, { createContext, useContext, useState } from 'react';
import type { Lang } from './labels';
import { createTranslator } from './labels';

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: ReturnType<typeof createTranslator>;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('ss_lang');
    return stored === 'en' ? 'en' : 'hi';
  });

  function handleSetLang(l: Lang) {
    setLang(l);
    localStorage.setItem('ss_lang', l);
  }

  const t = createTranslator(lang);

  return (
    <LangContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be inside LangProvider');
  return ctx;
}
