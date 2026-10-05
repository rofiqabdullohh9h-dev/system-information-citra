import React, { useState } from 'react';
import { Menu, ExternalLink, Calendar, RotateCcw, AlertTriangle, X, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../store/store';

export default function AdminHeader({ currentSection, setMobileOpen, onQuickAction }) {
  const currentUser = useAppStore((state) => state.currentUser);
  const setPortalMode = useAppStore((state) => state.setPortalMode);
  const resetDatabase = useAppStore((state) => state.resetDatabase);
  const isResetting = useAppStore((state) => state.isResetting);
  const fetchData = useAppStore((state) => state.fetchData);
  const isLoading = useAppStore((state) => state.isLoading);

  const [showModal, setShowModal] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const getSectionTitle = (sec) => {
    switch (sec) {
      case 'overview': return 'Ringkasan Operasional';
      case 'events': return 'Manajemen Jadwal Pengajian';
      case 'attendance': return 'Absensi Kehadiran';
      case 'jamaah': return 'Data Induk Jamaah';
      case 'categories': return 'Kategori Jamaah';
      case 'analytics': return 'Laporan & Analitik Pengajian';
      case 'admin-manage': return 'Kelola Akun Pengurus';
      case 'audit': return 'Audit Trail & Rekam Aktivitas';
      default: return 'Panel Pengurus';
    }
  };

  const handleConfirmReset = async () => {
    const res = await resetDatabase();
    setShowModal(false);
    setFeedback(res.message || 'Data uji coba berhasil dibersihkan.');
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        {/* Left: Mobile Toggle & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                {getSectionTitle(currentSection)}
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-brand-700 border border-emerald-200">
                Pengurus
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Sistem Informasi & Absensi Kelompok Citra
            </p>
          </div>
        </div>

        {/* Right: Quick actions & Reset button */}
        <div className="flex items-center gap-2.5">
          {/* Tombol Sinkron / Refresh Real-time */}
          <button
            onClick={() => fetchData({ manual: true })}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all shadow-xs disabled:opacity-50"
            title="Muat ulang & sinkronisasi data terbaru dari database Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-brand-700 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Sinkron Data</span>
          </button>

          {/* Tombol Reset Data Uji Coba */}
          <button
            onClick={() => setShowModal(true)}
            disabled={isResetting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-all shadow-xs disabled:opacity-50"
            title="Bersihkan data jadwal, absensi, dan jamaah untuk pengujian ulang"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-amber-600 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reset Data Uji Coba</span>
            <span className="sm:hidden">Reset</span>
          </button>

          <button
            onClick={() => setPortalMode('public')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
            title="Pratinjau tampilan publik jamaah"
          >
            <ExternalLink className="w-3.5 h-3.5 text-brand-600" />
            <span className="hidden sm:inline">Portal Publik</span>
          </button>

          {/* Quick action button based on context */}
          {currentSection !== 'events' && (
            <button
              onClick={() => onQuickAction && onQuickAction('add-event')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-xl shadow-xs transition-colors shadow-brand-700/20"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden xs:inline">+ Tambah Event</span>
            </button>
          )}
        </div>
      </header>

      {/* Floating Feedback Toast */}
      {feedback && (
        <div className="fixed top-16 right-6 z-50 px-4 py-3 bg-slate-900 text-emerald-300 text-xs font-semibold rounded-2xl shadow-floating border border-emerald-500/40 animate-slide-up flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Confirmation Modal for Data Reset */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-scale-up">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset Data Uji Coba</h3>
                <p className="text-xs text-slate-500">Pembersihan data pengujian sistem</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <p className="font-semibold text-slate-800">
                Apakah Anda ingin mengosongkan seluruh data uji coba?
              </p>
              <ul className="space-y-1 list-disc pl-4 text-slate-600">
                <li>Seluruh jadwal pengajian / event akan dikosongkan.</li>
                <li>Seluruh data induk jamaah akan dikosongkan.</li>
                <li>Seluruh rekapan presensi kehadiran akan dihapus.</li>
                <li>Catatan log aktivitas (audit) akan dibersihkan.</li>
              </ul>
              <div className="pt-2 text-emerald-800 font-semibold border-t border-slate-200/60">
                ✓ Akun Pengurus dan 5 Kategori Master tetap dipertahankan.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isResetting ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mereset Data...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ya, Bersihkan Data Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

