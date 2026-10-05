import React, { useState, useEffect } from 'react';
import { useAppStore } from './store/store';
import PublicHeader from './components/common/PublicHeader';
import Footer from './components/common/Footer';
import PublicDashboard from './pages/PublicDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import { Shield, Eye, RotateCcw } from 'lucide-react';

export default function App() {
  const portalMode = useAppStore((state) => state.portalMode);
  const setPortalMode = useAppStore((state) => state.setPortalMode);
  const currentUser = useAppStore((state) => state.currentUser);
  const resetDatabase = useAppStore((state) => state.resetDatabase);
  const fetchData = useAppStore((state) => state.fetchData);

  const [publicActiveTab, setPublicActiveTab] = useState('jadwal');
  const [resetNotice, setResetNotice] = useState(null);

  // Sync browser URL and handle Back/Forward browser navigation
  useEffect(() => {
    // 1. Normalisasi alias URL (/pengurus, /admin) menjadi /penggurus secara elegan
    const currentPath = window.location.pathname.toLowerCase();
    if (currentPath.startsWith('/pengurus') || currentPath.startsWith('/admin')) {
      window.history.replaceState({ mode: currentUser ? 'admin' : 'login' }, '', '/penggurus');
    }

    // 2. Listener saat pengguna menekan tombol Back atau Forward di browser
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/penggurus') || path.startsWith('/pengurus') || path.startsWith('/admin')) {
        const user = useAppStore.getState().currentUser;
        setPortalMode(user ? 'admin' : 'login');
      } else {
        setPortalMode('public');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser, setPortalMode]);

  // Sync data on mount, window focus / visibility change, and gentle background polling
  useEffect(() => {
    // Initial fetch on mount
    fetchData();

    // Re-sync when user returns to this browser tab or wakes the phone
    const handleSync = () => {
      if (!document.hidden) {
        fetchData();
      }
    };
    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    // Calm, battery-friendly polling: 30s for admin, 90s for public visitors (only active when tab is visible)
    const pollIntervalMs = currentUser ? 30000 : 90000;
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchData();
      }
    }, pollIntervalMs);

    return () => {
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
      clearInterval(interval);
    };
  }, [portalMode, currentUser, fetchData]);

  const handleReset = async () => {
    if (window.confirm('Bersihkan seluruh data uji coba ke kondisi kosong (jadwal, absensi, jamaah) dari database? Akun pengurus dan kategori master tetap dipertahankan.')) {
      const res = await resetDatabase();
      setResetNotice(res.message || 'Data uji coba berhasil dibersihkan!');
      setTimeout(() => setResetNotice(null), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* Reset Notification banner if triggered */}
      {resetNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-slate-900 text-emerald-300 text-xs font-bold rounded-full shadow-floating border border-emerald-500/40 animate-slide-up flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{resetNotice}</span>
        </div>
      )}


      {/* Main View Switcher */}
      {portalMode === 'public' && (
        <div className="flex-1 flex flex-col">
          <PublicHeader
            activeTab={publicActiveTab}
            setActiveTab={setPublicActiveTab}
          />
          <div className="flex-1">
            <PublicDashboard
              activeTab={publicActiveTab}
              setActiveTab={setPublicActiveTab}
            />
          </div>
          <Footer />
        </div>
      )}

      {portalMode === 'login' && (
        <LoginPage />
      )}

      {portalMode === 'admin' && (
        <AdminDashboard />
      )}

      {/* Discrete Bottom-Left Demo Mode Toolbar */}
      <aside aria-label="Demo Mode Toolbar" className="fixed bottom-4 left-4 z-40 bg-slate-900/90 backdrop-blur-md text-white rounded-2xl p-1.5 shadow-floating border border-slate-700/80 flex items-center gap-1 text-xs">
        <button
          onClick={() => setPortalMode(portalMode === 'public' ? (currentUser ? 'admin' : 'login') : 'public')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-colors bg-white/10 hover:bg-white/20 text-slate-200"
          title="Beralih antara portal publik jamaah & panel pengurus"
        >
          {portalMode === 'public' ? (
            <>
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Buka Admin</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Buka Publik</span>
            </>
          )}
        </button>

        <button
          onClick={handleReset}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Reset Data Demo ke Awal"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </aside>
    </div>
  );
}
