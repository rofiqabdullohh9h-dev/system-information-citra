import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Users,
  Tags,
  BarChart3,
  Shield,
  History,
  LogOut,
  ExternalLink,
  ChevronRight,
  Megaphone,
  X
} from 'lucide-react';
import { useAppStore } from '../../store/store';

export default function AdminSidebar({ currentSection, setCurrentSection, mobileOpen, setMobileOpen }) {
  const currentUser = useAppStore((state) => state.currentUser);
  const logout = useAppStore((state) => state.logout);
  const setPortalMode = useAppStore((state) => state.setPortalMode);

  const menuItems = [
    { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'events', label: 'Jadwal Pengajian', icon: Calendar },
    { id: 'bulletins', label: 'Pengumuman & Berita', icon: Megaphone },
    { id: 'attendance', label: 'Absensi', icon: CheckSquare, badge: 'Hari H' },
    { id: 'jamaah', label: 'Data Jamaah', icon: Users },
    { id: 'categories', label: 'Kategori Jamaah', icon: Tags },
    { id: 'analytics', label: 'Laporan & Analitik', icon: BarChart3 },
    { id: 'admin-manage', label: 'Kelola Pengurus', icon: Shield },
    { id: 'audit', label: 'Audit Trail (Log)', icon: History },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 text-white flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center font-bold text-slate-950 shadow-md shadow-brand-500/20 text-lg">
              SIC
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block">CITRA PANEL</span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Menu Operasional
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentSection(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600/90 text-white shadow-md shadow-brand-700/30 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    isActive ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Akses Publik
          </div>
          <button
            onClick={() => setPortalMode('public')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-emerald-300 hover:bg-slate-800/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ExternalLink className="w-4 h-4 text-emerald-400" />
              <span>Portal Jamaah</span>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
              No Login
            </span>
          </button>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-700/40 text-emerald-300 border border-emerald-600/40 flex items-center justify-center font-bold text-xs uppercase">
                {currentUser?.nama?.charAt(0) || 'A'}
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-semibold text-white block truncate max-w-[120px]">
                  {currentUser?.nama || 'Admin Pengurus'}
                </span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  Pengurus
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Keluar / Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
