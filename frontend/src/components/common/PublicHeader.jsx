import React, { useState } from 'react';
import { Calendar, BarChart3, LogIn, Menu, X, Megaphone, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../../store/store';

export default function PublicHeader({ activeTab, setActiveTab }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const currentUser = useAppStore((state) => state.currentUser);
  const setPortalMode = useAppStore((state) => state.setPortalMode);

  const navItems = [
    { id: 'jadwal', label: 'Jadwal Pengajian', icon: Calendar },
    { id: 'warta', label: 'Berita & Pengumuman', icon: Megaphone },
    { id: 'statistik', label: 'Statistik Kehadiran', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveTab('jadwal')}
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-brand-700/20 group-hover:scale-105 transition-transform duration-200">
              <span className="font-bold text-lg tracking-wider">SIC</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg sm:text-xl text-slate-900 tracking-tight">Sistem Informasi Citra</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/70">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-white text-brand-800 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action: Admin Login or Dashboard Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
              <button
                onClick={() => setPortalMode('admin')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs sm:text-sm font-medium shadow-sm transition-all shadow-brand-700/20 hover:shadow-brand-700/30"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span className="hidden sm:inline">Panel Pengurus</span>
                <span className="sm:hidden">Admin</span>
              </button>
            ) : (
              <button
                onClick={() => setPortalMode('login')}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl border border-slate-300 hover:border-brand-600 bg-white hover:bg-emerald-50/50 text-slate-700 hover:text-brand-700 text-xs sm:text-sm font-medium transition-all shadow-xs"
              >
                <LogIn className="w-4 h-4 text-slate-400 group-hover:text-brand-600 shrink-0" />
                <span className="hidden sm:inline">Login Pengurus</span>
                <span className="sm:hidden font-semibold">Login</span>
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-100 space-y-1 animate-fade-in">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-brand-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
