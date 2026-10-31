import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  Users
} from 'lucide-react';
import { useAppStore } from '../store/store';
import { getEligibleJamaahForEvent } from '../utils/attendanceUtils';

// Timezone-safe local date string (YYYY-MM-DD)
const getLocalDateStr = (d) => {
  if (!d) return '';
  if (typeof d === 'string') {
    const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getOtherSessionBadgeText = (otherSession) => {
  if (!otherSession) return '';
  const temaLower = (otherSession.tema || '').toLowerCase();
  if (temaLower.includes('sore')) return `Ikut ngaji di acara sore (${otherSession.tema})`;
  if (temaLower.includes('malam')) return `Ikut ngaji di acara malam (${otherSession.tema})`;
  if (temaLower.includes('pagi') || temaLower.includes('subuh')) return `Ikut ngaji di acara pagi (${otherSession.tema})`;
  return `Ikut ngaji di acara sore (${otherSession.tema})`;
};

const STATUS_OPTIONS = [
  { key: 'HADIR', label: 'Hadir', shortLabel: 'Hadir', bg: 'bg-emerald-600', activeClass: 'bg-emerald-600 text-white shadow-xs' },
  { key: 'DARING', label: 'Daring', shortLabel: 'Daring', bg: 'bg-sky-600', activeClass: 'bg-sky-600 text-white shadow-xs' },
  { key: 'IZIN', label: 'Izin', shortLabel: 'Izin', bg: 'bg-amber-600', activeClass: 'bg-amber-600 text-white shadow-xs' },
  { key: 'SAKIT', label: 'Sakit', shortLabel: 'Sakit', bg: 'bg-purple-600', activeClass: 'bg-purple-600 text-white shadow-xs' },
  { key: 'ALPA', label: 'Tanpa Keterangan', shortLabel: 'Alpa', bg: 'bg-rose-600', activeClass: 'bg-rose-600 text-white shadow-xs' },
];

const MobileAttendanceCard = React.memo(function MobileAttendanceCard({
  person,
  index,
  currentStatus,
  personCats,
  otherSession,
  onStatusChange,
}) {
  return (
    <div className="p-3.5 space-y-2.5 hover:bg-slate-50/50 transition-colors">
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
          {person.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
        </span>
      </div>

      {otherSession && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">{getOtherSessionBadgeText(otherSession)}</span>
        </div>
      )}

      <div>
        <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-xl">
          {STATUS_OPTIONS.map((opt) => {
            const isSelected = currentStatus === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onStatusChange(person.id, opt.key)}
                className={`py-2 px-1 rounded-lg text-xs font-bold text-center transition-all flex items-center justify-center min-h-[42px] ${
                  isSelected
                    ? `${opt.activeClass} shadow-xs ring-1 ring-black/5`
                    : 'text-slate-600 hover:text-slate-900 bg-white/40 active:bg-white'
                }`}
              >
                <span>{opt.shortLabel || opt.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
});

const DesktopAttendanceRow = React.memo(function DesktopAttendanceRow({
  person,
  index,
  currentStatus,
  personCats,
  otherSession,
  onStatusChange,
}) {
  return (
    <tr className="hover:bg-slate-50/80 transition-colors">
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
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {getOtherSessionBadgeText(otherSession)}
          </span>
        )}
      </td>
      <td className="px-5 py-3.5">
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
          person.jenis_kelamin === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
        }`}>
          {person.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-xs text-slate-600 line-clamp-1">
          {personCats.join(', ') || '-'}
        </span>
      </td>
      <td className="px-5 py-3.5 text-center">
        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {STATUS_OPTIONS.map((opt) => {
            const isSelected = currentStatus === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onStatusChange(person.id, opt.key)}
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
      </td>
    </tr>
  );
});

export default function AttendanceForm({ initialEventId: propInitialEventId }) {
  const events = useAppStore((state) => state.events);
  const jamaahList = useAppStore((state) => state.jamaah);
  const categories = useAppStore((state) => state.categories);
  const attendance = useAppStore((state) => state.attendance);
  const submitSingleAttendance = useAppStore((state) => state.submitSingleAttendance);
  const submitAttendance = useAppStore((state) => state.submitAttendance);
  const saveAttendanceDraft = useAppStore((state) => state.saveAttendanceDraft);
  const syncAttendance = useAppStore((state) => state.syncAttendance);
  const currentUser = useAppStore((state) => state.currentUser);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Today's date string YYYY-MM-DD
  const todayStr = getLocalDateStr(new Date());

  // Auto-select event: priority to propInitialEventId, then today's event, then first event
  const initialEventId = useMemo(() => {
    if (propInitialEventId && events.some(e => e.id === Number(propInitialEventId))) {
      return Number(propInitialEventId);
    }
    const todayEvent = events.find(e => e.tanggal && getLocalDateStr(e.tanggal) === todayStr);
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
        const todayEvent = events.find(e => e.tanggal && getLocalDateStr(e.tanggal) === todayStr);
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
  const localAttendanceRef = useRef({});

  // SINKRONISASI AWAL & REAL-TIME POLLING ANTAR-PENGURUS
  useEffect(() => {
    if (!selectedEventId) return;

    // 1. Muat data awal database/draft saat event dipilih
    const drafts = useAppStore.getState().attendanceDrafts || {};
    const existingInDb = attendance[selectedEventId] || attendance[Number(selectedEventId)] || {};
    const existingDraft = drafts[selectedEventId] || drafts[Number(selectedEventId)] || {};

    const merged = {
      ...existingDraft,
      ...existingInDb,
    };
    localAttendanceRef.current = merged;
    setLocalAttendance(merged);

    // 2. Lakukan sinkronisasi langsung ke database cloud
    if (syncAttendance) {
      syncAttendance(selectedEventId);
    }

    // 3. Polling latar belakang khusus halaman absensi (setiap 12 detik, hanya saat tab sedang aktif/dilihat)
    const syncInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (syncAttendance) {
        syncAttendance(selectedEventId);
      }
    }, 12000);

    return () => clearInterval(syncInterval);
  }, [selectedEventId, syncAttendance]);

  // Sinkronisasi otomatis saat data store attendance berubah (misal dari hasil polling background)
  useEffect(() => {
    if (!selectedEventId) return;

    const serverAtt = attendance[selectedEventId] || attendance[Number(selectedEventId)] || {};
    setLocalAttendance(prev => {
      let hasChanges = false;
      for (const [key, val] of Object.entries(serverAtt)) {
        if (prev[key] !== val) {
          hasChanges = true;
          break;
        }
      }
      if (!hasChanges) return prev;

      const updated = { ...prev, ...serverAtt };
      localAttendanceRef.current = updated;
      return updated;
    });
  }, [selectedEventId, attendance]);

  // Pre-index categories map for fast O(1) lookup
  const categoryMap = useMemo(() => {
    const map = {};
    (categories || []).forEach(c => {
      map[c.id] = c.nama_kategori;
    });
    return map;
  }, [categories]);

  // Auto-filter jamaah based on event target categories & target gender
  const targetCategoryIds = useMemo(() => {
    return (currentEvent?.targetCategoryIds || []).map(Number);
  }, [currentEvent]);

  // Jika event menyasar semua kategori (atau tidak ditentukan batasan)
  const isAllCategories = useMemo(() => {
    if (!targetCategoryIds || targetCategoryIds.length === 0) return true;
    if (categories.length > 0 && targetCategoryIds.length >= categories.length) return true;
    return false;
  }, [targetCategoryIds, categories]);

  const targetGender = currentEvent?.target_gender || currentEvent?.targetGender || 'ALL';

  const eligibleJamaah = useMemo(() => {
    if (!currentEvent) return [];
    return getEligibleJamaahForEvent(currentEvent, jamaahList, categories);
  }, [jamaahList, currentEvent, categories]);

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

  // Handle changing status for a single jamaah (useCallback for memoized rows)
  const handleStatusChange = useCallback((jamaahId, newStatus) => {
    const updated = {
      ...localAttendanceRef.current,
      [jamaahId]: newStatus,
    };
    localAttendanceRef.current = updated;
    setLocalAttendance(updated);

    if (selectedEventId) {
      saveAttendanceDraft(selectedEventId, updated);
      if (submitSingleAttendance) {
        submitSingleAttendance(selectedEventId, jamaahId, newStatus);
      }
    }

    setIsDraftSaved(true);
    setTimeout(() => setIsDraftSaved(false), 1200);
  }, [selectedEventId, submitSingleAttendance, saveAttendanceDraft]);

  // Current event date (YYYY-MM-DD)
  const currentEventDateStr = useMemo(() => {
    if (!currentEvent?.tanggal) return null;
    return getLocalDateStr(currentEvent.tanggal);
  }, [currentEvent]);

  // Cek acara lain di hari/tanggal yang sama (Pilihan A: Kompensasi Sesi Sore/Malam)
  const sameDayOtherEvents = useMemo(() => {
    if (!currentEventDateStr || !selectedEventId) return [];
    return events.filter(e => {
      if (e.id === Number(selectedEventId)) return false;
      const d = getLocalDateStr(e.tanggal);
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

  const showNotice = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveAndSyncAll = async () => {
    if (!selectedEventId || isSavingAll) return;
    setIsSavingAll(true);
    try {
      await submitAttendance(selectedEventId, localAttendance, false);
      showNotice('Seluruh data absensi berhasil disinkronkan ke database cloud dan dicatat di audit log.');
    } catch (err) {
      showNotice('Gagal menyinkronkan: ' + (err.message || 'Periksa koneksi'));
    } finally {
      setIsSavingAll(false);
    }
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
      const otherSession = attendedSameDayOtherEvent[j.id];
      const s = localAttendance[j.id] || (otherSession ? otherSession.status : undefined);
      if (s === 'HADIR') hadir++;
      else if (s === 'DARING') daring++;
      else if (s === 'IZIN') izin++;
      else if (s === 'SAKIT') sakit++;
      else if (s === 'ALPA') alpa++;
    });

    const recorded = hadir + daring + izin + sakit + alpa;
    const unrecorded = Math.max(0, totalEligible - recorded);
    return { hadir, daring, izin, sakit, alpa, recorded, unrecorded };
  }, [eligibleJamaah, localAttendance, attendedSameDayOtherEvent, totalEligible]);

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
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Absensi Kehadiran Jamaah</h2>
              </div>
            </div>
          </div>

          {/* Event Picker */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full md:w-auto">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Pilih Acara:</span>
            {events.length > 0 ? (
              <select
                value={selectedEventId || ''}
                onChange={(e) => setSelectedEventId(Number(e.target.value))}
                className="w-full sm:w-auto px-3.5 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-semibold text-slate-800 shadow-xs cursor-pointer max-w-full sm:max-w-xs truncate"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.tanggal === todayStr ? '⭐ [HARI INI] ' : ''}{ev.tema}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 font-medium">
                Belum ada jadwal
              </span>
            )}
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
        {currentEvent && (
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
        )}

        {/* Stats Pill Counters - Mobile Optimized */}
        {currentEvent && (
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
        )}
      </div>

      {(!currentEvent || events.length === 0) ? (
        <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 text-center shadow-subtle space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Belum Ada Jadwal Acara</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Data absensi memerlukan jadwal acara aktif. Silakan buat atau tambahkan jadwal pengajian terlebih dahulu pada menu <strong>Jadwal Acara</strong> sebelum melakukan absensi jamaah.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Control Bar: Gender Tabs, Live Search, Save Button */}
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
                  <span>Laki-laki ({eligibleJamaah.filter(j => j.jenis_kelamin === 'L').length})</span>
                </button>
                <button
                  onClick={() => setActiveGenderTab('P')}
                  className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                    activeGenderTab === 'P'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Perempuan ({eligibleJamaah.filter(j => j.jenis_kelamin === 'P').length})</span>
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

            {/* Quick Toolbar: jamaah count & Save All Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-medium">
                  Menampilkan {displayedJamaah.length} jamaah
                </span>

                {isDraftSaved && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-xl animate-fade-in border border-emerald-300">
                    <Check className="w-3.5 h-3.5" />
                    <span>Tersimpan ke Cloud</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveAndSyncAll}
                disabled={isSavingAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 shadow-xs transition-colors disabled:opacity-50"
                title="Sinkronkan seluruh data absensi ini secara massal ke cloud database"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{isSavingAll ? 'Menyinkronkan...' : 'Sinkronkan & Simpan Semua'}</span>
              </button>
            </div>

            {/* Auto-Notice Banner */}
            {counts.unrecorded > 0 && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs mt-1">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <p>
                  Terdapat <strong>{counts.unrecorded} jamaah</strong> yang belum ditandai. Jamaah yang tidak diabsen otomatis dihitung sebagai <strong>Tanpa Keterangan</strong> pada rekap laporan.
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
                    const otherSession = attendedSameDayOtherEvent[person.id];
                    const currentStatus = localAttendance[person.id] || (otherSession ? otherSession.status : undefined);
                    const personCats = (person.categoryIds || []).map(id => categoryMap[id]).filter(Boolean);

                    return (
                      <MobileAttendanceCard
                        key={person.id}
                        person={person}
                        index={index}
                        currentStatus={currentStatus}
                        personCats={personCats}
                        otherSession={otherSession}
                        onStatusChange={handleStatusChange}
                      />
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
                        const otherSession = attendedSameDayOtherEvent[person.id];
                        const currentStatus = localAttendance[person.id] || (otherSession ? otherSession.status : undefined);
                        const personCats = (person.categoryIds || []).map(id => categoryMap[id]).filter(Boolean);

                        return (
                          <DesktopAttendanceRow
                            key={person.id}
                            person={person}
                            index={index}
                            currentStatus={currentStatus}
                            personCats={personCats}
                            otherSession={otherSession}
                            onStatusChange={handleStatusChange}
                          />
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
        </>
      )}
    </div>
  );
}
