import React, { useState, useMemo } from 'react';
import {
  Users,
  Calendar,
  CheckCircle,
  TrendingUp,
  ChevronRight,
  BarChart3,
  ArrowUpDown,
  RotateCcw
} from 'lucide-react';
import { useAppStore } from '../store/store';
import PublicEventDetail from './PublicEventDetail';
import {
  formatDateTimeWIB,
  getLocalDateStr,
  getPeriodRange,
  isDateInPeriod,
  INDONESIAN_MONTHS,
  formatDateWIB
} from '../utils/dateUtils';

export default function AdminOverview({ onNavigate }) {
  const jamaahList = useAppStore((state) => state.jamaah);
  const events = useAppStore((state) => state.events);
  const categories = useAppStore((state) => state.categories);
  const attendance = useAppStore((state) => state.attendance);
  const auditLogs = useAppStore((state) => state.auditLogs);

  const [selectedEventForModal, setSelectedEventForModal] = useState(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Filter & Sort state untuk Statistik Kehadiran
  const [overviewPeriodType, setOverviewPeriodType] = useState('ALL'); // 'ALL' | 'THIS_WEEK' | 'THIS_MONTH' | 'SPECIFIC_MONTH' | 'CUSTOM'
  const [overviewMonth, setOverviewMonth] = useState(currentMonth);
  const [overviewYear, setOverviewYear] = useState(currentYear);
  const [overviewStartDate, setOverviewStartDate] = useState('');
  const [overviewEndDate, setOverviewEndDate] = useState('');
  const [overviewSortOrder, setOverviewSortOrder] = useState('DATE_DESC'); // 'DATE_DESC' | 'DATE_ASC' | 'RATE_DESC' | 'RATE_ASC' | 'TITLE_ASC'

  // Today's date string in local time (YYYY-MM-DD)
  const todayStr = getLocalDateStr(now);
  const todayEvents = events.filter(e => getLocalDateStr(e.tanggal) === todayStr);

  // Info label rentang periode aktif
  const overviewPeriodInfo = useMemo(() => {
    return getPeriodRange(overviewPeriodType, {
      startDate: overviewStartDate,
      endDate: overviewEndDate,
      month: overviewMonth,
      year: overviewYear,
    });
  }, [overviewPeriodType, overviewStartDate, overviewEndDate, overviewMonth, overviewYear]);

  // Acara yang masuk dalam periode terpilih
  const overviewFilteredEvents = useMemo(() => {
    return events.filter(e => {
      return isDateInPeriod(e.tanggal, overviewPeriodType, {
        startDate: overviewStartDate,
        endDate: overviewEndDate,
        month: overviewMonth,
        year: overviewYear,
      });
    });
  }, [events, overviewPeriodType, overviewStartDate, overviewEndDate, overviewMonth, overviewYear]);

  // Hitung statistik keseluruhan dalam periode
  const totalJamaah = jamaahList.filter(j => j.isActive).length;

  let totalAttended = 0;
  let totalRecords = 0;
  overviewFilteredEvents.forEach(ev => {
    const attMap = attendance[ev.id] || attendance[Number(ev.id)] || {};
    const targetCats = (ev.targetCategoryIds && ev.targetCategoryIds.length > 0)
      ? ev.targetCategoryIds
      : (ev.targetCategoryId ? [ev.targetCategoryId] : [1]);
    const isGeneral = targetCats.includes(1) || (categories.length > 0 && targetCats.length >= categories.length);
    const targetGender = ev.target_gender || ev.targetGender || 'ALL';
    const eligible = jamaahList.filter(j => {
      if (!j.isActive) return false;
      if (targetGender === 'L' && j.jenis_kelamin !== 'L') return false;
      if (targetGender === 'P' && j.jenis_kelamin !== 'P') return false;
      if (isGeneral) return true;
      return (j.categoryIds || []).some(cid => targetCats.includes(cid));
    });

    eligible.forEach(j => {
      totalRecords++;
      const s = attMap[j.id];
      if (s === 'HADIR' || s === 'DARING') totalAttended++;
    });
  });
  const avgAttendance = totalRecords > 0 ? Math.round((totalAttended / totalRecords) * 100) : 0;

  // Category statistics calculation berdasarkan acara dalam periode terpilih (diawali kartu Keseluruhan)
  const categoryStats = useMemo(() => {
    const totalActiveMembers = jamaahList.filter(j => j.isActive).length;

    let allHadirCount = 0;
    let allTotalAssigned = 0;

    overviewFilteredEvents.forEach(ev => {
      const eventAtt = attendance[ev.id] || attendance[Number(ev.id)] || {};
      Object.entries(eventAtt).forEach(([jId, status]) => {
        allTotalAssigned++;
        if (status === 'HADIR' || status === 'DARING') {
          allHadirCount++;
        }
      });
    });

    const allRate = allTotalAssigned > 0 ? Math.round((allHadirCount / allTotalAssigned) * 100) : 0;

    const overallCard = {
      id: 'ALL_CATEGORIES',
      nama_kategori: 'Semua Kategori (Keseluruhan)',
      deskripsi: 'Persentase akumulasi seluruh kategori jamaah terdaftar',
      totalMembers: totalActiveMembers,
      hadirCount: allHadirCount,
      totalAssigned: allTotalAssigned,
      rate: allRate,
      isOverall: true
    };

    const catList = categories.map(cat => {
      const members = jamaahList.filter(j => j.categoryIds && j.categoryIds.includes(cat.id));
      const memberIds = new Set(members.map(m => m.id));

      let hadirCount = 0;
      let totalAssigned = 0;

      overviewFilteredEvents.forEach(ev => {
        const eventAtt = attendance[ev.id] || attendance[Number(ev.id)] || {};
        Object.entries(eventAtt).forEach(([jId, status]) => {
          if (memberIds.has(Number(jId))) {
            totalAssigned++;
            if (status === 'HADIR' || status === 'DARING') {
              hadirCount++;
            }
          }
        });
      });

      const rate = totalAssigned > 0 ? Math.round((hadirCount / totalAssigned) * 100) : 0;

      return {
        ...cat,
        totalMembers: members.length,
        hadirCount,
        totalAssigned,
        rate,
        isOverall: false
      };
    });

    return [overallCard, ...catList];
  }, [categories, jamaahList, attendance, overviewFilteredEvents]);

  // Daftar acara untuk tabel rekapitulasi (disortir dan difilter)
  const eventRecapList = useMemo(() => {
    const list = overviewFilteredEvents.map(event => {
      const att = Object.values(attendance[event.id] || attendance[Number(event.id)] || {});
      const hadir = att.filter(s => s === 'HADIR').length;
      const daring = att.filter(s => s === 'DARING').length;
      const izin = att.filter(s => s === 'IZIN' || s === 'SAKIT').length;
      const totalTercatat = att.length;
      const totalHadir = hadir + daring;
      const rate = totalTercatat > 0 ? Math.round((totalHadir / totalTercatat) * 100) : 0;

      return {
        ...event,
        hadir,
        daring,
        izin,
        totalTercatat,
        totalHadir,
        rate,
      };
    });

    return [...list].sort((a, b) => {
      if (overviewSortOrder === 'DATE_DESC') {
        const da = a.tanggal ? new Date(a.tanggal).getTime() : 0;
        const db = b.tanggal ? new Date(b.tanggal).getTime() : 0;
        return db - da;
      }
      if (overviewSortOrder === 'DATE_ASC') {
        const da = a.tanggal ? new Date(a.tanggal).getTime() : 0;
        const db = b.tanggal ? new Date(b.tanggal).getTime() : 0;
        return da - db;
      }
      if (overviewSortOrder === 'RATE_DESC') {
        return b.rate - a.rate;
      }
      if (overviewSortOrder === 'RATE_ASC') {
        return a.rate - b.rate;
      }
      if (overviewSortOrder === 'TITLE_ASC') {
        return (a.tema || '').localeCompare(b.tema || '');
      }
      return 0;
    });
  }, [overviewFilteredEvents, attendance, overviewSortOrder]);

  const kpis = [
    { label: 'Total Jamaah Aktif', value: totalJamaah, icon: Users, color: 'emerald', change: `${totalJamaah} terdaftar` },
    { label: 'Agenda dalam Periode', value: overviewFilteredEvents.length, icon: Calendar, color: 'blue', change: `${overviewFilteredEvents.filter(e => e.is_published).length} publik` },
    { label: 'Rata-rata Kehadiran', value: `${avgAttendance}%`, icon: TrendingUp, color: 'amber', change: totalRecords > 0 ? overviewPeriodInfo.shortLabel : 'Belum ada absensi' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-card">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Pusat Kendali Pengajian & Absensi Digital
          </h2>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle hover:shadow-card transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                <div className="p-2 rounded-xl bg-slate-100 text-brand-700">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{kpi.value}</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                {kpi.change}
              </span>
            </div>
          );
        })}
      </div>

      {/* Agenda Hari Ini Notification Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="font-bold text-slate-900 text-base">Agenda Pengajian Hari Ini</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Acara yang dijadwalkan berlangsung pada tanggal hari ini.
            </p>
          </div>
          <button
            onClick={() => onNavigate('attendance')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors self-start sm:self-auto"
          >
            <CheckCircle className="w-4 h-4 text-emerald-300" />
            <span>Buka Absensi</span>
          </button>
        </div>

        <div className="pt-4">
          {todayEvents.length > 0 ? (
            <div className="space-y-3">
              {todayEvents.map(event => {
                const attCount = Object.keys(attendance[event.id] || {}).length;
                return (
                  <div key={event.id} className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-200/70 text-emerald-900">
                          {event.waktu}
                        </span>
                        <span className="text-xs text-slate-600 font-medium">
                          {event.lokasi || 'Masjid At-Taqwa'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base">{event.tema}</h4>
                      {event.pembicara && event.pembicara.trim() && (
                        <p className="text-xs text-slate-500 mt-0.5">Pemateri: {event.pembicara}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">Tercatat Absen:</span>
                        <span className="font-bold text-slate-800 text-sm">{attCount} Jamaah</span>
                      </div>
                      <button
                        onClick={() => onNavigate('attendance', event.id)}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100 text-brand-800 border border-emerald-300 text-xs font-bold transition-colors"
                      >
                        Input Absen
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs sm:text-sm">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Tidak ada jadwal pengajian yang disetel untuk hari ini. Anda dapat menginput absensi untuk acara lainnya di menu Absensi.
            </div>
          )}
        </div>
      </div>

      {/* Statistik Kehadiran Jamaah Section */}
      <div className="space-y-6 pt-2">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <BarChart3 className="w-5 h-5 text-brand-700" />
              Statistik Kehadiran Jamaah
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Persentase partisipasi per bulan, per minggu, atau tanggal tertentu.
            </p>
          </div>

          {/* Sortir Dropdown */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-500 font-medium">Urutkan:</span>
              <select
                value={overviewSortOrder}
                onChange={(e) => setOverviewSortOrder(e.target.value)}
                className="font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="DATE_DESC">Tanggal Terbaru</option>
                <option value="DATE_ASC">Tanggal Terlama</option>
                <option value="RATE_DESC">Persentase Tertinggi</option>
                <option value="RATE_ASC">Persentase Terendah</option>
                <option value="TITLE_ASC">Nama Agenda (A - Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Periode Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-700" />
              <span className="font-bold text-slate-800 text-xs sm:text-sm">Filter Periode Waktu</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Periode:</span>
              <span className="px-2.5 py-1 rounded-full font-bold bg-brand-50 text-brand-700 border border-brand-200/60">
                {overviewPeriodInfo.label}
              </span>
              {overviewPeriodType !== 'ALL' && (
                <button
                  onClick={() => {
                    setOverviewPeriodType('ALL');
                    setOverviewStartDate('');
                    setOverviewEndDate('');
                  }}
                  className="text-slate-400 hover:text-slate-600 font-medium underline flex items-center gap-1 ml-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setOverviewPeriodType('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                overviewPeriodType === 'ALL'
                  ? 'bg-brand-700 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              Semua Waktu
            </button>
            <button
              onClick={() => setOverviewPeriodType('THIS_WEEK')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                overviewPeriodType === 'THIS_WEEK'
                  ? 'bg-brand-700 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              Minggu Ini
            </button>
            <button
              onClick={() => setOverviewPeriodType('THIS_MONTH')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                overviewPeriodType === 'THIS_MONTH'
                  ? 'bg-brand-700 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setOverviewPeriodType('SPECIFIC_MONTH')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                overviewPeriodType === 'SPECIFIC_MONTH'
                  ? 'bg-brand-700 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              Pilih Bulan
            </button>
            <button
              onClick={() => setOverviewPeriodType('CUSTOM')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                overviewPeriodType === 'CUSTOM'
                  ? 'bg-brand-700 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              Rentang Tanggal
            </button>
          </div>

          {/* Input Spesifik Bulan */}
          {overviewPeriodType === 'SPECIFIC_MONTH' && (
            <div className="pt-1 flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2 text-xs">
                <label className="font-semibold text-slate-600">Bulan:</label>
                <select
                  value={overviewMonth}
                  onChange={(e) => setOverviewMonth(Number(e.target.value))}
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
                  value={overviewYear}
                  onChange={(e) => setOverviewYear(Number(e.target.value))}
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
          {overviewPeriodType === 'CUSTOM' && (
            <div className="pt-1 flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
              <div className="flex items-center gap-2">
                <label className="font-semibold text-slate-600">Mulai:</label>
                <input
                  type="date"
                  value={overviewStartDate}
                  onChange={(e) => setOverviewStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="font-semibold text-slate-600">Sampai:</label>
                <input
                  type="date"
                  value={overviewEndDate}
                  onChange={(e) => setOverviewEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              {(overviewStartDate || overviewEndDate) && (
                <button
                  onClick={() => { setOverviewStartDate(''); setOverviewEndDate(''); }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline"
                >
                  Bersihkan Tanggal
                </button>
              )}
            </div>
          )}
        </div>

        {/* Category Cards Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categoryStats.map(cat => (
            <div
              key={cat.id}
              className={`rounded-2xl p-5 transition-all ${
                cat.isOverall
                  ? 'bg-gradient-to-br from-brand-50/90 via-white to-emerald-50/70 border-2 border-brand-300/80 shadow-card ring-1 ring-brand-500/20'
                  : 'bg-white rounded-2xl border border-slate-200/90 shadow-subtle hover:shadow-card'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  {cat.isOverall && (
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-600 shrink-0 ring-4 ring-brand-100"></span>
                  )}
                  <span className={`text-base truncate ${cat.isOverall ? 'font-extrabold text-brand-950' : 'font-bold text-slate-900'}`}>
                    {cat.nama_kategori}
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                  cat.isOverall
                    ? 'bg-brand-700 text-white shadow-xs'
                    : 'bg-brand-50 text-brand-700 border border-brand-200/60'
                }`}>
                  {cat.totalMembers} Jamaah
                </span>
              </div>

              <p className={`text-xs mb-4 line-clamp-1 ${cat.isOverall ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>
                {cat.deskripsi || 'Kelompok kategori jamaah terdaftar'}
              </p>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Tingkat Keaktifan</span>
                  <span className={`font-bold ${cat.isOverall ? 'text-emerald-800 text-sm' : 'text-emerald-700'}`}>
                    {cat.rate}% {cat.totalAssigned > 0 ? `(${cat.hadirCount}/${cat.totalAssigned})` : ''}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-brand-600 rounded-full transition-all duration-500"
                    style={{ width: `${cat.rate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Attendance breakdown per event table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-base">Rekapitulasi Kehadiran per Acara</h4>
              <p className="text-xs text-slate-500">
                Menampilkan kehadiran kegiatan pada {overviewPeriodInfo.label}.
              </p>
            </div>
          </div>

          {/* Mobile Card List */}
          <div className="sm:hidden divide-y divide-slate-100">
            {eventRecapList.length > 0 ? (
              eventRecapList.map(event => (
                <div key={event.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-slate-800 text-sm block line-clamp-2">{event.tema}</span>
                      {event.pembicara && event.pembicara.trim() && (
                        <span className="text-xs text-slate-400 block mt-0.5">{event.pembicara}</span>
                      )}
                      <span className="text-xs text-slate-500 block mt-1">
                        {new Date(event.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold block ${
                        event.rate >= 75
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : event.rate >= 50
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {event.rate}% Hadir
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="bg-emerald-50 border border-emerald-100/80 rounded-xl p-2">
                      <span className="block text-[11px] text-emerald-700 font-medium">Hadir</span>
                      <span className="text-sm font-bold text-emerald-800">{event.hadir}</span>
                    </div>
                    <div className="bg-sky-50 border border-sky-100/80 rounded-xl p-2">
                      <span className="block text-[11px] text-sky-700 font-medium">Daring</span>
                      <span className="text-sm font-bold text-sky-800">{event.daring}</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-100/80 rounded-xl p-2">
                      <span className="block text-[11px] text-amber-700 font-medium">Izin/Sakit</span>
                      <span className="text-sm font-bold text-amber-800">{event.izin}</span>
                    </div>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => setSelectedEventForModal(event)}
                      className="text-xs font-semibold text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 px-3.5 py-1.5 rounded-lg transition-colors"
                    >
                      Detail
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs px-4 space-y-2">
                <p>Tidak ada kegiatan pengajian pada periode {overviewPeriodInfo.label}.</p>
                {overviewPeriodType !== 'ALL' && (
                  <button
                    onClick={() => {
                      setOverviewPeriodType('ALL');
                      setOverviewStartDate('');
                      setOverviewEndDate('');
                    }}
                    className="text-xs text-brand-700 font-bold underline"
                  >
                    Reset ke Semua Waktu
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Nama Acara / Agenda</th>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3 text-center">Persentase Kehadiran</th>
                  <th className="px-5 py-3 text-center">Hadir Fisik</th>
                  <th className="px-5 py-3 text-center">Daring</th>
                  <th className="px-5 py-3 text-center">Izin / Sakit</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eventRecapList.length > 0 ? (
                  eventRecapList.map(event => (
                    <tr key={event.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-slate-800 block line-clamp-1">{event.tema}</span>
                        {event.pembicara && event.pembicara.trim() && (
                          <span className="text-xs text-slate-400">{event.pembicara}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                        {new Date(event.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                event.rate >= 75 ? 'bg-emerald-500' : event.rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${event.rate}%` }}
                            />
                          </div>
                          <span className={`font-bold text-xs ${
                            event.rate >= 75 ? 'text-emerald-700' : event.rate >= 50 ? 'text-amber-700' : 'text-rose-700'
                          }`}>
                            {event.rate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs">
                          {event.hadir}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full text-xs">
                          {event.daring}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full text-xs">
                          {event.izin}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedEventForModal(event)}
                          className="text-xs font-semibold text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-slate-400 text-xs">
                      Tidak ada kegiatan pengajian pada periode {overviewPeriodInfo.label}.
                      {overviewPeriodType !== 'ALL' && (
                        <div className="mt-2">
                          <button
                            onClick={() => {
                              setOverviewPeriodType('ALL');
                              setOverviewStartDate('');
                              setOverviewEndDate('');
                            }}
                            className="text-xs text-brand-700 font-bold underline"
                          >
                            Reset ke Semua Waktu
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Grid: Upcoming Events & Recent Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Upcoming Events */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Jadwal Pengajian Mendatang</h3>
              <button
                onClick={() => onNavigate('events')}
                className="text-xs font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-1"
              >
                <span>Kelola Semua</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {events.length > 0 ? (
                events.slice(0, 4).map(event => (
                  <div key={event.id} className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                        {new Date(event.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <h4 className="font-semibold text-slate-900 text-xs sm:text-sm line-clamp-1">{event.tema}</h4>
                      <p className="text-[11px] text-slate-500">{event.waktu} • {event.lokasi || 'Masjid'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${event.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                        {event.is_published ? 'Publik' : 'Internal'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                  Belum ada jadwal acara / agenda di database. Klik menu "Manajemen Jadwal" untuk membuat kegiatan pertama.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Audit Trail Quick View */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Aktivitas Terakhir (Audit)</h3>
              <button
                onClick={() => onNavigate('audit')}
                className="text-xs font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-1"
              >
                <span>Semua Log</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {auditLogs.length > 0 ? (
                auditLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="text-xs space-y-1 border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{log.adminNama}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDateTimeWIB(log.createdAt || log.timestamp)}
                      </span>
                    </div>
                    <p className="text-slate-600 line-clamp-1">
                      <span className="font-semibold text-brand-700">[{log.action}]</span> {log.details}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                  Belum ada catatan aktivitas di database.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Detail Event */}
      {selectedEventForModal && (
        <PublicEventDetail
          event={selectedEventForModal}
          onClose={() => setSelectedEventForModal(null)}
          showAllAttendees={true}
        />
      )}
    </div>
  );
}
