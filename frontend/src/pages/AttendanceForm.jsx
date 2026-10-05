import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Search,
  Users,
  CheckCircle2,
  Save,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Clock,
  Calendar,
  Filter,
  Check
} from 'lucide-react';
import { useAppStore } from '../store/store';

export default function AttendanceForm({ initialEventId: propInitialEventId }) {
  const events = useAppStore((state) => state.events);
  const jamaahList = useAppStore((state) => state.jamaah);
  const categories = useAppStore((state) => state.categories);
  const attendance = useAppStore((state) => state.attendance);
  const submitAttendance = useAppStore((state) => state.submitAttendance);
  const submitSingleAttendance = useAppStore((state) => state.submitSingleAttendance);
  const saveAttendanceDraft = useAppStore((state) => state.saveAttendanceDraft);
  const attendanceDrafts = useAppStore((state) => state.attendanceDrafts);
  const currentUser = useAppStore((state) => state.currentUser);

  // Today's date string YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Auto-select event: priority to propInitialEventId, then today's event, then first event
  const initialEventId = useMemo(() => {
    if (propInitialEventId && events.some(e => e.id === Number(propInitialEventId))) {
      return Number(propInitialEventId);
    }
    const todayEvent = events.find(e => e.tanggal && (e.tanggal.startsWith(todayStr) || new Date(e.tanggal).toISOString().split('T')[0] === todayStr));
    return todayEvent ? todayEvent.id : (events[0]?.id || null);
  }, [events, propInitialEventId, todayStr]);

  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [activeGenderTab, setActiveGenderTab] = useState('ALL'); // 'ALL' | 'L' | 'P'
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);
  const [isDraftSaved, setIsDraftSaved] = useState(false);

  // Sync if propInitialEventId changes from parent navigation
  useEffect(() => {
    if (propInitialEventId && events.some(e => e.id === Number(propInitialEventId))) {
      setSelectedEventId(Number(propInitialEventId));
    }
  }, [propInitialEventId, events]);

  // Auto-sync selected event ID if currently null or not in loaded events
  useEffect(() => {
    if (events.length > 0 && (!selectedEventId || !events.some(e => e.id === Number(selectedEventId)))) {
      if (propInitialEventId && events.some(e => e.id === Number(propInitialEventId))) {
        setSelectedEventId(Number(propInitialEventId));
      } else {
        const todayEvent = events.find(e => e.tanggal && (e.tanggal.startsWith(todayStr) || new Date(e.tanggal).toISOString().split('T')[0] === todayStr));
        setSelectedEventId(todayEvent ? todayEvent.id : events[0].id);
      }
    }
  }, [events, selectedEventId, propInitialEventId, todayStr]);

  // Selected event object
  const currentEvent = useMemo(() => {
    return events.find(e => e.id === Number(selectedEventId));
  }, [events, selectedEventId]);

  // Current attendance record state: { [jamaahId]: 'HADIR' | 'DARING' | 'IZIN' | 'SAKIT' | 'ALPA' }
  const [localAttendance, setLocalAttendance] = useState({});

  // SINKRONISASI REAL-TIME: Database adalah prioritas utama (Single Source of Truth)
  // Ketika Pengurus A mengabsen dari perangkatnya, Pengurus B langsung menerima status terupdate
  useEffect(() => {
    if (!selectedEventId) return;

    const existingInDb = attendance[selectedEventId] || attendance[Number(selectedEventId)] || {};
    const existingDraft = attendanceDrafts[selectedEventId] || attendanceDrafts[Number(selectedEventId)] || {};

    // SINKRONISASI KOLABORATIF: Data database mengesampingkan draft lama agar tidak terjadi input dobel!
    setLocalAttendance({
      ...existingDraft,
      ...existingInDb,
    });
  }, [selectedEventId, attendance, attendanceDrafts]);

  // Auto-filter jamaah based on event target category & target gender (FR-ATTENDANCE-002)
  const targetCategoryIds = currentEvent?.targetCategoryIds || [1];
  const targetCategoryId = targetCategoryIds[0] || 1;
  const isGeneralEvent = targetCategoryId === 1; // 1 = Umum
  const targetGender = currentEvent?.target_gender || currentEvent?.targetGender || 'ALL';

  const eligibleJamaah = useMemo(() => {
    return jamaahList.filter(person => {
      if (!person.isActive) return false;

      // 1. Filter Jenis Kelamin Target Acara
      if (targetGender === 'L' && person.jenis_kelamin !== 'L') return false;
      if (targetGender === 'P' && person.jenis_kelamin !== 'P') return false;

      // 2. Filter Kategori Target Acara
      if (isGeneralEvent) return true;
      return (person.categoryIds || []).includes(targetCategoryId);
    });
  }, [jamaahList, isGeneralEvent, targetCategoryId, targetGender]);

  // Filter by gender tab & live search (FR-ATTENDANCE-003, 004)
  const displayedJamaah = useMemo(() => {
    return eligibleJamaah.filter(person => {
      // Gender tab match
      const matchGender = activeGenderTab === 'ALL' || person.jenis_kelamin === activeGenderTab;

      // Live search match
      const matchSearch = person.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (person.no_whatsapp && person.no_whatsapp.includes(searchQuery));

      return matchGender && matchSearch;
    });
  }, [eligibleJamaah, activeGenderTab, searchQuery]);

  // Handle changing status for a single jamaah (Instan tersimpan ke database untuk pengurus lain)
  const handleStatusChange = async (jamaahId, newStatus) => {
    const updated = {
      ...localAttendance,
      [jamaahId]: newStatus,
    };
    setLocalAttendance(updated);

    // 1. Kirim seketika ke database Supabase agar pengurus B langsung melihat status terupdate (anti double-input)
    if (submitSingleAttendance && selectedEventId) {
      submitSingleAttendance(selectedEventId, jamaahId, newStatus);
    }

    // 2. Simpan draft lokal sebagai cadangan cepat
    saveAttendanceDraft(selectedEventId, updated);
    setIsDraftSaved(true);
    setTimeout(() => setIsDraftSaved(false), 1500);
  };

  // Current event date (YYYY-MM-DD)
  const currentEventDateStr = useMemo(() => {
    if (!currentEvent?.tanggal) return null;
    return new Date(currentEvent.tanggal).toISOString().split('T')[0];
  }, [currentEvent]);

  // Cek acara lain di hari/tanggal yang sama (Pilihan A: Kompensasi Sesi Sore/Malam)
  const sameDayOtherEvents = useMemo(() => {
    if (!currentEventDateStr || !selectedEventId) return [];
    return events.filter(e => {
      if (e.id === Number(selectedEventId)) return false;
      const d = e.tanggal ? new Date(e.tanggal).toISOString().split('T')[0] : null;
      return d === currentEventDateStr;
    });
  }, [events, selectedEventId, currentEventDateStr]);

  // Peta jamaah yang sudah hadir di acara lain pada tanggal yang sama
  const attendedSameDayOtherEvent = useMemo(() => {
    const map = {}; // { [jamaahId]: { eventId, tema, status } }
    sameDayOtherEvents.forEach(otherEvent => {
      const otherAtt = attendance[otherEvent.id] || attendance[Number(otherEvent.id)] || {};
      Object.entries(otherAtt).forEach(([jId, stat]) => {
        if (stat === 'HADIR' || stat === 'DARING') {
          map[Number(jId)] = {
            eventId: otherEvent.id,
            tema: otherEvent.tema,
            status: stat
          };
        }
      });
    });
    return map;
  }, [sameDayOtherEvents, attendance]);

  // Quick action: mark all unselected eligible jamaah as Tanpa Keterangan (atau Hadir jika ikut sesi lain)
  const handleMarkRemainingTanpaKeterangan = () => {
    const updated = { ...localAttendance };
    let countTK = 0;
    let countInval = 0;
    eligibleJamaah.forEach(j => {
      if (!updated[j.id]) {
        if (attendedSameDayOtherEvent[j.id]) {
          updated[j.id] = 'HADIR';
          countInval++;
        } else {
          updated[j.id] = 'ALPA';
          countTK++;
        }
      }
    });
    setLocalAttendance(updated);
    saveAttendanceDraft(selectedEventId, updated);
    showNotice(`${countTK + countInval} jamaah disetel (${countInval} hadir sesi lain, ${countTK} tanpa keterangan).`);
  };

  // Submit attendance to store/database with AUTO CROSS-CHECK & TANPA KETERANGAN
  const handleSaveAttendance = async () => {
    if (!selectedEventId) return;

    const completeRecords = { ...localAttendance };
    let autoTKCount = 0;
    let autoCrossCheckCount = 0;

    eligibleJamaah.forEach(j => {
      if (!completeRecords[j.id]) {
        // Pilihan A: Jika jamaah sudah hadir di sesi lain pada tanggal yang sama, otomatis HADIR
        if (attendedSameDayOtherEvent[j.id]) {
          completeRecords[j.id] = 'HADIR';
          autoCrossCheckCount++;
        } else {
          completeRecords[j.id] = 'ALPA';
          autoTKCount++;
        }
      }
    });

    setLocalAttendance(completeRecords);

    try {
      await submitAttendance(selectedEventId, completeRecords);
      let msg = 'Alhamdulillah! Absensi kehadiran berhasil disimpan secara permanen.';
      if (autoCrossCheckCount > 0 || autoTKCount > 0) {
        msg += ` (${autoCrossCheckCount} jamaah diakui Hadir dari sesi lain, ${autoTKCount} jamaah otomatis Tanpa Keterangan).`;
      }
      showNotice(msg);
    } catch (err) {
      showNotice(`Gagal menyimpan absensi: ${err.message}`);
    }
  };

  const showNotice = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Summary counts
  const totalEligible = eligibleJamaah.length;
  const counts = useMemo(() => {
    let hadir = 0;
    let daring = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;

    eligibleJamaah.forEach(j => {
      const s = localAttendance[j.id];
      if (s === 'HADIR') hadir++;
      else if (s === 'DARING') daring++;
      else if (s === 'IZIN') izin++;
      else if (s === 'SAKIT') sakit++;
      else if (s === 'ALPA') alpa++;
    });

    const recorded = hadir + daring + izin + sakit + alpa;
    const unrecorded = Math.max(0, totalEligible - recorded);
    return { hadir, daring, izin, sakit, alpa, recorded, unrecorded };
  }, [eligibleJamaah, localAttendance, totalEligible]);

  const statusOptions = [
    { key: 'HADIR', label: 'Hadir', bg: 'bg-emerald-600', activeClass: 'bg-emerald-600 text-white shadow-xs' },
    { key: 'DARING', label: 'Daring', bg: 'bg-sky-600', activeClass: 'bg-sky-600 text-white shadow-xs' },
    { key: 'IZIN', label: 'Izin', bg: 'bg-amber-600', activeClass: 'bg-amber-600 text-white shadow-xs' },
    { key: 'SAKIT', label: 'Sakit', bg: 'bg-purple-600', activeClass: 'bg-purple-600 text-white shadow-xs' },
    { key: 'ALPA', label: 'Tanpa Keterangan', bg: 'bg-rose-600', activeClass: 'bg-rose-600 text-white shadow-xs' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 sm:pb-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-floating border border-slate-700 flex items-center gap-3 animate-slide-up text-xs sm:text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Selector & Event Details Card */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-brand-50 text-brand-700 shrink-0">
                <CheckSquare className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">Absensi Kehadiran Jamaah</h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Sinkron Antar-Pengurus Aktif
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Pilih acara kajian dan tandai kehadiran jamaah. Terkoneksi langsung ke database cloud sehingga pengurus lain langsung terupdate tanpa input dobel.</p>
              </div>
            </div>
          </div>

          {/* Event Picker */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full md:w-auto">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Pilih Kajian:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(Number(e.target.value))}
              className="w-full sm:w-auto px-3.5 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-semibold text-slate-800 shadow-xs cursor-pointer max-w-full sm:max-w-xs truncate"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.tanggal === todayStr ? '⭐ [HARI INI] ' : ''}{ev.tema}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Event Context Banner */}
        {currentEvent && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900">{currentEvent.tema}</span>
                {currentEvent.tanggal === todayStr && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                    Hari Ini
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs">
                {new Date(currentEvent.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • {currentEvent.waktu}{currentEvent.pembicara && currentEvent.pembicara.trim() ? ` • ${currentEvent.pembicara}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="text-slate-500">Target Sasaran:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {(currentEvent.targetCategoryIds || []).map(cid => (
                  <span key={cid} className="px-2.5 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-800">
                    {categories.find(c => c.id === cid)?.nama_kategori || 'Umum'}
                  </span>
                ))}
                {targetGender === 'L' && (
                  <span className="px-2.5 py-0.5 rounded bg-blue-100 border border-blue-200 font-bold text-blue-800 text-[11px]">
                    🧔 Khusus Pria
                  </span>
                )}
                {targetGender === 'P' && (
                  <span className="px-2.5 py-0.5 rounded bg-pink-100 border border-pink-200 font-bold text-pink-800 text-[11px]">
                    🧕 Khusus Wanita
                  </span>
                )}
                {targetGender === 'ALL' && (
                  <span className="px-2.5 py-0.5 rounded bg-slate-200/80 font-medium text-slate-700 text-[11px]">
                    👥 Pria & Wanita
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Pill Counters - Desktop */}
        <div className="hidden sm:grid sm:grid-cols-7 gap-2 pt-1 text-center">
          <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
            <span className="text-lg font-bold text-slate-800">{counts.recorded}/{totalEligible}</span>
            <span className="block text-[10px] font-semibold text-slate-500 uppercase">Tercatat</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
            <span className="text-lg font-bold text-emerald-700">{counts.hadir}</span>
            <span className="block text-[10px] font-semibold text-emerald-800 uppercase">Hadir</span>
          </div>
          <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100">
            <span className="text-lg font-bold text-sky-700">{counts.daring}</span>
            <span className="block text-[10px] font-semibold text-sky-800 uppercase">Daring</span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
            <span className="text-lg font-bold text-amber-700">{counts.izin}</span>
            <span className="block text-[10px] font-semibold text-amber-800 uppercase">Izin</span>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100">
            <span className="text-lg font-bold text-purple-700">{counts.sakit}</span>
            <span className="block text-[10px] font-semibold text-purple-800 uppercase">Sakit</span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
            <span className="text-lg font-bold text-rose-700">{counts.alpa}</span>
            <span className="block text-[10px] font-semibold text-rose-800 uppercase">Tanpa Keterangan</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-dashed border-slate-300">
            <span className="text-lg font-bold text-slate-600">{counts.unrecorded}</span>
            <span className="block text-[10px] font-semibold text-slate-500 uppercase">Belum Diisi</span>
          </div>
        </div>

        {/* Stats Pill Counters - Mobile Optimized */}
        <div className="sm:hidden space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
              <span className="text-base font-bold text-slate-800">{counts.recorded}/{totalEligible}</span>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">Tercatat</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-dashed border-slate-300">
              <span className="text-base font-bold text-slate-600">{counts.unrecorded}</span>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">Belum Diisi</span>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1.5 text-center">
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
              <span className="text-sm font-bold text-emerald-700 block">{counts.hadir}</span>
              <span className="text-[9px] font-semibold text-emerald-800 uppercase block truncate">Hadir</span>
            </div>
            <div className="p-2 rounded-lg bg-sky-50 border border-sky-100">
              <span className="text-sm font-bold text-sky-700 block">{counts.daring}</span>
              <span className="text-[9px] font-semibold text-sky-800 uppercase block truncate">Daring</span>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
              <span className="text-sm font-bold text-amber-700 block">{counts.izin}</span>
              <span className="text-[9px] font-semibold text-amber-800 uppercase block truncate">Izin</span>
            </div>
            <div className="p-2 rounded-lg bg-purple-50 border border-purple-100">
              <span className="text-sm font-bold text-purple-700 block">{counts.sakit}</span>
              <span className="text-[9px] font-semibold text-purple-800 uppercase block truncate">Sakit</span>
            </div>
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-100">
              <span className="text-sm font-bold text-rose-700 block">{counts.alpa}</span>
              <span className="text-[9px] font-semibold text-rose-800 uppercase block truncate">Alpa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Gender Tabs, Live Search, Bulk Action, Draft indicator */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Gender Filter Tabs (FR-ATTENDANCE-003) */}
          <div className="grid grid-cols-3 w-full sm:w-auto sm:flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl">
            <button
              onClick={() => setActiveGenderTab('ALL')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                activeGenderTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({eligibleJamaah.length})
            </button>
            <button
              onClick={() => setActiveGenderTab('L')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                activeGenderTab === 'L'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="sm:hidden">Ikhwan ({eligibleJamaah.filter(j => j.jenis_kelamin === 'L').length})</span>
              <span className="hidden sm:inline">Laki-laki (Ikhwan) ({eligibleJamaah.filter(j => j.jenis_kelamin === 'L').length})</span>
            </button>
            <button
              onClick={() => setActiveGenderTab('P')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                activeGenderTab === 'P'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="sm:hidden">Akhwat ({eligibleJamaah.filter(j => j.jenis_kelamin === 'P').length})</span>
              <span className="hidden sm:inline">Perempuan (Akhwat) ({eligibleJamaah.filter(j => j.jenis_kelamin === 'P').length})</span>
            </button>
          </div>

          {/* Search Bar & Auto-save Status */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {isDraftSaved && (
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 shrink-0 animate-pulse">
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Draft Tersimpan</span>
                <span className="sm:hidden">Tersimpan</span>
              </span>
            )}

            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama jamaah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Quick Toolbar: Set Sisa Tanpa Keterangan & Save Button (Mark All Hadir Removed) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {counts.unrecorded > 0 && (
              <button
                type="button"
                onClick={handleMarkRemainingTanpaKeterangan}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200 transition-colors"
                title="Setel semua jamaah sasaran yang belum dipilih statusnya"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Setel Sisa ({counts.unrecorded}) Otomatis</span>
              </button>
            )}

            <span className="text-xs text-slate-400">
              Menampilkan {displayedJamaah.length} jamaah
            </span>
          </div>

          <button
            type="button"
            onClick={handleSaveAttendance}
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-brand-700/20 transition-all hover:scale-[1.01]"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Absensi ke Database</span>
          </button>
        </div>

        {/* Auto-Notice Banner with Cross-Check note */}
        {counts.unrecorded > 0 && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs mt-1">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <p>
              <strong>Aturan Otomatisasi:</strong> Terdapat <strong>{counts.unrecorded} jamaah</strong> yang belum diisi statusnya. Saat disimpan, jamaah yang telah mengikuti kajian lain pada hari yang sama otomatis diakui <strong>Hadir</strong>, sedangkan selebihnya dicatat sebagai <strong>Tanpa Keterangan</strong>.
            </p>
          </div>
        )}
      </div>

      {/* Attendance List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        {displayedJamaah.length > 0 ? (
          <>
            {/* Mobile Card List View (sm:hidden) */}
            <div className="sm:hidden divide-y divide-slate-100">
              {displayedJamaah.map((person, index) => {
                const currentStatus = localAttendance[person.id];
                const personCats = (person.categoryIds || []).map(id => categories.find(c => c.id === id)?.nama_kategori).filter(Boolean);
                const otherSession = attendedSameDayOtherEvent[person.id];

                return (
                  <div key={person.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                    {/* Person Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-500 font-mono text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm leading-snug break-words">{person.nama}</h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {person.no_whatsapp && (
                              <span className="text-[11px] text-slate-400 font-mono">{person.no_whatsapp}</span>
                            )}
                            {personCats.length > 0 && (
                              <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {personCats.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        person.jenis_kelamin === 'L' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-pink-50 text-pink-700 border border-pink-200'
                      }`}>
                        {person.jenis_kelamin === 'L' ? 'Ikhwan' : 'Akhwat'}
                      </span>
                    </div>

                    {/* Notice if attended another session today */}
                    {otherSession && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">Hadir di {otherSession.tema}</span>
                      </div>
                    )}

                    {/* Touch-Friendly 5 Status Selector Buttons */}
                    <div>
                      <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-xl">
                        {statusOptions.map((opt) => {
                          const isSelected = currentStatus === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => handleStatusChange(person.id, opt.key)}
                              className={`py-2 px-1 rounded-lg text-xs font-bold text-center transition-all flex items-center justify-center min-h-[38px] ${
                                isSelected
                                  ? `${opt.activeClass} shadow-xs ring-1 ring-black/5`
                                  : 'text-slate-600 hover:text-slate-900 bg-white/40 active:bg-white'
                              }`}
                            >
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {!currentStatus && (
                        <div className="mt-1 text-right text-[10px]">
                          {otherSession ? (
                            <span className="text-emerald-700 font-semibold">
                              Otomatis Hadir (Sesi Lain)
                            </span>
                          ) : (
                            <span className="text-rose-600 font-medium">
                              Belum dipilih (Default Alpa saat simpan)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 w-12 text-center">No</th>
                    <th className="px-5 py-3">Nama Jamaah</th>
                    <th className="px-5 py-3">Gender</th>
                    <th className="px-5 py-3">Kategori</th>
                    <th className="px-5 py-3 text-center">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedJamaah.map((person, index) => {
                    const currentStatus = localAttendance[person.id];
                    const personCats = (person.categoryIds || []).map(id => categories.find(c => c.id === id)?.nama_kategori).filter(Boolean);
                    const otherSession = attendedSameDayOtherEvent[person.id];

                    return (
                      <tr key={person.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 text-center text-slate-400 font-mono text-xs">
                          {index + 1}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-slate-900 block text-sm">{person.nama}</span>
                          {person.no_whatsapp && (
                            <span className="text-[11px] text-slate-400 font-mono">{person.no_whatsapp}</span>
                          )}
                          {otherSession && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Sudah Hadir di {otherSession.tema}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            person.jenis_kelamin === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                          }`}>
                            {person.jenis_kelamin === 'L' ? 'Ikhwan' : 'Akhwat'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-slate-600 line-clamp-1">
                            {personCats.join(', ') || '-'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!currentStatus && (
                              otherSession ? (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 whitespace-nowrap">
                                  Otomatis Hadir (Sesi Lain)
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 whitespace-nowrap">
                                  Tanpa Keterangan
                                </span>
                              )
                            )}
                            {/* Interactive Status Selector Buttons */}
                            <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                              {statusOptions.map((opt) => {
                                const isSelected = currentStatus === opt.key;
                                return (
                                  <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => handleStatusChange(person.id, opt.key)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                      isSelected
                                        ? opt.activeClass
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
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
            <h4 className="font-semibold text-slate-700">Tidak ada jamaah ditemukan</h4>
            <p className="text-xs text-slate-400">
              Coba sesuaikan kata kunci pencarian atau tab gender yang dipilih.
            </p>
          </div>
        )}
      </div>

      {/* Fixed bottom action bar on mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-lg flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-800">
            {counts.recorded}/{totalEligible} Tercatat
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            {counts.unrecorded > 0 ? `${counts.unrecorded} belum diisi` : 'Semua telah diisi'}
          </div>
        </div>
        <button
          type="button"
          onClick={handleSaveAttendance}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-700 active:bg-brand-800 text-white font-bold text-xs shadow-md shadow-brand-700/20 shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Absensi</span>
        </button>
      </div>
    </div>
  );
}
