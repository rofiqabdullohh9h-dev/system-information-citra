import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  FileSpreadsheet,
  CheckCircle,
  Upload,
  Download,
  AlertCircle,
  FileUp,
  FileText,
  Check,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppStore } from '../store/store';

// Helper pemroses baris data (dari file Excel/CSV atau paste teks)
function parseRowsToJamaah(rows, categoriesList = []) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const catMap = new Map();
  categoriesList.forEach((c) => {
    catMap.set(c.nama_kategori.toLowerCase().trim(), c.id);
  });

  const results = [];

  for (const row of rows) {
    let nama = '';
    let wa = '';
    let gender = 'L';
    let catNames = '';

    if (Array.isArray(row)) {
      if (row.length === 0) continue;
      nama = String(row[0] ?? '').trim();
      wa = String(row[1] ?? '').trim();
      gender = String(row[2] ?? '').trim();
      catNames = String(row[3] ?? '').trim();
    } else if (typeof row === 'object' && row !== null) {
      let matchedByKey = false;
      for (const key of Object.keys(row)) {
        const k = key.toLowerCase().trim();
        const val = String(row[key] ?? '').trim();
        if (k.includes('nama') || k === 'name' || k === 'full name') {
          nama = val;
          matchedByKey = true;
        } else if (k.includes('wa') || k.includes('whatsapp') || k.includes('hp') || k.includes('telepon') || k.includes('phone')) {
          wa = val;
          matchedByKey = true;
        } else if (k.includes('kelamin') || k === 'gender' || k === 'jk' || k === 'sex') {
          gender = val;
          matchedByKey = true;
        } else if (k.includes('kategori') || k === 'category' || k === 'kelompok') {
          catNames = val;
          matchedByKey = true;
        }
      }

      // Fallback jika header tidak terdeteksi (misal format kolom tanpa label standar)
      if (!matchedByKey || !nama) {
        const vals = Object.values(row).map((v) => String(v ?? '').trim());
        if (vals.length > 0 && vals[0]) nama = vals[0];
        if (vals.length > 1 && vals[1]) wa = vals[1];
        if (vals.length > 2 && vals[2]) gender = vals[2];
        if (vals.length > 3 && vals[3]) catNames = vals[3];
      }
    }

    // Lewati baris header jika masih terbawa
    const lowerNama = nama.toLowerCase();
    if (
      !nama ||
      lowerNama === 'nama' ||
      lowerNama === 'nama lengkap' ||
      lowerNama === 'nama jamaah' ||
      lowerNama === 'name' ||
      lowerNama === 'full name'
    ) {
      continue;
    }

    // Normalisasi nomor whatsapp (hanya angka dan tanda +)
    let cleanWa = wa.replace(/[^0-9+]/g, '');
    // Jika format Excel menghilangkan angka 0 di depan (contoh 81234567890)
    if (cleanWa.startsWith('8') && cleanWa.length >= 9 && cleanWa.length <= 13) {
      cleanWa = '0' + cleanWa;
    } else if (cleanWa.startsWith('628')) {
      cleanWa = '0' + cleanWa.slice(2);
    }

    // Normalisasi gender
    const gLower = gender.toLowerCase();
    const normGender = (gLower.startsWith('p') || gLower.includes('wanita') || gLower.includes('perempuan') || gLower.includes('akhwat') || gLower.includes('f')) ? 'P' : 'L';

    // Normalisasi kategori (jamaah hanya memiliki 1 kategori)
    const resolvedCatIds = [];
    if (catNames) {
      const parts = catNames.split(/[,;]/).map((s) => s.toLowerCase().trim());
      for (const p of parts) {
        if (catMap.has(p)) {
          resolvedCatIds.push(catMap.get(p));
          break; // Cukup 1 kategori saja
        }
      }
    }

    const primaryCatId = resolvedCatIds.length > 0
      ? resolvedCatIds[0]
      : (categoriesList.length > 0 ? categoriesList[0].id : null);

    results.push({
      nama,
      no_whatsapp: cleanWa,
      jenis_kelamin: normGender,
      kategori: (primaryCatId ? categoriesList.find((c) => c.id === primaryCatId)?.nama_kategori : null) || catNames || '-',
      categoryId: primaryCatId,
      categoryIds: primaryCatId ? [primaryCatId] : [],
    });
  }

  return results;
}

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Form state (1 Kategori per jamaah)
  const [formData, setFormData] = useState({
    nama: '',
    no_whatsapp: '',
    jenis_kelamin: 'L',
    categoryId: null,
  });

  // Bulk Import state
  const [importTab, setImportTab] = useState('file'); // 'file' | 'paste'
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [importText, setImportText] = useState('');
  const [parsedPreview, setParsedPreview] = useState([]);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

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
      categoryId: categories.length > 0 ? categories[0].id : null,
    });
    setModalOpen(true);
  };

  const openEditModal = (person) => {
    setEditingJamaah(person);
    const catId = person.categoryIds?.[0] || person.categories?.[0]?.id || (categories.length > 0 ? categories[0].id : null);
    setFormData({
      nama: person.nama,
      no_whatsapp: person.no_whatsapp || '',
      jenis_kelamin: person.jenis_kelamin || 'L',
      categoryId: catId,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formData.nama.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        nama: formData.nama.trim(),
        no_whatsapp: formData.no_whatsapp.trim(),
        jenis_kelamin: formData.jenis_kelamin,
        categoryId: formData.categoryId,
        categoryIds: formData.categoryId ? [formData.categoryId] : [],
      };

      if (editingJamaah) {
        await updateJamaah(editingJamaah.id, payload);
        showToast('Data jamaah berhasil diperbarui.');
      } else {
        await addJamaah(payload);
        showToast('Jamaah baru berhasil ditambahkan.');
      }
      setModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan data jamaah.');
    } finally {
      setIsSubmitting(false);
    }
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

  // Unduh Template Excel / CSV
  const handleDownloadTemplate = (format = 'xlsx') => {
    const sampleData = [
      {
        'Nama Lengkap': 'Ahmad Fauzi',
        'Nomor WhatsApp': '081234567890',
        'Jenis Kelamin': 'L',
        'Kategori': categories[0]?.nama_kategori || '',
      },
      {
        'Nama Lengkap': 'Siti Aisyah',
        'Nomor WhatsApp': '081398765432',
        'Jenis Kelamin': 'P',
        'Kategori': categories[0]?.nama_kategori || '',
      },
      {
        'Nama Lengkap': 'Budi Santoso',
        'Nomor WhatsApp': '082198765432',
        'Jenis Kelamin': 'L',
        'Kategori': categories[0]?.nama_kategori || '',
      },
      {
        'Nama Lengkap': 'Dewi Lestari',
        'Nomor WhatsApp': '085212345678',
        'Jenis Kelamin': 'P',
        'Kategori': categories[0]?.nama_kategori || '',
      },
    ];

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template Jamaah');
      XLSX.writeFile(wb, 'Template_Data_Jamaah_SIAP.xlsx');
      showToast('Template Excel (.xlsx) berhasil diunduh.');
    } else {
      const ws = XLSX.utils.json_to_sheet(sampleData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Template_Data_Jamaah_SIAP.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Template CSV berhasil diunduh.');
    }
  };

  // Ekspor Data Jamaah (Excel & CSV)
  const handleExportData = (format = 'xlsx') => {
    if (filteredJamaah.length === 0) {
      showToast('Tidak ada data jamaah untuk diekspor.');
      return;
    }

    const exportRows = filteredJamaah.map((j) => {
      const cats = (j.categoryIds || [])
        .map((cid) => categories.find((c) => c.id === cid)?.nama_kategori)
        .filter(Boolean)
        .join(', ');

      return {
        'Nama Lengkap': j.nama,
        'Nomor WhatsApp': j.no_whatsapp || '',
        'Jenis Kelamin': j.jenis_kelamin === 'P' ? 'Perempuan' : 'Laki-laki',
        'Kategori': cats || '-',
      };
    });

    const dateStr = new Date().toISOString().split('T')[0];
    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Jamaah');
      XLSX.writeFile(wb, `Data_Jamaah_SIAP_${dateStr}.xlsx`);
      showToast('File Excel (.xlsx) berhasil diunduh.');
    } else {
      const ws = XLSX.utils.json_to_sheet(exportRows);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Data_Jamaah_SIAP_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('File CSV berhasil diunduh.');
    }
  };

  // Proses upload file Excel / CSV
  const handleFileUpload = async (file) => {
    if (!file) return;
    setImportError('');
    setSelectedFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setImportError('File Excel tidak memiliki lembar kerja (worksheet).');
        return;
      }
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      const parsed = parseRowsToJamaah(rawRows, categories);
      if (parsed.length === 0) {
        setImportError('Tidak ditemukan data jamaah yang valid pada file ini. Pastikan ada kolom Nama Lengkap.');
        setParsedPreview([]);
        return;
      }

      setParsedPreview(parsed);
    } catch (err) {
      console.error('Gagal membaca file:', err);
      setImportError('Gagal membaca file Excel/CSV. Pastikan format file tidak rusak.');
      setParsedPreview([]);
    }
  };

  // Proses parsing input teks manual
  const handleParseImport = () => {
    setImportError('');
    if (!importText.trim()) {
      setImportError('Harap tempel (paste) data teks terlebih dahulu.');
      return;
    }

    try {
      const lines = importText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
      const rows = lines.map((line) => {
        let parts = [];
        if (line.includes('\t')) parts = line.split('\t');
        else if (line.includes(';')) parts = line.split(';');
        else parts = line.split(',');
        return parts.map((s) => s.trim().replace(/^["']|["']$/g, ''));
      });

      const parsed = parseRowsToJamaah(rows, categories);
      if (parsed.length === 0) {
        setImportError('Tidak ada data valid yang dapat diproses dari teks ini.');
        return;
      }

      setParsedPreview(parsed);
    } catch (err) {
      setImportError('Gagal memproses data teks. Pastikan format kolom sesuai.');
    }
  };

  const handleCommitImport = async () => {
    if (isImporting || parsedPreview.length === 0) return;
    setIsImporting(true);
    try {
      await bulkImportJamaah(parsedPreview);
      setImportModalOpen(false);
      setImportText('');
      setSelectedFileName('');
      setParsedPreview([]);
      showToast(`Berhasil mengimpor ${parsedPreview.length} data jamaah.`);
    } catch (err) {
      showToast(err.message || 'Gagal mengimpor data jamaah.');
    } finally {
      setIsImporting(false);
    }
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
            onClick={() => {
              setImportModalOpen(true);
              setImportTab('file');
              setImportError('');
              setParsedPreview([]);
              setSelectedFileName('');
              setImportText('');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200"
          >
            <Upload className="w-4 h-4 text-brand-700" />
            <span>Impor Excel / CSV</span>
          </button>

          <button
            onClick={() => handleExportData('xlsx')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200"
            title="Ekspor ke Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
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
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
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

      {/* Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        {filteredJamaah.length > 0 ? (
          <>
            {/* Mobile Card List View (sm:hidden) */}
            <div className="sm:hidden divide-y divide-slate-100">
              {filteredJamaah.map((person, idx) => {
                const personCats = (person.categoryIds || []).map(cid => categories.find(c => c.id === cid)?.nama_kategori).filter(Boolean);
                return (
                  <div key={person.id} className="p-4 space-y-2.5 hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-500 font-mono text-xs flex items-center justify-center font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm leading-snug">{person.nama}</h4>
                          {person.no_whatsapp ? (
                            <a
                              href={`https://wa.me/${person.no_whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-mono text-emerald-700 hover:underline inline-flex items-center gap-1 mt-0.5"
                            >
                              📱 {person.no_whatsapp}
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">Tanpa no. WA</span>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        person.jenis_kelamin === 'L' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-pink-50 text-pink-700 border border-pink-200'
                      }`}>
                        {person.jenis_kelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      <div className="flex flex-wrap gap-1">
                        {personCats.length > 0 ? (
                          personCats.map((catName, cIdx) => (
                            <span key={cIdx} className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {catName}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Umum</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditModal(person)}
                          className="p-2 rounded-xl text-slate-600 hover:text-brand-800 hover:bg-slate-100 transition-colors"
                          title="Edit Jamaah"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(person.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Jamaah"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (hidden sm:block) */}
            <div className="hidden sm:block overflow-x-auto">
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
                            {person.jenis_kelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {personCats.length > 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">
                              {personCats[0]}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
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
          </>
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
                  placeholder="Contoh: Muhammad Rizky Pratama"
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
                    Laki-laki
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, jenis_kelamin: 'P' })}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      formData.jenis_kelamin === 'P' ? 'bg-pink-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Perempuan
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Kategori Jamaah (Pilih 1 Kategori) *
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const isSelected = formData.categoryId === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setFormData({ ...formData, categoryId: cat.id })}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-brand-700 border-brand-800 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{cat.nama_kategori}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Data</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Excel / CSV Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-floating border border-slate-200 my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Impor Data Jamaah (Excel & CSV)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Unggah file spreadsheet atau tempel data teks untuk memasukkan jamaah secara massal.
                </p>
              </div>
              <button 
                onClick={() => setImportModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download & Info Bar */}
            <div className="bg-emerald-50/70 border border-emerald-100 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-emerald-900">
                <p className="font-bold">Belum punya format file yang sesuai?</p>
                <p className="text-emerald-700 text-[11px] mt-0.5">
                  Unduh template berikut untuk memudahkan pengisian data:
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate('xlsx')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Template Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate('csv')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Template CSV</span>
                </button>
              </div>
            </div>

            {/* Tab Selector */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 shrink-0">
              <button
                type="button"
                onClick={() => setImportTab('file')}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  importTab === 'file'
                    ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Unggah File Spreadsheet</span>
              </button>
              <button
                type="button"
                onClick={() => setImportTab('paste')}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  importTab === 'paste'
                    ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Tempel Teks (Paste)</span>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Tab 1: File Upload */}
              {importTab === 'file' && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-brand-500 bg-brand-50/50 scale-[0.99]'
                        : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50/70 bg-slate-50/30'
                    }`}
                  >
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mb-3 shadow-xs">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    {selectedFileName ? (
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold mb-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>File Terpilih: {selectedFileName}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Klik untuk memilih file lain atau ganti file.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Tarik & lepas file Excel (.xlsx, .xls) atau CSV (.csv) ke sini
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          atau <span className="text-brand-700 font-semibold underline underline-offset-2">klik untuk telusuri file</span> dari komputer Anda
                        </p>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400 mt-3">
                      Kolom otomatis terdeteksi: <strong>Nama Lengkap</strong>, <strong>Nomor WhatsApp</strong>, <strong>Jenis Kelamin (L/P)</strong>, <strong>Kategori</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 2: Text Paste */}
              {importTab === 'paste' && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <span className="font-bold text-slate-800 block">Format teks yang didukung (Koma, Titik Koma, atau Tab):</span>
                    <div className="font-mono text-[11px] text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 space-y-0.5">
                      <p className="text-slate-400 font-semibold mb-1">Nama Lengkap, Nomor WhatsApp, Jenis Kelamin (L/P), Kategori</p>
                      <p>Muhammad Rizky Pratama, 081234567890, L</p>
                      <p>Siti Aisyah, 081398765432, P</p>
                      <p>Budi Santoso, 082198765432, L</p>
                      <p>Dewi Lestari, 085212345678, P</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Tempel (Paste) Teks:
                    </label>
                    <textarea
                      rows={5}
                      placeholder={`Contoh:\nMuhammad Rizky Pratama, 081234567890, L\nSiti Aisyah, 081398765432, P`}
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      className="w-full p-3 font-mono text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleParseImport}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Proses Teks & Pratinjau</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Preview Table of Parsed Data */}
              {parsedPreview.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Pratinjau Data ({parsedPreview.length} jamaah siap diimpor):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setParsedPreview([]);
                        setSelectedFileName('');
                        setImportText('');
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      Bersihkan Pratinjau
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                        <tr>
                          <th className="py-2 px-3 w-10 text-center">#</th>
                          <th className="py-2 px-3">Nama Lengkap</th>
                          <th className="py-2 px-3">No. WhatsApp</th>
                          <th className="py-2 px-3 text-center">Gender</th>
                          <th className="py-2 px-3">Kategori</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {parsedPreview.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-3 text-center text-slate-400 font-mono text-[11px]">{i + 1}</td>
                            <td className="py-1.5 px-3 font-semibold text-slate-900">{item.nama}</td>
                            <td className="py-1.5 px-3 font-mono text-[11px] text-slate-600">{item.no_whatsapp || '-'}</td>
                            <td className="py-1.5 px-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.jenis_kelamin === 'P'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}
                              >
                                {item.jenis_kelamin === 'P' ? 'P' : 'L'}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-slate-500 text-[11px]">{item.kategori || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isImporting || parsedPreview.length === 0}
                onClick={handleCommitImport}
                className="px-5 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Konfirmasi & Simpan {parsedPreview.length > 0 ? `(${parsedPreview.length})` : ''} Jamaah</span>
                  </>
                )}
              </button>
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
