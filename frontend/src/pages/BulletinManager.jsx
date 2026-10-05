import React, { useState, useMemo, useRef } from 'react';
import {
  Megaphone,
  Newspaper,
  Plus,
  Search,
  Pin,
  Calendar,
  User,
  Edit,
  Trash2,
  ExternalLink,
  Image,
  Upload,
  CheckCircle2,
  X,
  AlertCircle,
  Clock,
  Sparkles,
  Share2
} from 'lucide-react';
import { useAppStore } from '../store/store';

export default function BulletinManager() {
  const bulletins = useAppStore((state) => state.bulletins || []);
  const addBulletin = useAppStore((state) => state.addBulletin);
  const updateBulletin = useAppStore((state) => state.updateBulletin);
  const deleteBulletin = useAppStore((state) => state.deleteBulletin);
  const currentUser = useAppStore((state) => state.currentUser);

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'PENGUMUMAN' | 'BERITA'
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran gambar maksimal 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, gambar_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // Form State
  const [formData, setFormData] = useState({
    tipe: 'PENGUMUMAN',
    judul: '',
    kategori: 'Umum',
    konten: '',
    gambar_url: '',
    lampiran_link: '',
    is_pinned: false,
    tanggal_publikasi: new Date().toISOString().split('T')[0],
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered bulletins list
  const filteredList = useMemo(() => {
    return bulletins.filter((item) => {
      const matchType = activeTab === 'ALL' || item.tipe === activeTab;
      const matchSearch =
        (item.judul || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.konten || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.kategori || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  }, [bulletins, activeTab, searchQuery]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      tipe: 'PENGUMUMAN',
      judul: '',
      kategori: 'Umum',
      konten: '',
      gambar_url: '',
      lampiran_link: '',
      is_pinned: false,
      tanggal_publikasi: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      tipe: item.tipe || 'PENGUMUMAN',
      judul: item.judul || '',
      kategori: item.kategori || 'Umum',
      konten: item.konten || '',
      gambar_url: item.gambar_url || '',
      lampiran_link: item.lampiran_link || '',
      is_pinned: Boolean(item.is_pinned),
      tanggal_publikasi: item.tanggal_publikasi ? item.tanggal_publikasi.split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.judul.trim() || !formData.konten.trim()) {
      showToast('Judul dan isi konten tidak boleh kosong!');
      return;
    }

    try {
      if (editingItem) {
        await updateBulletin(editingItem.id, formData);
        showToast(`Berhasil memperbarui ${formData.tipe.toLowerCase()}.`);
      } else {
        await addBulletin(formData);
        showToast(`Alhamdulillah! ${formData.tipe === 'BERITA' ? 'Berita' : 'Pengumuman'} baru berhasil diterbitkan.`);
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast(`Gagal: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBulletin(id);
      showToast('Warta / pengumuman berhasil dihapus.');
      setDeleteConfirmId(null);
    } catch (err) {
      showToast(`Gagal menghapus: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-floating border border-slate-700 flex items-center gap-3 animate-slide-up text-xs sm:text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Megaphone className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Pengumuman & Warta Berita Ormas</h2>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-brand-700/20 transition-all hover:scale-[1.01] self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pengumuman / Berita</span>
        </button>
      </div>

      {/* Control Bar: Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({bulletins.length})
          </button>
          <button
            onClick={() => setActiveTab('PENGUMUMAN')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'PENGUMUMAN'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Pengumuman ({bulletins.filter(b => b.tipe === 'PENGUMUMAN').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('BERITA')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'BERITA'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>Berita & Dokumentasi ({bulletins.filter(b => b.tipe === 'BERITA').length})</span>
          </button>
        </div>

        {/* Live Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>
      </div>

      {/* Bulletins Grid List */}
      {filteredList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredList.map((item) => {
            const isBerita = item.tipe === 'BERITA';
            const isPinned = Boolean(item.is_pinned);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-subtle hover:shadow-card ${
                  isPinned ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
                }`}
              >
                {/* Image Banner if available (Especially for News / Documentation) */}
                {item.gambar_url && (
                  <div className="w-full h-44 bg-slate-100 overflow-hidden relative group">
                    <img
                      src={item.gambar_url}
                      alt={item.judul}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Pin badge if pinned */}
                    {isPinned && (
                      <div className="flex justify-end mb-2.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                          <Pin className="w-3 h-3 text-amber-600" />
                          Disematkan
                        </span>
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2 hover:text-brand-800 transition-colors">
                      {item.judul}
                    </h3>

                    {/* Date & Author */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(item.tanggal_publikasi || item.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 truncate max-w-[120px]">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {item.penulis || 'Pengurus'}
                      </span>
                    </div>

                    {/* Content preview */}
                    <p className="text-xs text-slate-600 mt-3 line-clamp-3 leading-relaxed whitespace-pre-line">
                      {item.konten}
                    </p>

                    {/* External Link if provided */}
                    {item.lampiran_link && (
                      <a
                        href={item.lampiran_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-brand-700 hover:text-brand-800 font-semibold mt-2.5 underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Buka Tautan Lampiran</span>
                      </a>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      ID #{item.id}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                        title="Edit Warta"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {deleteConfirmId === item.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-bold"
                          >
                            Ya, Hapus
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-1.5 py-1 rounded bg-slate-200 text-slate-700 text-[11px]"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Warta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Megaphone className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-base">Belum Ada Pengumuman atau Warta</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Gunakan tombol di atas untuk menerbitkan maklumat penting atau dokumentasi kegiatan ormas yang telah dilaksanakan.
          </p>
        </div>
      )}

      {/* Modal Form Buat / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-floating border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {editingItem ? 'Edit Warta / Pengumuman' : 'Terbitkan Pengumuman atau Berita Baru'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Informasi ini akan langsung tampil di portal publik jamaah.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
              {/* Type Switcher: Pengumuman vs Berita */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Jenis Konten Informasi:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipe: 'PENGUMUMAN' })}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      formData.tipe === 'PENGUMUMAN'
                        ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Megaphone className={`w-5 h-5 ${formData.tipe === 'PENGUMUMAN' ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className="font-bold text-xs sm:text-sm text-slate-900">Pengumuman</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipe: 'BERITA' })}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      formData.tipe === 'BERITA'
                        ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Newspaper className={`w-5 h-5 ${formData.tipe === 'BERITA' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="font-bold text-xs sm:text-sm text-slate-900">Berita / Dokumentasi</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Judul Informasi
                </label>
                <input
                  type="text"
                  required
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                />
              </div>

              {/* Tanggal Publikasi */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Tanggal Publikasi</label>
                <input
                  type="date"
                  value={formData.tanggal_publikasi}
                  onChange={(e) => setFormData({ ...formData, tanggal_publikasi: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Pin Switch */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pin className="w-4 h-4 text-amber-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Sematkan di Beranda Publik (Pin Banner)</span>
                    <span className="text-[11px] text-slate-500">Tampilkan di posisi teratas atau banner berjalan portal jamaah.</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.is_pinned}
                  onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                  className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                />
              </div>

              {/* Content Body */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Isi Pengumuman / Narasi Berita
                </label>
                <textarea
                  rows={5}
                  required
                  value={formData.konten}
                  onChange={(e) => setFormData({ ...formData, konten: e.target.value })}
                  className="w-full p-3.5 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-sans"
                />
              </div>

              {/* Upload Foto Dokumentasi */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-slate-400" />
                  <span>Foto Dokumentasi / Gambar</span>
                </label>

                {formData.gambar_url ? (
                  <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-2">
                    <img
                      src={formData.gambar_url}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 flex items-center gap-1.5 shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        Ganti Foto
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, gambar_url: '' })}
                        className="px-3 py-1.5 text-xs font-medium bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-600 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        Hapus Foto
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-brand-50/30 flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <Upload className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="text-xs text-slate-600 font-semibold">
                      Klik untuk upload foto kegiatan
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Format PNG, JPG, JPEG (Maks. 5MB)
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </div>

              {/* Attachment Link */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tautan Lampiran Dokumen</span>
                </label>
                <input
                  type="url"
                  value={formData.lampiran_link}
                  onChange={(e) => setFormData({ ...formData, lampiran_link: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-xl shadow-md transition-all"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Terbitkan Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
