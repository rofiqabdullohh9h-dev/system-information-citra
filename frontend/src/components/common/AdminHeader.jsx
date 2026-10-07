import React from 'react';
import { Menu, ExternalLink, Calendar } from 'lucide-react';
import { useAppStore } from '../../store/store';

export default function AdminHeader({ currentSection, setMobileOpen, onQuickAction }) {
  const currentUser = useAppStore((state) => state.currentUser);
  const setPortalMode = useAppStore((state) => state.setPortalMode);

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

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between">
      {/* Left: Mobile Toggle & Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden shrink-0"
          aria-label="Buka menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-lg font-bold text-slate-900 truncate">
              {getSectionTitle(currentSection)}
            </h1>
            <span className={`hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-semibold border shrink-0 ${
              currentUser?.role === 'Developer' || currentUser?.username?.toLowerCase() === 'rofiq'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-emerald-50 text-brand-700 border-emerald-200'
            }`}>
              {currentUser?.role === 'Developer' || currentUser?.username?.toLowerCase() === 'rofiq' ? 'Developer' : 'Pengurus'}
            </span>
          </div>
          <p className="text-xs text-slate-500 hidden sm:block">
            Sistem Informasi & Absensi Kelompok Citra
          </p>
        </div>
      </div>

      {/* Right: Quick actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <button
          onClick={() => setPortalMode('public')}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
          title="Pratinjau tampilan publik jamaah"
        >
          <ExternalLink className="w-3.5 h-3.5 text-brand-600" />
          <span>Portal Publik</span>
        </button>

        {/* Quick action button based on context */}
        {currentSection !== 'events' && (
          <button
            onClick={() => onQuickAction && onQuickAction('add-event')}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-xl shadow-xs transition-colors shadow-brand-700/20"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-300" />
            <span className="hidden sm:inline">+ Tambah Event</span>
            <span className="sm:hidden">+ Event</span>
          </button>
        )}
      </div>
    </header>
  );
}
