import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Upload,
  Download,
  Edit2,
  Trash2,
  X,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Filter
} from 'lucide-react';
import { useAppStore } from '../store/store';

export default function JamaahManagement() {
  const jamaahList = useAppStore((state) => state.jamaah);
  const categories = useAppStore((state) => state.categories);
  const addJamaah = useAppStore((state) => state.addJamaah);
  const updateJamaah = useAppStore((state) => state.updateJamaah);
  const deleteJamaah = useAppStore((state) => state.deleteJamaah);
  const bulkImportJamaah = useAppStore((state) => state.bulkImportJamaah);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState('ALL');
  const [selectedCat, setSelectedCat] = useState('ALL');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJamaah, setEditingJamaah] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    nama: '',
    no_whatsapp: '',
    jenis_kelamin: 'L',
    categoryIds: [1],
  });

  // Bulk Import state
  const [importText, setImportText] = useState('');
  const [parsedPreview, setParsedPreview] = useState([]);
  const [importError, setImportError] = useState('');

  // Filtered list
  const filteredJamaah = useMemo(() => {
    return jamaahList.filter(person => {
      const matchSearch = person.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (person.no_whatsapp && person.no_whatsapp.includes(searchQuery));
      const matchGender = selectedGender === 'ALL' || person.jenis_kelamin === selectedGender;
      const matchCat = selectedCat === 'ALL' || (person.categoryIds && person.categoryIds.includes(Number(selectedCat)));
      return matchSearch && matchGender && matchCat;
    });
  }, [jamaahList, searchQuery, selectedGender, selectedCat]);

  const openAddModal = () => {
    setEditingJamaah(null);
    setFormData({
      nama: '',
      no_whatsapp: '',
      jenis_kelamin: 'L',
      categoryIds: [1],
    });
    setModalOpen(true);
  };

  const openEditModal = (person) => {
    setEditingJamaah(person);
    setFormData({
      nama: person.nama,
      no_whatsapp: person.no_whatsapp || '',
      jenis_kelamin: person.jenis_kelamin || 'L',
      categoryIds: person.categoryIds || [1],
    });
    setModalOpen(true);
  };

  const toggleCategory = (catId) => {
    setFormData(prev => {
      const exists = prev.categoryIds.includes(catId);
      const updated = exists ? prev.categoryIds.filter(id => id !== catId) : [...prev.categoryIds, catId];
      return { ...prev, categoryIds: updated.length ? updated : [1] };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nama.trim()) return;

    if (editingJamaah) {
      updateJamaah(editingJamaah.id, formData);
      showToast('Data jamaah berhasil diperbarui.');
    } else {
      addJamaah(formData);
      showToast('Jamaah baru berhasil ditambahkan.');
    }
    setModalOpen(false);
  };

  const handleDelete = (id) => {
    deleteJamaah(id);
    setDeleteConfirmId(null);
    showToast('Data jamaah berhasil dihapus.');
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Nama', 'No WhatsApp', 'Jenis Kelamin', 'Kategori'];
    const rows = filteredJamaah.map(j => {
      const cats = (j.categoryIds || []).map(cid => categories.find(c => c.id === cid)?.nama_kategori).filter(Boolean).join('; ');
      return `"${j.nama}","${j.no_whatsapp || ''}","${j.jenis_kelamin}","${cats}"`;
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Jamaah_SIAP_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('File CSV berhasil diunduh.');
  };

  // Parsing CSV text input
  const handleParseImport = () => {
    setImportError('');
    if (!importText.trim()) {
      setImportError('Harap tempel (paste) data CSV terlebih dahulu.');
      return;
    }

    try {
      const lines = importText.trim().split('\n');
      const parsed = [];

      lines.forEach((line, idx) => {
        // Skip header if contains 'nama'
        if (idx === 0 && line.toLowerCase().includes('nama')) return;

        const parts = line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 1 && parts[0]) {
          const nama = parts[0];
          const noWa = parts[1] || '';
          const gender = (parts[2] && parts[2].toUpperCase().startsWith('P')) ? 'P' : 'L';
          
          parsed.push({
            nama,
            no_whatsapp: noWa,
            jenis_kelamin: gender,
            categoryIds: [1], // Default umum
          });
        }
      });

      if (parsed.length === 0) {
        setImportError('Tidak ada data valid yang dapat diproses dari CSV.');
        return;
      }

      setParsedPreview(parsed);
    } catch (err) {
      setImportError('Gagal memproses format CSV. Pastikan format pemisah adalah koma (,).');
    }
  };

  const handleCommitImport = () => {
    if (parsedPreview.length === 0) return;
    bulkImportJamaah(parsedPreview);
    setImportModalOpen(false);
    setImportText('');
    setParsedPreview([]);
    showToast(`Alhamdulillah! Berhasil mengimpor ${parsedPreview.length} data jamaah.`);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-floating border border-slate-700 flex items-center gap-3 animate-slide-up text-xs sm:text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Data Induk Jamaah</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {jamaahList.length} jamaah terdaftar dalam sistem
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200"
          >
            <Upload className="w-4 h-4 text-brand-700" />
            <span>Impor CSV / Excel</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Data</span>
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold shadow-xs transition-all hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Jamaah</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama atau nomor WhatsApp jamaah..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Gender Filter */}
          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 rounded-xl border border-slate-200 text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Semua Gender</option>
            <option value="L">Laki-laki (Ikhwan)</option>
            <option value="P">Perempuan (Akhwat)</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 rounded-xl border border-slate-200 text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Semua Kategori</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.nama_kategori}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        {filteredJamaah.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 w-12">No</th>
                  <th className="px-5 py-3">Nama Jamaah</th>
                  <th className="px-5 py-3">No. WhatsApp</th>
                  <th className="px-5 py-3">Jenis Kelamin</th>
                  <th className="px-5 py-3">Kelompok / Kategori</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJamaah.map((person, idx) => {
                  const personCats = (person.categoryIds || []).map(cid => categories.find(c => c.id === cid)?.nama_kategori).filter(Boolean);

                  return (
                    <tr key={person.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">{person.nama}</td>
                      <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">
                        {person.no_whatsapp ? (
                          <a href={`https://wa.me/${person.no_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                            {person.no_whatsapp}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          person.jenis_kelamin === 'L' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-pink-50 text-pink-700 border border-pink-200'
                        }`}>
                          {person.jenis_kelamin === 'L' ? 'Ikhwan (L)' : 'Akhwat (P)'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {personCats.map((catName, cIdx) => (
                            <span key={cIdx} className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {catName}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(person)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-800 hover:bg-slate-100 transition-colors"
                            title="Edit Jamaah"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(person.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus Jamaah"
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
        ) : (
          <div className="text-center py-12 p-6 text-slate-500 space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-semibold text-slate-700">Tidak ada data jamaah</h4>
            <p className="text-xs text-slate-400">Silakan ubah filter atau tambahkan data jamaah baru.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-floating border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingJamaah ? 'Ubah Data Jamaah' : 'Tambah Jamaah Baru'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: H. Ahmad Zaki"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 081234567890"
                  value={formData.no_whatsapp}
                  onChange={(e) => setFormData({ ...formData, no_whatsapp: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Jenis Kelamin
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, jenis_kelamin: 'L' })}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      formData.jenis_kelamin === 'L' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Laki-laki (Ikhwan)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, jenis_kelamin: 'P' })}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      formData.jenis_kelamin === 'P' ? 'bg-pink-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Perempuan (Akhwat)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Pilih Kategori (Bisa Multi-Select)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => {
                    const isSelected = formData.categoryIds.includes(cat.id);
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isSelected ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat.nama_kategori}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition-colors"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-floating border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Impor Data Jamaah (CSV)
              </h3>
              <button onClick={() => setImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
              <span className="font-bold block">Format CSV yang didukung:</span>
              <p className="font-mono text-[11px] text-slate-700 bg-white p-2 rounded border border-emerald-200">
                Nama, No WhatsApp, Jenis Kelamin (L/P)<br/>
                Contoh:<br/>
                Ustadz Abdullah, 081234567890, L<br/>
                Ustadzah Khadijah, 081398765432, P
              </p>
            </div>

            {importError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{importError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Tempel (Paste) Teks CSV:
              </label>
              <textarea
                rows={5}
                placeholder="Tempel baris data CSV di sini..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full p-3 font-mono text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            {parsedPreview.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-emerald-700 block">
                  Pratinjau ({parsedPreview.length} data siap diimpor):
                </span>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 text-xs space-y-1">
                  {parsedPreview.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1 px-2 bg-slate-50 rounded">
                      <span className="font-semibold text-slate-800">{item.nama}</span>
                      <span className="text-slate-500 font-mono text-[11px]">{item.no_whatsapp} ({item.jenis_kelamin})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Tutup
              </button>
              {parsedPreview.length === 0 ? (
                <button
                  type="button"
                  onClick={handleParseImport}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors"
                >
                  Cek & Pratinjau
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCommitImport}
                  className="px-5 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition-colors"
                >
                  Konfirmasi & Simpan {parsedPreview.length} Jamaah
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-3 shadow-floating border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base">Hapus Data Jamaah?</h3>
            <p className="text-xs text-slate-600">
              Data jamaah ini akan dihapus dari sistem. Rekap absensi sebelumnya tetap tersimpan di riwayat.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
