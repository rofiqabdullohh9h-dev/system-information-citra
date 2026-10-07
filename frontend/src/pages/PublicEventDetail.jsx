import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, User, Users, Share2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useAppStore } from '../store/store';
import { generateEventShareText } from '../utils/shareUtils';
import { getEligibleJamaahForEvent } from '../utils/attendanceUtils';

export default function PublicEventDetail({ event, onClose, showAllAttendees = false }) {
  const [activeGenderFilter, setActiveGenderFilter] = useState('ALL');
  const categories = useAppStore((state) => state.categories);
  const jamaahList = useAppStore((state) => state.jamaah);
  const attendance = useAppStore((state) => state.attendance);
  const events = useAppStore((state) => state.events);

  if (!event) return null;

  const safeCategories = categories || [];
  const safeJamaah = jamaahList || [];
  const safeAttendance = attendance || {};
  const safeEvents = events || [];

  // Safe date parser to prevent any RangeError: Invalid time value
  const safeIsoDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    } catch {
      return null;
    }
  };

  // Format Indonesian date safely
  const formatIndoDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Check if this event already has attendance records in database
  const attendanceMap = (event.id && safeAttendance[event.id]) || (event.id && safeAttendance[Number(event.id)]) || {};
  const hasAttendanceRecords = Boolean(attendanceMap && Object.keys(attendanceMap).length > 0);

  const eventDateStr = safeIsoDate(event.tanggal);

  // Dapatkan seluruh jamaah yang berhak/menjadi sasaran acara ini secara akurat
  const eligibleJamaah = getEligibleJamaahForEvent(event, safeJamaah, safeCategories);

  // Attendees list: only map if attendance has actually been recorded
  const attendeeDetails = hasAttendanceRecords ? eligibleJamaah.map((person) => {
    const recordedStatus = attendanceMap ? attendanceMap[person.id] : null;
    let status = recordedStatus;
    let isAutoAlpa = false;
    let isCrossAttended = false;

    if (!recordedStatus) {
      // Cek apakah hadir di acara lain pada tanggal yang sama (Pilihan A)
      const attendedOther = eventDateStr ? safeEvents.some(oe => {
        if (!oe || oe.id === event.id) return false;
        const od = safeIsoDate(oe.tanggal);
        if (od !== eventDateStr) return false;
        const oAtt = (safeAttendance && (safeAttendance[oe.id] || safeAttendance[Number(oe.id)])) || {};
        return oAtt[person.id] === 'HADIR' || oAtt[person.id] === 'DARING';
      }) : false;

      if (attendedOther) {
        status = 'HADIR';
        isCrossAttended = true;
      } else {
        status = 'ALPA';
        isAutoAlpa = true;
      }
    }

    return {
      jamaahId: person.id,
      nama: person.nama,
      jenis_kelamin: person.jenis_kelamin || 'L',
      status,
      isAutoAlpa,
      isCrossAttended,
      kategori: (person.categoryIds || []).map(cid => safeCategories.find(c => c.id === cid)?.nama_kategori).filter(Boolean).join(', ') || 'Umum'
    };
  }) : [];

  // Filter attendees by gender tab
  const filteredAttendees = attendeeDetails.filter(att => {
    if (activeGenderFilter === 'ALL') return true;
    return att.jenis_kelamin === activeGenderFilter;
  });

  // Calculate statistics
  const totalHadir = attendeeDetails.filter(a => a.status === 'HADIR').length;
  const totalDaring = attendeeDetails.filter(a => a.status === 'DARING').length;
  const totalIzin = attendeeDetails.filter(a => a.status === 'IZIN').length;
  const totalSakit = attendeeDetails.filter(a => a.status === 'SAKIT').length;
  const totalAlpa = attendeeDetails.filter(a => a.status === 'ALPA').length;
  const totalPeserta = attendeeDetails.length;

  const handleShareWA = () => {
    const text = generateEventShareText(event, categories);
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const getStatusBadge = (status, isAutoAlpa, isCrossAttended) => {
    switch (status) {
      case 'HADIR':
        if (isCrossAttended) {
          return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Hadir (Sesi Lain)</span>;
        }
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Hadir</span>;
      case 'DARING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">Ngaji Daring</span>;
      case 'IZIN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Izin</span>;
      case 'SAKIT':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">Sakit</span>;
      case 'ALPA':
        return (
          <span 
            className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200" 
            title="Tanpa Keterangan"
          >
            Tanpa Keterangan
          </span>
        );
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div 
        className="bg-white w-full max-w-3xl rounded-2xl shadow-floating border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-brand-900 via-brand-800 to-emerald-800 text-white flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
              {event.tema}
            </h2>
            {event.pembicara && event.pembicara.trim() && (
              <p className="text-sm font-medium text-emerald-200 mt-1.5 flex items-center gap-1.5">
                <User className="w-4 h-4" />
                <span>Pemateri: {event.pembicara}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Key Event Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/70 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px]">Tanggal</span>
                <span className="font-semibold text-slate-800">{formatIndoDate(event.tanggal)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px]">Waktu</span>
                <span className="font-semibold text-slate-800">{event.waktu}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px]">Lokasi</span>
                <span className="font-semibold text-slate-800">{event.lokasi || 'Masjid At-Taqwa'}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Deskripsi Acara
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200/60">
              {event.deskripsi || 'Tidak ada deskripsi tambahan untuk acara ini.'}
            </p>
          </div>

          {/* Attendance & Statistics Section */}
          {(event.show_statistics || showAllAttendees) ? (
            !hasAttendanceRecords ? (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <h5 className="font-bold text-slate-700 text-sm">Belum Ada Presensi Kehadiran</h5>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Pengurus belum menginput absensi kehadiran untuk kegiatan ini. Data statistik kehadiran akan tampil setelah absensi diisi.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Rekapitulasi Kehadiran Jamaah
                  </h4>
                  <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md">
                    Total Tercatat: {totalPeserta} Orang
                  </span>
                </div>

                {/* Statistics Counters */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                    <span className="text-xl sm:text-2xl font-bold text-emerald-700">{totalHadir}</span>
                    <span className="block text-[11px] font-medium text-emerald-800">Hadir Fisik</span>
                  </div>
                  <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-center">
                    <span className="text-xl sm:text-2xl font-bold text-sky-700">{totalDaring}</span>
                    <span className="block text-[11px] font-medium text-sky-800">Ngaji Daring</span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
                    <span className="text-xl sm:text-2xl font-bold text-amber-700">{totalIzin}</span>
                    <span className="block text-[11px] font-medium text-amber-800">Izin</span>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-center">
                    <span className="text-xl sm:text-2xl font-bold text-purple-700">{totalSakit}</span>
                    <span className="block text-[11px] font-medium text-purple-800">Sakit</span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-center col-span-2 sm:col-span-1">
                    <span className="text-xl sm:text-2xl font-bold text-rose-700">{totalAlpa}</span>
                    <span className="block text-[11px] font-medium text-rose-800">Tanpa Keterangan</span>
                  </div>
                </div>

              {/* Attendees List (Controlled by show_attendees or showAllAttendees) */}
              {(event.show_attendees || showAllAttendees) ? (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Daftar Nama Jamaah ({filteredAttendees.length})
                    </h5>

                    {/* Gender Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start">
                      <button
                        onClick={() => setActiveGenderFilter('ALL')}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                          activeGenderFilter === 'ALL' ? 'bg-white shadow-xs text-brand-800 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        Semua
                      </button>
                      <button
                        onClick={() => setActiveGenderFilter('L')}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                          activeGenderFilter === 'L' ? 'bg-white shadow-xs text-brand-800 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        Laki-laki
                      </button>
                      <button
                        onClick={() => setActiveGenderFilter('P')}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                          activeGenderFilter === 'P' ? 'bg-white shadow-xs text-brand-800 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        Perempuan
                      </button>
                    </div>
                  </div>

                  {filteredAttendees.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="px-4 py-2.5">No</th>
                            <th className="px-4 py-2.5">Nama Jamaah</th>
                            <th className="px-4 py-2.5 hidden sm:table-cell">Gender</th>
                            <th className="px-4 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredAttendees.map((att, idx) => (
                            <tr key={att.jamaahId} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{idx + 1}</td>
                              <td className="px-4 py-2.5 font-medium text-slate-800">{att.nama}</td>
                              <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell">
                                <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${att.jenis_kelamin === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                                  {att.jenis_kelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">{getStatusBadge(att.status, att.isAutoAlpa, att.isCrossAttended)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic p-3 text-center bg-slate-50 rounded-lg">
                      Belum ada data kehadiran yang tercatat untuk filter ini.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )
        ) : (
            /* Statistics Hidden (FR-VISIBILITY-005) */
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-500 flex items-center gap-3">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Statistik kehadiran untuk agenda ini bersifat internal dan tidak ditampilkan untuk publik.</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={handleShareWA}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200/80 transition-colors"
          >
            <Share2 className="w-4 h-4 text-emerald-700" />
            <span>Bagikan ke WhatsApp</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
