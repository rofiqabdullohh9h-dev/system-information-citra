import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAppStore } from './store/store';
import PublicHeader from './components/common/PublicHeader';
import Footer from './components/common/Footer';
import PublicDashboard from './pages/PublicDashboard';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { isTokenExpired } from './utils/authUtils';

const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('App Error Boundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      const isChunkError = (
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message?.includes('MIME type of "text/html"') ||
        this.state.error?.message?.includes('dynamically imported module')
      );

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-md text-center space-y-3">
            <h2 className="text-lg font-bold text-slate-800">
              {isChunkError ? 'Pembaruan Sistem Tersedia' : 'Terjadi Kesalahan Tampilan'}
            </h2>
            <p className="text-xs text-slate-500">
              {isChunkError 
                ? 'Versi aplikasi baru telah diperbarui. Silakan muat ulang halaman untuk memuat fitur dan data terbaru.'
                : (this.state.error?.message || 'Halaman mengalami kendala saat dimuat.')}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const portalMode = useAppStore((state) => state.portalMode);
  const setPortalMode = useAppStore((state) => state.setPortalMode);
  const currentUser = useAppStore((state) => state.currentUser);
  const fetchData = useAppStore((state) => state.fetchData);
  const handleSessionExpired = useAppStore((state) => state.handleSessionExpired);

  const [publicActiveTab, setPublicActiveTab] = useState('jadwal');

  // Helper periksa apakah sesi pengurus telah berakhir
  const checkTokenExpiry = () => {
    const token = localStorage.getItem('siap_token');
    if (currentUser && token && isTokenExpired(token)) {
      handleSessionExpired('Sesi login Anda telah berakhir (3 jam). Silakan masuk kembali.');
      return true;
    }
    return false;
  };

  // 1. Sync browser URL and handle Back/Forward browser navigation
  useEffect(() => {
    const currentPath = window.location.pathname.toLowerCase();
    if (currentPath.startsWith('/pengurus') || currentPath.startsWith('/admin')) {
      const token = localStorage.getItem('siap_token');
      const isExpired = token && isTokenExpired(token);
      window.history.replaceState({ mode: (currentUser && !isExpired) ? 'admin' : 'login' }, '', '/penggurus');
    }

    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/penggurus') || path.startsWith('/pengurus') || path.startsWith('/admin')) {
        const token = localStorage.getItem('siap_token');
        const user = useAppStore.getState().currentUser;
        if (user && token && !isTokenExpired(token)) {
          setPortalMode('admin');
        } else {
          if (token && isTokenExpired(token)) {
            handleSessionExpired('Sesi login Anda telah berakhir (3 jam). Silakan masuk kembali.');
          } else {
            setPortalMode('login');
          }
        }
      } else {
        setPortalMode('public');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser, setPortalMode, handleSessionExpired]);

  // 2. Sync data on mount, window focus / visibility change, and local multi-tab instant sync
  useEffect(() => {
    if (checkTokenExpiry()) return;
    fetchData();

    // Trigger sync saat tab aktif kembali (hemat credit: hanya dipanggil saat pengguna kembali ke tab)
    const handleSync = () => {
      if (!document.hidden) {
        if (checkTokenExpiry()) return;
        fetchData();
      }
    };
    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    // Tangani event custom jika interceptor API mendeteksi 401
    const handleCustomSessionExpired = (e) => {
      handleSessionExpired(e?.detail?.message);
    };
    window.addEventListener('siap:session-expired', handleCustomSessionExpired);

    // Sinkronisasi instan antar tab/jendela di browser yang sama (0 ms, 0 network cost)
    const handleStorage = (e) => {
      if (e.key === 'siap_last_mutation' || e.key?.startsWith('siap_')) {
        if (checkTokenExpiry()) return;
        fetchData();
      }
    };
    window.addEventListener('storage', handleStorage);

    let bc = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('siap_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'DATA_SYNC') {
            if (checkTokenExpiry()) return;
            fetchData();
          }
        };
      } catch {}
    }

    return () => {
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('siap:session-expired', handleCustomSessionExpired);
      document.removeEventListener('visibilitychange', handleSync);
      if (bc) bc.close();
    };
  }, [currentUser, fetchData, handleSessionExpired]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
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
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          }>
            <LoginPage />
          </Suspense>
        )}

        {portalMode === 'admin' && (
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          }>
            <AdminDashboard />
          </Suspense>
        )}
      </div>
    </ErrorBoundary>
  );
}
