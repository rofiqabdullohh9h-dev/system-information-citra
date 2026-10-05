import React, { useState } from 'react';
import {
  Lock,
  User,
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useAppStore } from '../store/store';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const login = useAppStore((state) => state.login);
  const setPortalMode = useAppStore((state) => state.setPortalMode);
  const admins = useAppStore((state) => state.admins);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password) {
      setErrorMessage('Harap isi username dan kata sandi.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(username, password);
      setIsLoading(false);
      if (res && res.success) {
        setPortalMode('admin');
      } else {
        setErrorMessage(res?.message || 'Login gagal. Periksa kembali username dan kata sandi Anda.');
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Terjadi kesalahan jaringan atau server saat login.');
    }
  };

  const handleSelectAccount = (selectedUsername) => {
    setUsername(selectedUsername);
    setPassword('');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial effects */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-brand-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Back to public portal button */}
      <div className="max-w-md w-full mx-auto mb-4">
        <button
          onClick={() => setPortalMode('public')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-400 hover:text-emerald-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Halaman Utama</span>
        </button>
      </div>

      <div className="max-w-md w-full mx-auto">
        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 mx-auto flex items-center justify-center text-white shadow-lg shadow-brand-500/20 font-bold text-xl">
              SIC
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Masuk Panel Pengurus
            </h2>
            <p className="text-xs text-slate-400">
              Sistem Informasi Citra
            </p>
          </div>

          {/* Error notification */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Username Pengurus
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: budi_ketua"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Masukkan kata sandi akun Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-brand-600 hover:from-emerald-400 hover:to-brand-500 text-slate-950 font-bold text-sm shadow-md shadow-brand-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Masuk ke Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Registered Pengurus Accounts List / Hints */}
          <div className="pt-4 border-t border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold uppercase tracking-wider">
                Akun Pengurus Terdaftar:
              </span>
              <span>Klik untuk mengisi username</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* Default accounts or dynamically loaded admins */}
              {(admins && admins.length > 0 ? admins : [
                { id: '1', username: 'budi_ketua', nama: 'Ust. Budi Raharjo' },
                { id: '2', username: 'ani_sekretaris', nama: 'Ustadzah Ani Maryam' }
              ]).map((adm) => (
                <button
                  key={adm.id}
                  type="button"
                  onClick={() => handleSelectAccount(adm.username)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    username === adm.username
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                      : 'bg-slate-900/60 hover:bg-slate-700/60 border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white truncate max-w-[120px]">{adm.nama}</span>
                    <span className="text-[10px] bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded border border-slate-700">
                      Pengurus
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-400 font-mono mt-0.5">@{adm.username}</p>
                </button>
              ))}
            </div>

            <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                <span>Informasi Kata Sandi Mandiri</span>
              </div>
              <p className="leading-relaxed">
                Setiap pengurus memiliki kata sandi mandiri yang dibuat saat pendaftaran akun. Untuk akun bawaan awal sistem (<code className="text-emerald-300">budi_ketua</code> & <code className="text-emerald-300">ani_sekretaris</code>), kata sandi awalnya adalah <code className="text-emerald-300">admin123</code> (dapat diubah di menu Kelola Pengurus).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
