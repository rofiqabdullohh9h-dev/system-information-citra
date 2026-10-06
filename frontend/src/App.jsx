import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAppStore } from './store/store';
import PublicHeader from './components/common/PublicHeader';
import Footer from './components/common/Footer';
import PublicDashboard from './pages/PublicDashboard';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

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
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-md text-center space-y-3">
            <h2 className="text-lg font-bold text-slate-800">Terjadi Kesalahan Tampilan</h2>
            <p className="text-xs text-slate-500">
              {this.state.error?.message || 'Halaman mengalami kendala saat dimuat.'}
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

  const [publicActiveTab, setPublicActiveTab] = useState('jadwal');

  // 1. Sync browser URL and handle Back/Forward browser navigation
  useEffect(() => {
    const currentPath = window.location.pathname.toLowerCase();
    if (currentPath.startsWith('/pengurus') || currentPath.startsWith('/admin')) {
      window.history.replaceState({ mode: currentUser ? 'admin' : 'login' }, '', '/penggurus');
    }

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

  // 2. Sync data on mount, window focus / visibility change, and gentle background polling
  useEffect(() => {
    fetchData();

    const handleSync = () => {
      if (!document.hidden) {
        fetchData();
      }
    };
    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

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
  }, [currentUser, fetchData]);

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
