import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Share2,
  CheckCircle,
  X,
  AlertTriangle,
  Users,
  Clock,
  MapPin,
  Shield,
  Sparkles
} from 'lucide-react';
import { useAppStore } from '../store/store';

export default function EventManagement() {
  const events = useAppStore((state) => state.events);
  const categories = useAppStore((state) => state.categories);
  const addEvent = useAppStore((state) => state.addEvent);
  const updateEvent = useAppStore((state) => state.updateEvent);
  const deleteEvent = useAppStore((state) => state.deleteEvent);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [waModalEvent, setWaModalEvent] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    tema: '',
    pembicara: '',
    lokasi: '',
    tanggal: new Date().toISOString().split('T')[0],
    waktu: '',
    deskripsi: '',
    targetCategoryIds: [1], // 1 Kategori yang ditentukan pengurus
    target_gender: 'ALL',   // 'ALL' | 'L' | 'P'
    is_published: true,
    show_attendees: false,
    show_statistics: true,
  });

  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    setEditingEvent(null);
    setFormData({
      tema: '',
      pembicara: '',
      lokasi: '',
      tanggal: new Date().toISOString().split('T')[0],
      waktu: '',
      deskripsi: '',
      targetCategoryIds: [categories[0]?.id || 1],
      target_gender: 'ALL',
      is_published: true,
      show_attendees: false,
      show_statistics: true,
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (event) => {
    const catId = event.targetCategoryIds && event.targetCategoryIds.length > 0 
      ? event.targetCategoryIds[0] 
      : (event.targetCategories && event.targetCategories.length > 0 ? event.targetCategories[0].id : 1);

    setEditingEvent(event);
    setFormData({
      tema: event.tema,
      pembicara: event.pembicara || '',
      lokasi: event.lokasi || '',
      tanggal: event.tanggal ? new Date(event.tanggal).toISOString().split('T')[0] : '',
      waktu: event.waktu || '',
      deskripsi: event.deskripsi || '',
      targetCategoryIds: [catId],
      target_gender: event.target_gender || 'ALL',
      is_published: event.is_published !== undefined ? event.is_published : true,
      show_attendees: event.show_attendees || false,
      show_statistics: event.show_statistics !== undefined ? event.show_statistics : true,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.tema.trim()) {
      setFormError('Tema pengajian wajib diisi.');
      return;
    }

    // FR-VISIBILITY-007: minimal 1 of show_attendees or show_statistics must be true if is_published=true
    if (formData.is_published && !formData.show_attendees && !formData.show_statistics) {
      setFormError('Jika acara dipublikasikan, minimal salah satu toggle (Tampilkan Nama atau Tampilkan Statistik) harus aktif.');
      return;
    }

    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, formData);
      } else {
        await addEvent(formData);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan kegiatan ke database.');
    }
  };


  const handleDelete = (id) => {
    deleteEvent(id);
    setDeleteConfirmId(null);
  };

  // WhatsApp template preview
  const generateWaText = (event) => {
    const cat = categories.find(c => c.id === (event.targetCategoryIds?.[0] || 1))?.nama_kategori || 'Umum';
    const genderSuffix = event.target_gender === 'L' ? ' (Khusus Pria)' : event.target_gender === 'P' ? ' (Khusus Wanita)' : '';
    const pemateriText = event.pembicara && event.pembicara.trim() ? `🎙️ *Pemateri:* ${event.pembicara}\n` : '';
    return `*INFORMASI JADWAL PENGAJIAN*\n\n` +
      `📌 *Tema:* ${event.tema}\n` +
      `📅 *Hari/Tanggal:* ${new Date(event.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n` +
      `⏰ *Waktu:* ${event.waktu}\n` +
      pemateriText +
      `📍 *Lokasi:* ${event.lokasi || '-'}\n` +
      `👥 *Sasaran:* ${cat}${genderSuffix}\n\n` +
      `${event.deskripsi ? `_\"${event.deskripsi}\"_\n\n` : ''}` +
      `Mari hadir tepat waktu menjalin ukhuwah & thalabul 'ilmi.\n` +
      `Tautan Portal Jamaah: ${window.location.origin}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Daftar Jadwal Pengajian</h2>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-all hover:scale-[1.01] self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Buat Jadwal Baru</span>
        </button>
      </div>

      {/* Events Table / Card List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Tema & Pemateri</th>
                <th className="px-5 py-3.5">Jadwal & Waktu</th>
                <th className="px-5 py-3.5">Target Kategori</th>
                <th className="px-5 py-3.5">Visibilitas Publik</th>
                <th className="px-5 py-3.5">Privasi Nama</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((event) => {
                const eventCats = (event.targetCategoryIds || []).map(id => categories.find(c => c.id === id)).filter(Boolean);
                return (
                  <tr key={event.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-900 block line-clamp-1 text-sm">{event.tema}</span>
                      {event.pembicara && event.pembicara.trim() && (
                        <span className="text-xs text-brand-700 font-medium">{event.pembicara}</span>
                      )}
                      <span className="text-[11px] text-slate-400 block line-clamp-1">{event.lokasi}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        {new Date(event.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-slate-500">{event.waktu}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1 max-w-[200px]">
                        {eventCats.map(c => (
                          <span key={c.id} className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block w-fit">
                            {c.nama_kategori}
                          </span>
                        ))}
                        {event.target_gender === 'L' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 inline-block w-fit">
                            🧔 Khusus Pria
                          </span>
                        )}
                        {event.target_gender === 'P' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-50 text-pink-800 border border-pink-200 inline-block w-fit">
                            🧕 Khusus Wanita
                          </span>
                        )}
                        {(!event.target_gender || event.target_gender === 'ALL') && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 inline-block w-fit">
                            👥 Pria & Wanita
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {event.is_published ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                          <Eye className="w-3 h-3 text-emerald-700" /> Publik
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          <EyeOff className="w-3 h-3 text-slate-400" /> Internal
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {event.show_attendees ? (
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Nama Terbuka
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title="Daftar nama disembunyikan untuk privasi">
                          Nama Tersembunyi
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setWaModalEvent(event)}
                          title="Generate WA Template"
                          className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(event)}
                          title="Edit Acara"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-brand-800 hover:bg-slate-100 border border-slate-200 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(event.id)}
                          title="Hapus Acara"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Event */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-floating border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-700" />
                {editingEvent ? 'Ubah Data Jadwal Pengajian' : 'Buat Jadwal Pengajian Baru'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Nama Kegiatan *
                </label>
                <input
                  type="text"
                  required
                  value={formData.tema}
                  onChange={(e) => setFormData({ ...formData, tema: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Pemateri
                  </label>
                  <input
                    type="text"
                    value={formData.pembicara}
                    onChange={(e) => setFormData({ ...formData, pembicara: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Lokasi
                  </label>
                  <input
                    type="text"
                    value={formData.lokasi}
                    onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    tanggal *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Jam *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.waktu}
                    onChange={(e) => setFormData({ ...formData, waktu: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Target Kategori Acara (Pilih 1 Kategori) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Kategori Acara (Pilih 1 Kategori) *
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const isSelected = (formData.targetCategoryIds[0] || 1) === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setFormData({ ...formData, targetCategoryIds: [cat.id] })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-brand-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat.nama_kategori}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Jenis Kelamin Peserta */}
              <div>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, target_gender: 'ALL' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      (formData.target_gender || 'ALL') === 'ALL'
                        ? 'bg-emerald-50 border-brand-600 text-brand-900 ring-2 ring-brand-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, target_gender: 'L' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      formData.target_gender === 'L'
                        ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Khusus Pria
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, target_gender: 'P' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      formData.target_gender === 'P'
                        ? 'bg-pink-50 border-pink-600 text-pink-900 ring-2 ring-pink-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Khusus Wanita
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Deskripsi / catatan
                </label>
                <textarea
                  rows={2}
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              {/* Visibility Controls Box (FR-VISIBILITY) */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider block">
                  Pengaturan Visibilitas & Privasi (Privacy Toggles)
                </span>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Publikasikan Acara (is_published)</span>
                    <span className="text-[11px] text-slate-500">Tampilkan di portal publik jamaah</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-emerald-100 pt-2.5">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Tampilkan Nama Jamaah (show_attendees)</span>
                    <span className="text-[11px] text-slate-500">Jika mati, nama disembunyikan demi privasi</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.show_attendees}
                    onChange={(e) => setFormData({ ...formData, show_attendees: e.target.checked })}
                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-emerald-100 pt-2.5">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Tampilkan Statistik Kehadiran (show_statistics)</span>
                    <span className="text-[11px] text-slate-500">Tampilkan angka rekap jumlah hadir di publik</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.show_statistics}
                    onChange={(e) => setFormData({ ...formData, show_statistics: e.target.checked })}
                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors"
                >
                  {editingEvent ? 'Simpan Perubahan' : 'Simpan Acara Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-floating border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base">Hapus Jadwal Pengajian?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan menghapus jadwal pengajian dari sistem. Rekap absensi terkait akan diarsipkan.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Message Generator Modal (FR-EVENT-005) */}
      {waModalEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-floating border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-600" />
                Template Undangan WhatsApp
              </h3>
              <button onClick={() => setWaModalEvent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto text-slate-800">
              {generateWaText(waModalEvent)}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => copyToClipboard(generateWaText(waModalEvent))}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-2"
              >
                {copySuccess ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : null}
                <span>{copySuccess ? 'Tersalin ke Clipboard!' : 'Salin Teks'}</span>
              </button>

              <button
                onClick={() => {
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(generateWaText(waModalEvent))}`, '_blank');
                  setWaModalEvent(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-2"
              >
                <span>Buka Aplikasi WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
