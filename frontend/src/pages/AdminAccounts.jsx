import React, { useState } from 'react';
import {
  Shield,
  Plus,
  X,
  CheckCircle,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Lock,
  UserCheck,
  UserX,
  AlertTriangle,
  KeyRound,
  Phone
} from 'lucide-react';
import { useAppStore } from '../store/store';
import { formatDateTimeWIB } from '../utils/dateUtils';

export default function AdminAccounts() {
  const admins = useAppStore((state) => state.admins);
  const addAdmin = useAppStore((state) => state.addAdmin);
  const updateAdmin = useAppStore((state) => state.updateAdmin);
  const deleteAdmin = useAppStore((state) => state.deleteAdmin);
  const toggleAdminStatus = useAppStore((state) => state.toggleAdminStatus);
  const currentUser = useAppStore((state) => state.currentUser);
  const logout = useAppStore((state) => state.logout);

  // Status Developer untuk akun yang sedang login saat ini
  const isCurrentDev = (currentUser?.username || '').toLowerCase() === 'rofiq' || currentUser?.role === 'Developer';

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  
  // UI states
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Form states
  const [addForm, setAddForm] = useState({
    username: '',
    nama: '',
    password: '',
    no_whatsapp: '',
    role: 'Pengurus',
  });

  const [editForm, setEditForm] = useState({
    id: '',
    username: '',
    nama: '',
    no_whatsapp: '',
    newPassword: '',
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Open add modal (Semua Pengurus dapat menambahkan)
  const openAddModal = () => {
    setAddForm({
      username: '',
      nama: '',
      password: '',
      no_whatsapp: '',
      role: 'Pengurus',
    });
    setErrorMessage('');
    setShowPassword(false);
    setAddModalOpen(true);
  };

  // Open edit modal (Semua akun selain Developer dapat diedit, Developer hanya oleh dirinya sendiri)
  const openEditModal = (adm) => {
    const isTargetDev = (adm.username || '').toLowerCase() === 'rofiq' || adm.role === 'Developer';
    const isSelf = currentUser && adm.id === currentUser.id;

    if (isTargetDev && !isSelf) {
      showToast('Akun utama Developer (@rofiq) tidak dapat diubah oleh pengurus lain.');
      return;
    }

    setEditForm({
      id: adm.id,
      username: adm.username,
      nama: adm.nama,
      no_whatsapp: adm.no_whatsapp || adm.email || '',
      newPassword: '',
    });
    setErrorMessage('');
    setShowEditPassword(false);
    setEditModalOpen(true);
  };

  // Handle Add Admin
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!addForm.nama.trim()) {
      setErrorMessage('Nama lengkap pengurus wajib diisi.');
      return;
    }
    if (!addForm.username.trim()) {
      setErrorMessage('Username login wajib diisi.');
      return;
    }
    if (!addForm.password || addForm.password.trim().length < 6) {
      setErrorMessage('Kata sandi wajib diisi (minimal 6 karakter).');
      return;
    }

    setIsSubmitting(true);
    try {
      await addAdmin({
        nama: addForm.nama.trim(),
        username: addForm.username.trim().toLowerCase(),
        password: addForm.password.trim(),
        no_whatsapp: addForm.no_whatsapp.trim() || null,
        role: 'Pengurus',
      });
      setAddModalOpen(false);
      showToast(`Akun pengurus "${addForm.nama}" (@${addForm.username.toLowerCase()}) berhasil dibuat.`);
    } catch (err) {
      setErrorMessage(err.message || 'Gagal menambahkan akun pengurus.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Admin / Change Password
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!editForm.nama.trim()) {
      setErrorMessage('Nama lengkap pengurus wajib diisi.');
      return;
    }

    if (editForm.newPassword && editForm.newPassword.trim().length < 6) {
      setErrorMessage('Kata sandi baru minimal 6 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nama: editForm.nama.trim(),
        no_whatsapp: editForm.no_whatsapp.trim() || null,
      };
      if (editForm.newPassword && editForm.newPassword.trim()) {
        payload.password = editForm.newPassword.trim();
      }

      await updateAdmin(editForm.id, payload);
      setEditModalOpen(false);
      showToast(`Data pengurus "${editForm.nama}" berhasil diperbarui${editForm.newPassword ? ' dan kata sandi telah diubah' : ''}.`);
    } catch (err) {
      setErrorMessage(err.message || 'Gagal memperbarui data pengurus.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Admin (Pengurus lain dapat dihapus, kecuali Developer dan akun sendiri)
  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;

    const isTargetDev = (deleteConfirmTarget.username || '').toLowerCase() === 'rofiq' || deleteConfirmTarget.role === 'Developer';
    if (isTargetDev) {
      showToast('Akun Developer (@rofiq) adalah akun pengembang sistem utama dan tidak dapat dihapus.');
      setDeleteConfirmTarget(null);
      return;
    }

    const isSelf = currentUser && deleteConfirmTarget.id === currentUser.id;
    if (isSelf) {
      showToast('Anda tidak dapat menghapus akun Anda sendiri.');
      setDeleteConfirmTarget(null);
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteAdmin(deleteConfirmTarget.id);
      setDeleteConfirmTarget(null);
      showToast(`Akun pengurus "${deleteConfirmTarget.nama}" (@${deleteConfirmTarget.username}) berhasil dihapus.`);
    } catch (err) {
      showToast(`Gagal menghapus: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-floating border border-slate-700 flex items-center gap-3 animate-slide-up text-xs sm:text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Explanatory Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-brand-700/50 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
            <Lock className="w-3.5 h-3.5" />
            <span>Manajemen Akun Pengurus</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Kelola Akun & Kata Sandi Pengurus</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Setiap akun pengurus memiliki <strong>username dan kata sandi mandiri</strong>. Akun baru yang dibuat otomatis memiliki hak akses sebagai Pengurus. Akun Developer utama dilindungi secara permanen dari penghapusan atau perubahan oleh akun lain.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] shrink-0 self-start md:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>+ Buat Akun Pengurus Baru</span>
        </button>
      </div>

      {/* Admin List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Daftar Akun Pengurus Aktif ({admins.length})</h3>
          </div>
        </div>

        {/* Mobile Admin Cards View */}
        <div className="sm:hidden divide-y divide-slate-100">
          {admins.map((adm) => {
            const isSelf = currentUser && adm.id === currentUser.id;
            const isTargetDev = (adm.username || '').toLowerCase() === 'rofiq' || adm.role === 'Developer';
            const canEdit = !isTargetDev || isSelf;
            const canToggle = !isTargetDev && !isSelf;
            const canDelete = !isTargetDev && !isSelf;

            return (
              <div key={adm.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm shrink-0 ${
                      isTargetDev ? 'bg-purple-100 text-purple-800' : 'bg-brand-100 text-brand-800'
                    }`}>
                      {adm.nama ? adm.nama.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
                        <span>{adm.nama}</span>
                        {isSelf && (
                          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full border border-emerald-300 shrink-0">
                            Anda
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-brand-700 font-mono font-semibold">@{adm.username}</div>
                      {(adm.no_whatsapp || adm.email) && (
                        <div className="text-[11px] text-slate-500 font-mono truncate flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{adm.no_whatsapp || adm.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {isTargetDev ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
                        <Shield className="w-3 h-3 text-purple-600" />
                        Dev
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Pengurus
                      </span>
                    )}
                    {adm.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <UserCheck className="w-3 h-3" /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                        <UserX className="w-3 h-3" /> Nonaktif
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-[11px] text-slate-400">
                    Login: {adm.lastLogin ? formatDateTimeWIB(adm.lastLogin) : '-'}
                  </span>
                  <div className="flex items-center gap-2">
                    {canToggle && (
                      <button
                        onClick={() => toggleAdminStatus(adm.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          adm.isActive
                            ? 'bg-amber-50 text-amber-800 active:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-700 active:bg-emerald-100'
                        }`}
                      >
                        {adm.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => openEditModal(adm)}
                        className="p-2 rounded-lg text-slate-600 hover:text-brand-800 bg-slate-100 active:bg-slate-200 transition-colors"
                        title={isSelf ? "Ubah profil" : "Ubah profil"}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setDeleteConfirmTarget(adm)}
                        className="p-2 rounded-lg text-rose-600 hover:text-rose-800 bg-rose-50 active:bg-rose-100 transition-colors"
                        title="Hapus akun"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Nama Pengurus</th>
                <th className="px-5 py-3.5">Username Login</th>
                <th className="px-5 py-3.5">Hak Akses</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Login Terakhir</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map((adm) => {
                const isSelf = currentUser && adm.id === currentUser.id;
                const isTargetDev = (adm.username || '').toLowerCase() === 'rofiq' || adm.role === 'Developer';

                // Logika hak aksi:
                // 1. canEdit: Akun sendiri SELALU bisa diedit. Pengurus lain (selain Developer) bisa diedit. Akun Developer hanya bisa diedit oleh Developer sendiri.
                const canEdit = !isTargetDev || isSelf;

                // 2. canToggle: Pengurus lain (selain Developer dan akun sendiri) bisa di-toggle statusnya.
                const canToggle = !isTargetDev && !isSelf;

                // 3. canDelete: Pengurus lain (selain Developer dan akun sendiri) bisa dihapus.
                const canDelete = !isTargetDev && !isSelf;

                return (
                  <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                          isTargetDev ? 'bg-purple-100 text-purple-800' : 'bg-brand-100 text-brand-800'
                        }`}>
                          {adm.nama ? adm.nama.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block text-sm flex items-center gap-1.5">
                            {adm.nama}
                            {isSelf && (
                              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full border border-emerald-300">
                                Akun Anda
                              </span>
                            )}
                          </span>
                          {(adm.no_whatsapp || adm.email) ? (
                            <span className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{adm.no_whatsapp || adm.email}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Tidak ada WhatsApp</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-brand-700 font-semibold">
                      @{adm.username}
                    </td>
                    <td className="px-5 py-4">
                      {isTargetDev ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1 shadow-2xs">
                          <Shield className="w-3 h-3 text-purple-600" />
                          Developer
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Pengurus
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {adm.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <UserCheck className="w-3 h-3 text-emerald-600" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                          <UserX className="w-3 h-3 text-rose-600" /> Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {adm.lastLogin ? formatDateTimeWIB(adm.lastLogin) : '-'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tombol Ubah / Reset Password */}
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(adm)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-brand-800 hover:bg-slate-100 transition-colors"
                            title={isSelf ? "Ubah profil / kata sandi akun Anda" : `Ubah profil / reset kata sandi @${adm.username}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Tombol Toggle Status (Hanya Developer terhadap pengurus lain) */}
                        {canToggle && (
                          <button
                            onClick={() => toggleAdminStatus(adm.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              adm.isActive
                                ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title={adm.isActive ? 'Nonaktifkan akun pengurus' : 'Aktifkan akun pengurus'}
                          >
                            {adm.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        )}

                        {/* Status Akun Utama / Tombol Hapus / Label Akun Anda */}
                        {isTargetDev ? (
                          <span
                            className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 select-none inline-flex items-center gap-1"
                            title="Akun Developer utama sistem (tidak dapat dihapus atau dinonaktifkan)"
                          >
                            <Shield className="w-3 h-3 text-purple-600" />
                            Utama
                          </span>
                        ) : canDelete ? (
                          <button
                            onClick={() => setDeleteConfirmTarget(adm)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title={`Hapus akun pengurus @${adm.username} secara permanen`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : isSelf ? (
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 select-none">
                            Akun Anda
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 select-none px-2">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Akun Pengurus */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-5 shadow-floating border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Buat Akun Pengurus Baru</h3>
                  <p className="text-xs text-slate-500">Tentukan nama, username, dan kata sandi mandiri</p>
                </div>
              </div>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Nama Lengkap Pengurus *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.nama}
                  onChange={(e) => setAddForm({ ...addForm, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Username Login *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Digunakan untuk masuk login ke sistem (huruf kecil & tanpa spasi).
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Kata Sandi (Password) *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Bebas Anda tentukan sendiri. Pengurus bersangkutan akan login menggunakan kata sandi ini.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Nomor WhatsApp (Opsional)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={addForm.no_whatsapp}
                    onChange={(e) => setAddForm({ ...addForm, no_whatsapp: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Akun Pengurus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ubah Data / Ganti Password */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-5 shadow-floating border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-50 text-brand-700">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {currentUser && editForm.id === currentUser.id
                      ? 'Ubah Profil & Kata Sandi Akun Anda'
                      : `Ubah Akun & Reset Sandi (@${editForm.username})`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {currentUser && editForm.id === currentUser.id
                      ? 'Perbarui nama lengkap atau ganti kata sandi login Anda'
                      : `Kelola akun pengurus @${editForm.username}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Nama Lengkap Pengurus *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nama}
                  onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Nomor WhatsApp (Opsional)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={editForm.no_whatsapp}
                    onChange={(e) => setEditForm({ ...editForm, no_whatsapp: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Kata Sandi Baru (Opsional)
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Isi hanya jika Anda ingin mengganti kata sandi pengurus ini (minimal 6 karakter).
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Akun */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full space-y-4 shadow-floating border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base">Hapus Akun Pengurus?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Apakah Anda yakin ingin menghapus akun pengurus <strong>{deleteConfirmTarget.nama}</strong> (@{deleteConfirmTarget.username})? Tindakan ini bersifat permanen.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus Akun'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
