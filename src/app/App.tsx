import { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { LangProvider, useLang } from '../i18n/LangContext';
import { initDB } from '../db';
import { Loader2, Crown } from 'lucide-react';

// Lazy-load pages for code splitting
const HomePage = lazy(() => import('../pages/HomePage'));
const StockPage = lazy(() => import('../pages/StockPage'));
const SalePage = lazy(() => import('../pages/SalePage'));
const ReorderPage = lazy(() => import('../pages/ReorderPage'));
const HistoryPage = lazy(() => import('../pages/HistoryPage'));
const MorePage = lazy(() => import('../pages/MorePage'));

function AppShell() {
  const { t, lang, setLang } = useLang();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initDB()
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error(err);
        setDbError(String(err));
      });
  }, []);

  if (dbError) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 text-center bg-[#F9F7EF]">
        <div className="bg-white p-6 rounded-2xl border border-[#F8C0B8] shadow-sm max-w-sm">
          <p className="text-[#E86D5A] font-bold text-lg mb-2">Database Error</p>
          <p className="text-[#6B7C72] text-sm leading-relaxed">{dbError}</p>
          <p className="text-gray-400 text-xs mt-3">
            Try clearing site data and reloading.
          </p>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9F7EF]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#DFF5E8] flex items-center justify-center mx-auto mb-3 shadow-xs border border-[#C1EBD2]">
            <Crown size={28} className="text-[#087F5B]" />
          </div>
          <p className="text-[#20352C] text-sm font-semibold">{t('loading')}</p>
          <Loader2 size={20} className="animate-spin text-[#087F5B] mx-auto mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto bg-[#F9F7EF] min-h-screen relative font-sans antialiased text-[#20352C] shadow-[0_0_50px_rgba(0,0,0,0.03)]">
      {/* Top bar — lang toggle */}
      <div className="fixed top-0 left-0 right-0 z-30 flex justify-end px-4 sm:px-8 pt-2.5 pointer-events-none w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        <button
          onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
          className="pointer-events-auto bg-white/95 backdrop-blur-md border border-[#E5EAE3] text-xs font-bold text-[#20352C] px-3.5 py-1.5 rounded-full shadow-xs hover:bg-[#F9F7EF] hover:border-[#087F5B] active:scale-95 transition-all cursor-pointer select-none"
          id="lang-toggle"
          aria-label="Toggle language"
        >
          {lang === 'hi' ? 'English' : 'हिंदी'}
        </button>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64 text-[#087F5B]">
            <Loader2 size={28} className="animate-spin" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/sale" element={<SalePage />} />
          <Route path="/reorder" element={<ReorderPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/more" element={<MorePage />} />
        </Routes>
      </Suspense>

      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LangProvider>
        <AppShell />
      </LangProvider>
    </BrowserRouter>
  );
}
