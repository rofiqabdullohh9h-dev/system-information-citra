import React, { useState, useMemo } from 'react';
import {
  Users,
  Calendar,
  CheckCircle,
  TrendingUp,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { useAppStore } from '../store/store';
import PublicEventDetail from './PublicEventDetail';
import { formatDateTimeWIB } from '../utils/dateUtils';

export default function AdminOverview({ onNavigate }) {
  const jamaahList = useAppStore((state) => state.jamaah);
  const events = useAppStore((state) => state.events);
  const categories = useAppStore((state) => state.categories);
  const attendance = useAppStore((state) => state.attendance);
  const auditLogs = useAppStore((state) => state.auditLogs);

  const [selectedEventForModal, setSelectedEventForModal] = useState(null);

  // Local date helper to avoid UTC timezone offset mismatch
  const getLocalDateStr = (d) => {
    if (!d) return '';
    if (typeof d === 'string') {
      const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
    }
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return '';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Today's date string in local time (YYYY-MM-DD)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayEvents = events.filter(e => getLocalDateStr(e.tanggal) === todayStr);

  // Calculate overall stats
  const totalJamaah = jamaahList.filter(j => j.isActive).length;
  const totalEvents = events.length;
  
  // Calculate average attendance rate across events (unrecorded automatically counted as ALPA)
  let totalAttended = 0;
  let totalRecords = 0;
  events.forEach(ev => {
    const attMap = attendance[ev.id] || attendance[Number(ev.id)] || {};
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

    eligible.forEach(j => {
      totalRecords++;
      const s = attMap[j.id];
      if (s === 'HADIR' || s === 'DARING') totalAttended++;
    });
  });
  const avgAttendance = totalRecords > 0 ? Math.round((totalAttended / totalRecords) * 100) : 0;

  // Category statistics calculation
  const categoryStats = useMemo(() => {
    return categories.map(cat => {
      const members = jamaahList.filter(j => j.categoryIds && j.categoryIds.includes(cat.id));
      const memberIds = new Set(members.map(m => m.id));

      let hadirCount = 0;
      let totalAssigned = 0;

      Object.values(attendance).forEach(eventAtt => {
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
        rate
      };
    });
  }, [categories, jamaahList, attendance]);

  const kpis = [
    { label: 'Total Jamaah Aktif', value: totalJamaah, icon: Users, color: 'emerald', change: `${totalJamaah} terdaftar` },
    { label: 'Total Jadwal Pengajian', value: totalEvents, icon: Calendar, color: 'blue', change: `${events.filter(e => e.is_published).length} publik` },
    { label: 'Rata-rata Kehadiran', value: `${avgAttendance}%`, icon: TrendingUp, color: 'amber', change: totalRecords > 0 ? 'Terdata otomatis' : 'Belum ada absensi' },
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

      {/* Today's Event Notification Card (FR-ATTENDANCE-001) */}
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
        <div className="pb-3 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-brand-700" />
            Statistik Kehadiran Jamaah
          </h3>
        </div>

        {/* Category Cards Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categoryStats.map(cat => (
            <div key={cat.id} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-subtle hover:shadow-card transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-slate-900 text-base">
                  {cat.nama_kategori}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200/60">
                  {cat.totalMembers} Jamaah
                </span>
              </div>

              <p className="text-xs text-slate-500 mb-4 line-clamp-1">
                {cat.deskripsi || 'Kelompok kategori jamaah terdaftar'}
              </p>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Tingkat Keaktifan</span>
                  <span className="font-bold text-emerald-700">{cat.rate}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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
              <p className="text-xs text-slate-500">Seluruh data kehadiran acara dengan rincian nama jamaah lengkap.</p>
            </div>
          </div>

          {/* Mobile Card List */}
          <div className="sm:hidden divide-y divide-slate-100">
            {events.length > 0 ? (
              events.map(event => {
                const att = Object.values(attendance[event.id] || {});
                const hadir = att.filter(s => s === 'HADIR').length;
                const daring = att.filter(s => s === 'DARING').length;
                const izin = att.filter(s => s === 'IZIN' || s === 'SAKIT').length;

                return (
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
                      <button
                        onClick={() => setSelectedEventForModal(event)}
                        className="shrink-0 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 active:bg-brand-200 px-3 py-1.5 rounded-lg border border-brand-200/60 transition-colors"
                      >
                        Detail
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="bg-emerald-50 border border-emerald-100/80 rounded-xl p-2">
                        <span className="block text-[11px] text-emerald-700 font-medium">Hadir</span>
                        <span className="text-sm font-bold text-emerald-800">{hadir}</span>
                      </div>
                      <div className="bg-sky-50 border border-sky-100/80 rounded-xl p-2">
                        <span className="block text-[11px] text-sky-700 font-medium">Daring</span>
                        <span className="text-sm font-bold text-sky-800">{daring}</span>
                      </div>
                      <div className="bg-amber-50 border border-amber-100/80 rounded-xl p-2">
                        <span className="block text-[11px] text-amber-700 font-medium">Izin/Sakit</span>
                        <span className="text-sm font-bold text-amber-800">{izin}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                Belum ada jadwal kegiatan di database.
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Nama Acara / Kajian</th>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3 text-center">Hadir Fisik</th>
                  <th className="px-5 py-3 text-center">Daring</th>
                  <th className="px-5 py-3 text-center">Izin / Sakit</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.length > 0 ? (
                  events.map(event => {
                    const att = Object.values(attendance[event.id] || {});
                    const hadir = att.filter(s => s === 'HADIR').length;
                    const daring = att.filter(s => s === 'DARING').length;
                    const izin = att.filter(s => s === 'IZIN' || s === 'SAKIT').length;

                    return (
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
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs">
                            {hadir}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full text-xs">
                            {daring}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full text-xs">
                            {izin}
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
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-slate-400 text-xs">
                      Belum ada jadwal kegiatan di database.
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
                  Belum ada jadwal kajian di database. Klik menu "Manajemen Jadwal" untuk membuat kegiatan pertama.
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

      {/* Modal Detail Event (Admin View with showAllAttendees=true) */}
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
