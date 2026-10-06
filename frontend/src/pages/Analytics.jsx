import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  CalendarX2,
  Filter,
  ArrowUpDown,
  RotateCcw,
  TrendingUp,
  Percent
} from 'lucide-react';
import { useAppStore } from '../store/store';
import { API_BASE_URL } from '../services/api';
import {
  getLocalDateStr,
  getPeriodRange,
  isDateInPeriod,
  INDONESIAN_MONTHS,
  formatDateWIB
} from '../utils/dateUtils';

export default function Analytics() {
  const events = useAppStore((state) => state.events);
  const jamaahList = useAppStore((state) => state.jamaah);
  const categories = useAppStore((state) => state.categories);
  const attendance = useAppStore((state) => state.attendance);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Filter & Sort State
  const [periodType, setPeriodType] = useState('ALL'); // 'ALL' | 'THIS_WEEK' | 'THIS_MONTH' | 'SPECIFIC_MONTH' | 'CUSTOM'
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('DATE_DESC'); // 'DATE_DESC' | 'DATE_ASC' | 'NAME_ASC' | 'STATUS_PRIORITY'

  const [selectedEventId, setSelectedEventId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tableSearch, setTableSearch] = useState('');
  const [downloadToast, setDownloadToast] = useState(false);

  // Label & info periode aktif
  const activePeriodInfo = useMemo(() => {
    return getPeriodRange(periodType, {
      startDate,
      endDate,
      month: selectedMonth,
      year: selectedYear,
    });
  }, [periodType, startDate, endDate, selectedMonth, selectedYear]);

  // 1. Acara yang masuk dalam rentang periode yang dipilih
  const periodFilteredEvents = useMemo(() => {
    return events.filter(e => {
      return isDateInPeriod(e.tanggal, periodType, {
        startDate,
        endDate,
        month: selectedMonth,
        year: selectedYear,
      });
    });
  }, [events, periodType, startDate, endDate, selectedMonth, selectedYear]);

  // 2. Acara dalam periode yang telah memiliki absensi tersimpan
  const eventsWithAttendanceInPeriod = useMemo(() => {
    return periodFilteredEvents.filter(e => {
      const attMap = attendance[e.id] || attendance[Number(e.id)];
      return attMap && Object.keys(attMap).length > 0;
    });
  }, [periodFilteredEvents, attendance]);

  // 3. Reset selectedEventId jika acara yang dipilih sebelumnya tidak ada dalam filter periode baru
  useEffect(() => {
    if (selectedEventId !== 'ALL') {
      const exists = eventsWithAttendanceInPeriod.some(e => Number(e.id) === Number(selectedEventId));
      if (!exists) {
        setSelectedEventId('ALL');
      }
    }
  }, [eventsWithAttendanceInPeriod, selectedEventId]);

  // 4. Target acara yang dianalisis
  const targetEvents = useMemo(() => {
    if (selectedEventId === 'ALL') {
      return eventsWithAttendanceInPeriod;
    }
    return events.filter(e => Number(e.id) === Number(selectedEventId));
  }, [events, eventsWithAttendanceInPeriod, selectedEventId]);

  // 5. Cek apakah ada data kehadiran untuk pilihan saat ini
  const selectedEventHasAttendance = useMemo(() => {
    if (selectedEventId === 'ALL') {
      return eventsWithAttendanceInPeriod.length > 0;
    }
    const target = events.find(e => Number(e.id) === Number(selectedEventId));
    if (!target) return false;
    const attMap = attendance[target.id] || attendance[Number(target.id)];
    return Boolean(attMap && Object.keys(attMap).length > 0);
  }, [selectedEventId, eventsWithAttendanceInPeriod, events, attendance]);

  // Flattened detailed report rows (dihitung secara riil dari database)
  const reportRows = useMemo(() => {
    if (!selectedEventHasAttendance) return [];

    const list = [];

    targetEvents.forEach(ev => {
      const records = attendance[ev.id] || attendance[Number(ev.id)] || {};
      if (Object.keys(records).length === 0) return;

      const targetCats = (ev.targetCategoryIds && ev.targetCategoryIds.length > 0)
        ? ev.targetCategoryIds
        : (ev.targetCategoryId ? [ev.targetCategoryId] : [1]);
      const isGeneral = targetCats.includes(1) || (categories.length > 0 && targetCats.length >= categories.length);
      const targetGender = ev.target_gender || ev.targetGender || (ev.deskripsi && ev.deskripsi.includes('<!--gender:L-->') ? 'L' : ev.deskripsi && ev.deskripsi.includes('<!--gender:P-->') ? 'P' : 'ALL');

      const eligible = jamaahList.filter(j => {
        if (!j.isActive) return false;
        if (targetGender === 'L' && j.jenis_kelamin !== 'L') return false;
        if (targetGender === 'P' && j.jenis_kelamin !== 'P') return false;
        if (isGeneral) return true;
        return (j.categoryIds || []).some(cid => targetCats.includes(cid));
      });

      const sameDateStr = getLocalDateStr(ev.tanggal);

      eligible.forEach(j => {
        const recordedStatus = records[j.id];
        let status = recordedStatus;
        let keterangan = '';

        if (!recordedStatus) {
          // Kompensasi jika jamaah hadir di sesi lain pada tanggal yang sama
          const otherEventAttended = sameDateStr ? events.find(otherEv => {
            if (otherEv.id === ev.id) return false;
            const od = getLocalDateStr(otherEv.tanggal);
            if (od !== sameDateStr) return false;
            const oAtt = attendance[otherEv.id] || attendance[Number(otherEv.id)] || {};
            return oAtt[j.id] === 'HADIR' || oAtt[j.id] === 'DARING';
          }) : null;

          if (otherEventAttended) {
            status = 'HADIR';
            keterangan = `Hadir di ${otherEventAttended.tema}`;
          } else {
            status = 'ALPA';
            keterangan = 'Tanpa Keterangan';
          }
        } else if (recordedStatus === 'HADIR') {
          keterangan = 'Hadir Fisik';
        } else if (recordedStatus === 'DARING') {
          keterangan = 'Ngaji Daring';
        } else if (recordedStatus === 'IZIN') {
          keterangan = 'Izin';
        } else if (recordedStatus === 'SAKIT') {
          keterangan = 'Sakit';
        } else if (recordedStatus === 'ALPA') {
          keterangan = 'Tanpa Keterangan';
        }

        const catNames = (j.categoryIds || [])
          .map(cid => categories.find(c => c.id === cid)?.nama_kategori)
          .filter(Boolean)
          .join(', ') || 'Umum';

        list.push({
          eventId: ev.id,
          eventTema: ev.tema,
          eventTanggal: ev.tanggal,
          jamaahId: j.id,
          nama: j.nama,
          no_whatsapp: j.no_whatsapp,
          jenis_kelamin: j.jenis_kelamin,
          kategori: catNames,
          status,
          displayStatus: status === 'ALPA' ? 'Tanpa Keterangan' : status === 'HADIR' ? 'Hadir' : status === 'DARING' ? 'Daring' : status === 'IZIN' ? 'Izin' : status === 'SAKIT' ? 'Sakit' : status,
          keterangan,
        });
      });
    });

    return list;
  }, [selectedEventHasAttendance, targetEvents, attendance, jamaahList, categories, events]);

  // Overall statistics calculation (konsisten 100% dengan reportRows & filter periode)
  const overallStats = useMemo(() => {
    let hadir = 0;
    let daring = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;

    reportRows.forEach(r => {
      if (r.status === 'HADIR') hadir++;
      else if (r.status === 'DARING') daring++;
      else if (r.status === 'IZIN') izin++;
      else if (r.status === 'SAKIT') sakit++;
      else if (r.status === 'ALPA') alpa++;
    });

    const total = reportRows.length;
    const activeRate = total > 0 ? Math.round(((hadir + daring) / total) * 100) : 0;
    const hadirRate = total > 0 ? Math.round((hadir / total) * 100) : 0;
    const daringRate = total > 0 ? Math.round((daring / total) * 100) : 0;
    const izinRate = total > 0 ? Math.round((izin / total) * 100) : 0;
    const sakitRate = total > 0 ? Math.round((sakit / total) * 100) : 0;
    const alpaRate = total > 0 ? Math.round((alpa / total) * 100) : 0;

    return {
      hadir,
      daring,
      izin,
      sakit,
      alpa,
      total,
      activeRate,
      hadirRate,
      daringRate,
      izinRate,
      sakitRate,
      alpaRate
    };
  }, [reportRows]);

  // Capaian partisipasi per kategori berbasis data absensi riil dalam periode yang dipilih (diawali Semua Kategori)
  const categoryStats = useMemo(() => {
    const totalActiveMembers = jamaahList.filter(j => j.isActive).length;
    const totalOpportunities = reportRows.length;
    const attendedCount = reportRows.filter(r => r.status === 'HADIR' || r.status === 'DARING').length;
    const overallRate = totalOpportunities > 0 ? Math.round((attendedCount / totalOpportunities) * 100) : 0;

    const overallItem = {
      id: 'ALL_CATEGORIES',
      nama_kategori: 'Semua Kategori (Keseluruhan)',
      totalMembers: totalActiveMembers,
      totalOpportunities,
      attendedCount,
      rate: overallRate,
      isOverall: true
    };

    const catList = categories.map(cat => {
      const members = jamaahList.filter(j => j.isActive && (j.categoryIds || []).includes(cat.id));
      const memberIds = new Set(members.map(m => m.id));

      const catRows = reportRows.filter(r => memberIds.has(r.jamaahId));
      const catOpportunities = catRows.length;
      const catAttendedCount = catRows.filter(r => r.status === 'HADIR' || r.status === 'DARING').length;
      const rate = catOpportunities > 0 ? Math.round((catAttendedCount / catOpportunities) * 100) : 0;

      return {
        ...cat,
        totalMembers: members.length,
        totalOpportunities: catOpportunities,
        attendedCount: catAttendedCount,
        rate,
        isOverall: false
      };
    });

    return [overallItem, ...catList];
  }, [categories, jamaahList, reportRows]);

  // Filtered & Sorted rows for detailed table preview
  const sortedAndFilteredReportRows = useMemo(() => {
    const filtered = reportRows.filter(row => {
      const matchSearch = row.nama.toLowerCase().includes(tableSearch.toLowerCase()) ||
        row.eventTema.toLowerCase().includes(tableSearch.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || row.status === statusFilter;
      return matchSearch && matchStatus;
    });

    return [...filtered].sort((a, b) => {
      if (sortOrder === 'DATE_DESC') {
        const da = a.eventTanggal ? new Date(a.eventTanggal).getTime() : 0;
        const db = b.eventTanggal ? new Date(b.eventTanggal).getTime() : 0;
        if (db !== da) return db - da;
        return a.nama.localeCompare(b.nama);
      }
      if (sortOrder === 'DATE_ASC') {
        const da = a.eventTanggal ? new Date(a.eventTanggal).getTime() : 0;
        const db = b.eventTanggal ? new Date(b.eventTanggal).getTime() : 0;
        if (da !== db) return da - db;
        return a.nama.localeCompare(b.nama);
      }
      if (sortOrder === 'NAME_ASC') {
        return a.nama.localeCompare(b.nama);
      }
      if (sortOrder === 'STATUS_PRIORITY') {
        const priority = { HADIR: 1, DARING: 2, IZIN: 3, SAKIT: 4, ALPA: 5 };
        const pa = priority[a.status] || 99;
        const pb = priority[b.status] || 99;
        if (pa !== pb) return pa - pb;
        return a.nama.localeCompare(b.nama);
      }
      return 0;
    });
  }, [reportRows, tableSearch, statusFilter, sortOrder]);

  // Export report to CSV dengan nama file sesuai periode yang disortir
  const handleExportReport = () => {
    if (reportRows.length === 0) return;

    const headers = [
      'No',
      'ID Acara',
      'Tema Agenda',
      'Tanggal',
      'Nama Jamaah',
      'Gender',
      'Kategori Jamaah',
      'Status Kehadiran',
      'Keterangan Laporan'
    ];
    
    const rows = sortedAndFilteredReportRows.map((r, idx) => [
      idx + 1,
      r.eventId,
      `"${(r.eventTema || '').replace(/"/g, '""')}"`,
      r.eventTanggal ? getLocalDateStr(r.eventTanggal) : '',
      `"${(r.nama || '').replace(/"/g, '""')}"`,
      r.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan',
      `"${r.kategori}"`,
      r.displayStatus,
      `"${r.keterangan}"`
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const eventSuffix = selectedEventId === 'ALL' ? 'Semua_Acara' : `Acara_${selectedEventId}`;
    const periodFileTag = periodType === 'ALL' ? 'Semua_Waktu' : activePeriodInfo.shortLabel.replace(/[\s\/\\]+/g, '_');
    link.setAttribute("download", `Laporan_Rekap_Absensi_${eventSuffix}_${periodFileTag}_${getLocalDateStr(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadToast(true);
    setTimeout(() => setDownloadToast(false), 3000);
  };

  // Export to Excel XLSX via backend endpoint (jika acara tunggal dipilih)
  const handleExportExcel = () => {
    const token = localStorage.getItem('siap_token');
    if (selectedEventId !== 'ALL') {
      window.open(`${API_BASE_URL}/export/attendance/${selectedEventId}?token=${encodeURIComponent(token || '')}`, '_blank');
    } else {
      handleExportReport();
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifikasi */}
      {downloadToast && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-floating border border-slate-700 flex items-center gap-3 animate-slide-up text-xs sm:text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Laporan berhasil diunduh.</span>
        </div>
      )}

      {/* Action Header & Event Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-700" />
            Laporan & Analitik Pengajian
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis persentase kehadiran per bulan, per minggu, atau tanggal tertentu secara riil.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 rounded-xl border border-slate-200 text-slate-700 focus:outline-none cursor-pointer max-w-xs truncate shadow-xs"
          >
            <option value="ALL">Semua Acara dalam Periode ({eventsWithAttendanceInPeriod.length} Acara)</option>
            {eventsWithAttendanceInPeriod.map(e => (
              <option key={e.id} value={e.id}>
                {e.tema} ({e.tanggal ? getLocalDateStr(e.tanggal) : ''})
              </option>
            ))}
          </select>

          {selectedEventId !== 'ALL' && selectedEventHasAttendance && (
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
              title="Unduh file Excel resmi dengan format berwarna dan ringkasan kehadiran"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Unduh Excel (XLSX)</span>
            </button>
          )}

          <button
            onClick={handleExportReport}
            disabled={!selectedEventHasAttendance || reportRows.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Periode Waktu Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-700" />
            <span className="font-bold text-slate-800 text-xs sm:text-sm">Filter Periode & Rentang Waktu</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Periode Aktif:</span>
            <span className="px-2.5 py-1 rounded-full font-bold bg-brand-50 text-brand-700 border border-brand-200/60">
              {activePeriodInfo.label}
            </span>
            {periodType !== 'ALL' && (
              <button
                onClick={() => {
                  setPeriodType('ALL');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-slate-400 hover:text-slate-600 font-medium underline flex items-center gap-1 ml-1"
                title="Reset periode ke Semua Waktu"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Tombol Filter Cepat */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPeriodType('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodType === 'ALL'
                ? 'bg-brand-700 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            Semua Waktu
          </button>
          <button
            onClick={() => setPeriodType('THIS_WEEK')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodType === 'THIS_WEEK'
                ? 'bg-brand-700 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            Minggu Ini
          </button>
          <button
            onClick={() => setPeriodType('THIS_MONTH')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodType === 'THIS_MONTH'
                ? 'bg-brand-700 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            Bulan Ini
          </button>
          <button
            onClick={() => setPeriodType('SPECIFIC_MONTH')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodType === 'SPECIFIC_MONTH'
                ? 'bg-brand-700 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            Pilih Bulan
          </button>
          <button
            onClick={() => setPeriodType('CUSTOM')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodType === 'CUSTOM'
                ? 'bg-brand-700 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            Rentang Tanggal Tertentu
          </button>
        </div>

        {/* Input Spesifik Bulan */}
        {periodType === 'SPECIFIC_MONTH' && (
          <div className="pt-1 flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-xs">
              <label className="font-semibold text-slate-600">Bulan:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {INDONESIAN_MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <label className="font-semibold text-slate-600">Tahun:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Input Rentang Tanggal Kustom */}
        {periodType === 'CUSTOM' && (
          <div className="pt-1 flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
            <div className="flex items-center gap-2">
              <label className="font-semibold text-slate-600">Mulai Tanggal:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="font-semibold text-slate-600">Sampai Tanggal:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline"
              >
                Bersihkan Tanggal
              </button>
            )}
          </div>
        )}
      </div>

      {!selectedEventHasAttendance ? (
        /* Empty State */
        <div className="bg-white p-8 sm:p-14 rounded-2xl border border-slate-200 text-center shadow-subtle space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <CalendarX2 className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {eventsInPeriod.length === 0
                ? `Tidak Ada Acara pada Periode ${activePeriodInfo.label}`
                : selectedEventId === 'ALL'
                ? 'Belum Ada Rekap Absensi Tersimpan pada Periode Ini'
                : 'Kegiatan Ini Belum Memiliki Data Absensi'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              {eventsInPeriod.length === 0
                ? 'Tidak ditemukan jadwal acara pengajian dalam rentang waktu yang dipilih. Silakan ubah filter periode atau reset ke Semua Waktu.'
                : selectedEventId === 'ALL'
                ? 'Agenda pengajian dalam periode ini belum memiliki data absensi tersimpan. Silakan isi presensi pada menu Absensi Kehadiran.'
                : 'Silakan buka menu Absensi Kehadiran untuk mengisi dan menyimpan presensi jamaah pada kegiatan ini.'}
            </p>
            {periodType !== 'ALL' && (
              <button
                onClick={() => {
                  setPeriodType('ALL');
                  setStartDate('');
                  setEndDate('');
                }}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition-all border border-brand-200/70"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ke Semua Waktu</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Ringkasan Utama Persentase (KPI Summary) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-700" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Ringkasan Partisipasi Periode: {activePeriodInfo.label}
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60">
                Rata-rata Partisipasi: {overallStats.activeRate}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-subtle">
                <span className="text-2xl font-extrabold text-slate-900">{overallStats.total}</span>
                <span className="block text-[11px] font-semibold text-slate-500 uppercase mt-1">Total Sasaran</span>
                <span className="text-[10px] text-slate-400 font-medium">100% sasaran</span>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                <span className="text-2xl font-extrabold text-emerald-700">{overallStats.hadir}</span>
                <span className="block text-[11px] font-semibold text-emerald-800 uppercase mt-1">Hadir Fisik</span>
                <span className="text-[11px] font-bold text-emerald-600">{overallStats.hadirRate}%</span>
              </div>
              <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 text-center">
                <span className="text-2xl font-extrabold text-sky-700">{overallStats.daring}</span>
                <span className="block text-[11px] font-semibold text-sky-800 uppercase mt-1">Ngaji Daring</span>
                <span className="text-[11px] font-bold text-sky-600">{overallStats.daringRate}%</span>
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
                <span className="text-2xl font-extrabold text-amber-700">{overallStats.izin}</span>
                <span className="block text-[11px] font-semibold text-amber-800 uppercase mt-1">Izin</span>
                <span className="text-[11px] font-bold text-amber-600">{overallStats.izinRate}%</span>
              </div>
              <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-center">
                <span className="text-2xl font-extrabold text-purple-700">{overallStats.sakit}</span>
                <span className="block text-[11px] font-semibold text-purple-800 uppercase mt-1">Sakit</span>
                <span className="text-[11px] font-bold text-purple-600">{overallStats.sakitRate}%</span>
              </div>
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-center">
                <span className="text-2xl font-extrabold text-rose-700">{overallStats.alpa}</span>
                <span className="block text-[11px] font-semibold text-rose-800 uppercase mt-1">Tanpa Keterangan</span>
                <span className="text-[11px] font-bold text-rose-600">{overallStats.alpaRate}%</span>
              </div>
            </div>
          </div>

          {/* Visual Analytics Representation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Capaian Partisipasi per Kategori */}
            <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Capaian Partisipasi per Kategori</h3>
                  <p className="text-xs text-slate-500">Persentase keaktifan kategori jamaah pada periode ini.</p>
                </div>
                <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded">
                  Rata-rata {overallStats.activeRate}%
                </span>
              </div>

              <div className="space-y-4 pt-1">
                {categoryStats.map((cat) => (
                  <div
                    key={cat.id}
                    className={`space-y-1.5 ${
                      cat.isOverall ? 'p-2.5 rounded-xl bg-brand-50/70 border border-brand-200/80 mb-2' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {cat.isOverall && (
                          <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0"></span>
                        )}
                        <span className={`font-bold ${cat.isOverall ? 'text-brand-950 font-extrabold' : 'text-slate-800'}`}>
                          {cat.nama_kategori} ({cat.totalMembers} jamaah)
                        </span>
                      </div>
                      <span className="font-semibold text-emerald-700">
                        {cat.rate}% {cat.totalOpportunities > 0 ? `(${cat.attendedCount}/${cat.totalOpportunities} kehadiran)` : ''}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-brand-600 rounded-full transition-all duration-500"
                        style={{ width: `${cat.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Komposisi Presensi Kehadiran */}
            <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4 flex flex-col justify-between">
              <div>
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-base">Komposisi Presensi Kehadiran</h3>
                  <p className="text-xs text-slate-500">Distribusi status jamaah saat waktu acara / agenda.</p>
                </div>

                <div className="space-y-3 pt-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs">
                    <div>
                      <span className="font-bold text-emerald-900 block">Hadir di Tempat (Fisik)</span>
                      <span className="text-[11px] text-emerald-700">{overallStats.hadir} kehadiran</span>
                    </div>
                    <span className="font-extrabold text-emerald-700 text-base">
                      {overallStats.hadirRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-sky-50/70 border border-sky-100 text-xs">
                    <div>
                      <span className="font-bold text-sky-900 block">Mengikuti Daring</span>
                      <span className="text-[11px] text-sky-700">{overallStats.daring} kehadiran</span>
                    </div>
                    <span className="font-extrabold text-sky-700 text-base">
                      {overallStats.daringRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 border border-amber-100 text-xs">
                    <div>
                      <span className="font-bold text-amber-900 block">Izin Berhalangan & Sakit</span>
                      <span className="text-[11px] text-amber-700">{overallStats.izin + overallStats.sakit} jamaah</span>
                    </div>
                    <span className="font-extrabold text-amber-700 text-base">
                      {overallStats.total > 0 ? Math.round(((overallStats.izin + overallStats.sakit) / overallStats.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/70 border border-rose-100 text-xs">
                    <div>
                      <span className="font-bold text-rose-900 block">Tanpa Keterangan</span>
                      <span className="text-[11px] text-rose-700">{overallStats.alpa} jamaah</span>
                    </div>
                    <span className="font-extrabold text-rose-700 text-base">
                      {overallStats.alpaRate}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabel Rekapitulasi Rinci Kehadiran Jamaah */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-5 sm:p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Tabel Rekapitulasi Rinci Kehadiran Jamaah</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar seluruh jamaah sasaran pengajian beserta status presensi resmi.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Live Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama / agenda..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-50 rounded-xl border border-slate-200 text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Status ({reportRows.length})</option>
                  <option value="HADIR">Hadir ({reportRows.filter(r => r.status === 'HADIR').length})</option>
                  <option value="DARING">Daring ({reportRows.filter(r => r.status === 'DARING').length})</option>
                  <option value="IZIN">Izin ({reportRows.filter(r => r.status === 'IZIN').length})</option>
                  <option value="SAKIT">Sakit ({reportRows.filter(r => r.status === 'SAKIT').length})</option>
                  <option value="ALPA">Tanpa Keterangan ({reportRows.filter(r => r.status === 'ALPA').length})</option>
                </select>

                {/* Sortir Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                  <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="text-xs font-semibold bg-transparent text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="DATE_DESC">Tanggal Terbaru</option>
                    <option value="DATE_ASC">Tanggal Terlama</option>
                    <option value="NAME_ASC">Nama (A - Z)</option>
                    <option value="STATUS_PRIORITY">Prioritas Status Hadir</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="sm:hidden divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white">
              {sortedAndFilteredReportRows.length > 0 ? (
                sortedAndFilteredReportRows.map((row, idx) => (
                  <div key={`${row.eventId}-${row.jamaahId}`} className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono text-slate-400">#{idx + 1}</span>
                          <span className="font-bold text-slate-900 text-sm">{row.nama}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            row.jenis_kelamin === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                          }`}>
                            {row.jenis_kelamin === 'L' ? 'L' : 'P'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{row.kategori}</div>
                      </div>
                      <div className="shrink-0">
                        {row.status === 'HADIR' && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Hadir
                          </span>
                        )}
                        {row.status === 'DARING' && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                            Daring
                          </span>
                        )}
                        {row.status === 'IZIN' && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Izin
                          </span>
                        )}
                        {row.status === 'SAKIT' && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            Sakit
                          </span>
                        )}
                        {row.status === 'ALPA' && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Alpa
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-50">
                      <span className="truncate max-w-[200px]">{row.eventTema}</span>
                      <span className={row.status === 'ALPA' ? 'text-rose-500' : 'text-slate-400'}>{row.keterangan}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Tidak ada data kehadiran yang sesuai dengan filter pencarian.
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">No</th>
                    <th className="px-4 py-3">Nama Jamaah</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Gender</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3 hidden md:table-cell">Acara / Agenda</th>
                    <th className="px-4 py-3 text-center">Status Kehadiran</th>
                    <th className="px-4 py-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedAndFilteredReportRows.length > 0 ? (
                    sortedAndFilteredReportRows.map((row, idx) => (
                      <tr key={`${row.eventId}-${row.jamaahId}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{row.nama}</td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.jenis_kelamin === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                          }`}>
                            {row.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{row.kategori}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-slate-700 line-clamp-1">{row.eventTema}</td>
                        <td className="px-4 py-3 text-center">
                          {row.status === 'HADIR' && (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Hadir
                            </span>
                          )}
                          {row.status === 'DARING' && (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                              Daring
                            </span>
                          )}
                          {row.status === 'IZIN' && (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Izin
                            </span>
                          )}
                          {row.status === 'SAKIT' && (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              Sakit
                            </span>
                          )}
                          {row.status === 'ALPA' && (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Tanpa Keterangan
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-medium ${row.status === 'ALPA' ? 'text-rose-600' : 'text-slate-500'}`}>
                            {row.keterangan}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        Tidak ada data kehadiran yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
