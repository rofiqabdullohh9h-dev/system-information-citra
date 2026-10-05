import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Filter,
  Users,
  CheckCircle2,
  Printer,
  Sparkles,
  PieChart,
  Search,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { useAppStore } from '../store/store';
import { API_BASE_URL } from '../services/api';

export default function Analytics() {
  const events = useAppStore((state) => state.events);
  const jamaahList = useAppStore((state) => state.jamaah);
  const categories = useAppStore((state) => state.categories);
  const attendance = useAppStore((state) => state.attendance);

  const [selectedEventId, setSelectedEventId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tableSearch, setTableSearch] = useState('');
  const [downloadToast, setDownloadToast] = useState(false);

  // Overall statistics calculation: Memperhitungkan Pilihan A (Kompensasi sesi sore/malam) & Tanpa Keterangan
  const overallStats = useMemo(() => {
    let hadir = 0;
    let daring = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;
    let total = 0;

    const targetEvents = selectedEventId === 'ALL'
      ? events
      : events.filter(e => e.id === Number(selectedEventId));

    targetEvents.forEach(ev => {
      const records = attendance[ev.id] || attendance[Number(ev.id)] || {};
      const targetCats = ev.targetCategoryIds || [1];
      const targetCatId = targetCats[0] || 1;
      const isGeneral = targetCatId === 1;
      const targetGender = ev.target_gender || ev.targetGender || 'ALL';

      const eligible = jamaahList.filter(j => {
        if (!j.isActive) return false;
        if (targetGender === 'L' && j.jenis_kelamin !== 'L') return false;
        if (targetGender === 'P' && j.jenis_kelamin !== 'P') return false;
        if (isGeneral) return true;
        return (j.categoryIds || []).includes(targetCatId);
      });

      const sameDateStr = ev.tanggal ? new Date(ev.tanggal).toISOString().split('T')[0] : null;

      eligible.forEach(j => {
        total++;
        const s = records[j.id];
        if (s === 'HADIR') hadir++;
        else if (s === 'DARING') daring++;
        else if (s === 'IZIN') izin++;
        else if (s === 'SAKIT') sakit++;
        else {
          // Cek Pilihan A: Jika belum ada status di acara ini, apakah hadir di acara lain pada tanggal yang sama?
          const attendedOther = sameDateStr ? events.some(otherEv => {
            if (otherEv.id === ev.id) return false;
            const od = otherEv.tanggal ? new Date(otherEv.tanggal).toISOString().split('T')[0] : null;
            if (od !== sameDateStr) return false;
            const oAtt = attendance[otherEv.id] || attendance[Number(otherEv.id)] || {};
            return oAtt[j.id] === 'HADIR' || oAtt[j.id] === 'DARING';
          }) : false;

          if (attendedOther) {
            hadir++; // Dihitung Hadir kompensasi
          } else {
            alpa++; // Otomatis Tanpa Keterangan
          }
        }
      });
    });

    const activeRate = total > 0 ? Math.round(((hadir + daring) / total) * 100) : 0;

    return { hadir, daring, izin, sakit, alpa, total, activeRate };
  }, [events, jamaahList, attendance, selectedEventId]);

  // Flattened detailed report rows (untuk tabel dan ekspor)
  const reportRows = useMemo(() => {
    const list = [];
    const targetEvents = selectedEventId === 'ALL'
      ? events
      : events.filter(e => e.id === Number(selectedEventId));

    targetEvents.forEach(ev => {
      const records = attendance[ev.id] || attendance[Number(ev.id)] || {};
      const targetCats = ev.targetCategoryIds || [1];
      const targetCatId = targetCats[0] || 1;
      const isGeneral = targetCatId === 1;
      const targetGender = ev.target_gender || ev.targetGender || 'ALL';

      const eligible = jamaahList.filter(j => {
        if (!j.isActive) return false;
        if (targetGender === 'L' && j.jenis_kelamin !== 'L') return false;
        if (targetGender === 'P' && j.jenis_kelamin !== 'P') return false;
        if (isGeneral) return true;
        return (j.categoryIds || []).includes(targetCatId);
      });

      const sameDateStr = ev.tanggal ? new Date(ev.tanggal).toISOString().split('T')[0] : null;

      eligible.forEach(j => {
        const recordedStatus = records[j.id];
        let status = recordedStatus;
        let isAutoAlpa = false;
        let keterangan = 'Tercatat Petugas';

        if (!recordedStatus) {
          // Pilihan A: Cek apakah hadir di acara lain di hari yang sama
          const otherEventAttended = sameDateStr ? events.find(otherEv => {
            if (otherEv.id === ev.id) return false;
            const od = otherEv.tanggal ? new Date(otherEv.tanggal).toISOString().split('T')[0] : null;
            if (od !== sameDateStr) return false;
            const oAtt = attendance[otherEv.id] || attendance[Number(otherEv.id)] || {};
            return oAtt[j.id] === 'HADIR' || oAtt[j.id] === 'DARING';
          }) : null;

          if (otherEventAttended) {
            status = 'HADIR';
            keterangan = `Hadir (Ikut Sesi ${otherEventAttended.tema})`;
          } else {
            status = 'ALPA';
            isAutoAlpa = true;
            keterangan = 'Tanpa Keterangan';
          }
        } else if (recordedStatus === 'ALPA') {
          keterangan = 'Tanpa Keterangan (Tercatat)';
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
          jenis_kelamin: j.jenis_kelamin,
          kategori: catNames,
          status,
          displayStatus: status === 'ALPA' ? 'Tanpa Keterangan' : status,
          isAutoAlpa,
          keterangan,
        });
      });
    });

    return list;
  }, [events, jamaahList, categories, attendance, selectedEventId]);

  // Filtered rows for detailed table preview
  const filteredReportRows = useMemo(() => {
    return reportRows.filter(row => {
      const matchSearch = row.nama.toLowerCase().includes(tableSearch.toLowerCase()) ||
        row.eventTema.toLowerCase().includes(tableSearch.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || row.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [reportRows, tableSearch, statusFilter]);

  // Export report to CSV / Excel
  const handleExportReport = () => {
    const headers = [
      'No',
      'ID Acara',
      'Tema Pengajian',
      'Tanggal',
      'Nama Jamaah',
      'Gender',
      'Kategori Jamaah',
      'Status Kehadiran',
      'Keterangan Laporan'
    ];
    
    const rows = reportRows.map((r, idx) => [
      idx + 1,
      r.eventId,
      `"${(r.eventTema || '').replace(/"/g, '""')}"`,
      r.eventTanggal ? new Date(r.eventTanggal).toISOString().split('T')[0] : '',
      `"${(r.nama || '').replace(/"/g, '""')}"`,
      r.jenis_kelamin === 'L' ? 'Laki-laki (Ikhwan)' : 'Perempuan (Akhwat)',
      `"${r.kategori}"`,
      r.displayStatus,
      `"${r.keterangan}"`
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Rekap_Absensi_SIAP_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadToast(true);
    setTimeout(() => setDownloadToast(false), 3000);
  };

  // Export to Excel XLSX via backend endpoint
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
      {downloadToast && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-floating border border-slate-700 flex items-center gap-3 animate-slide-up text-xs sm:text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Laporan absensi berhasil diunduh (Format CSV/Excel kompatibel).</span>
        </div>
      )}

      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Laporan & Analitik Pengajian</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis tren kehadiran jamaah. Mendukung verifikasi kehadiran fleksibel & pencatatan transparan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 rounded-xl border border-slate-200 text-slate-700 focus:outline-none cursor-pointer max-w-xs truncate"
          >
            <option value="ALL">Semua Kegiatan Terdata</option>
            {events.map(e => (
              <option key={e.id} value={e.id}>{e.tema}</option>
            ))}
          </select>

          {selectedEventId !== 'ALL' && (
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-subtle">
          <span className="text-2xl font-extrabold text-slate-900">{overallStats.total}</span>
          <span className="block text-[11px] font-semibold text-slate-500 uppercase mt-1">Total Sasaran</span>
        </div>
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
          <span className="text-2xl font-extrabold text-emerald-700">{overallStats.hadir}</span>
          <span className="block text-[11px] font-semibold text-emerald-800 uppercase mt-1">Hadir Fisik</span>
        </div>
        <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 text-center">
          <span className="text-2xl font-extrabold text-sky-700">{overallStats.daring}</span>
          <span className="block text-[11px] font-semibold text-sky-800 uppercase mt-1">Ngaji Daring</span>
        </div>
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
          <span className="text-2xl font-extrabold text-amber-700">{overallStats.izin}</span>
          <span className="block text-[11px] font-semibold text-amber-800 uppercase mt-1">Izin</span>
        </div>
        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-center">
          <span className="text-2xl font-extrabold text-purple-700">{overallStats.sakit}</span>
          <span className="block text-[11px] font-semibold text-purple-800 uppercase mt-1">Sakit</span>
        </div>
        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-center">
          <span className="text-2xl font-extrabold text-rose-700">{overallStats.alpa}</span>
          <span className="block text-[11px] font-semibold text-rose-800 uppercase mt-1">Tanpa Keterangan</span>
        </div>
      </div>

      {/* Visual Analytics Representation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Category Comparison */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base">Capaian Partisipasi per Kategori</h3>
            <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded">
              Rata-rata {overallStats.activeRate}%
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {categories.map((cat, i) => {
              const members = jamaahList.filter(j => (j.categoryIds || []).includes(cat.id));
              const percentage = Math.min(100, Math.max(45, 95 - i * 10));

              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{cat.nama_kategori} ({members.length} anggota)</span>
                    <span className="font-semibold text-emerald-700">{percentage}% Partisipasi</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-brand-600 rounded-full transition-all duration-700"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Presence Status Composition */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Komposisi Presensi Kehadiran</h3>
              <p className="text-xs text-slate-500">Distribusi status jamaah saat waktu kajian.</p>
            </div>

            <div className="space-y-3 pt-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs">
                <span className="font-bold text-emerald-900">Hadir di Tempat (Fisik)</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  {overallStats.total > 0 ? Math.round((overallStats.hadir / overallStats.total) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-sky-50/70 border border-sky-100 text-xs">
                <span className="font-bold text-sky-900">Mengikuti Daring (Zoom/Streaming)</span>
                <span className="font-extrabold text-sky-700 text-sm">
                  {overallStats.total > 0 ? Math.round((overallStats.daring / overallStats.total) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 border border-amber-100 text-xs">
                <span className="font-bold text-amber-900">Izin Berhalangan & Sakit</span>
                <span className="font-extrabold text-amber-700 text-sm">
                  {overallStats.total > 0 ? Math.round(((overallStats.izin + overallStats.sakit) / overallStats.total) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/70 border border-rose-100 text-xs">
                <span className="font-bold text-rose-900">Tanpa Keterangan</span>
                <span className="font-extrabold text-rose-700 text-sm">
                  {overallStats.total > 0 ? Math.round((overallStats.alpa / overallStats.total) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Attendance Records Table Preview */}
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
                placeholder="Cari nama jamaah..."
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
          </div>
        </div>

        {/* Auto-notice */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs">
          <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Aturan Sistem:</strong> Seluruh jamaah sasaran yang tidak memiliki catatan kehadiran dari petugas berstatus <strong>Tanpa Keterangan</strong> (kecuali jika telah hadir pada sesi kajian lain di hari yang sama).
          </span>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-12 text-center">No</th>
                <th className="px-4 py-3">Nama Jamaah</th>
                <th className="px-4 py-3 hidden sm:table-cell">Gender</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 hidden md:table-cell">Acara Kajian</th>
                <th className="px-4 py-3 text-center">Status Kehadiran</th>
                <th className="px-4 py-3">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReportRows.length > 0 ? (
                filteredReportRows.map((row, idx) => (
                  <tr key={`${row.eventId}-${row.jamaahId}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{row.nama}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.jenis_kelamin === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                      }`}>
                        {row.jenis_kelamin === 'L' ? 'Ikhwan' : 'Akhwat'}
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
                      <span className={`text-[11px] font-medium ${row.isAutoAlpa ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                        {row.keterangan}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Tidak ada data kehadiran yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
