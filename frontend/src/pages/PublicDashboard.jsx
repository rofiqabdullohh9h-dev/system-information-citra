import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar, Search, Filter, BarChart3, Users, Clock,
  MapPin, BookOpen, ChevronRight, CheckCircle2, AlertCircle,
  Megaphone, Pin, Newspaper, ExternalLink, Share2, Tag, X,
  Check, FileText, ArrowUpDown, RotateCcw, TrendingUp, Percent
} from 'lucide-react';
import { useAppStore } from '../store/store';
import EventCard from '../components/display/EventCard';
import PublicEventDetail from './PublicEventDetail';
import { generateBulletinShareText } from '../utils/shareUtils';
import {
  getLocalDateStr,
  getPeriodRange,
  isDateInPeriod,
  INDONESIAN_MONTHS,
  formatDateWIB
} from '../utils/dateUtils';

export default function PublicDashboard({ activeTab, setActiveTab }) {
  const events = useAppStore((state) => state.events);
  const categories = useAppStore((state) => state.categories);
  const attendance = useAppStore((state) => state.attendance);
  const jamaahList = useAppStore((state) => state.jamaah);
  const bulletins = useAppStore((state) => state.bulletins);
  const fetchData = useAppStore((state) => state.fetchData);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedEventForModal, setSelectedEventForModal] = useState(null);

  // Bulletin state
  const [selectedBulletinForModal, setSelectedBulletinForModal] = useState(null);
  const [bulletinFilter, setBulletinFilter] = useState('ALL');
  const [bulletinSearch, setBulletinSearch] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Filter & Sort state untuk Tab Statistik Kehadiran
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [statsPeriodType, setStatsPeriodType] = useState('ALL'); // 'ALL' | 'THIS_WEEK' | 'THIS_MONTH' | 'SPECIFIC_MONTH' | 'CUSTOM'
  const [statsMonth, setStatsMonth] = useState(currentMonth);
  const [statsYear, setStatsYear] = useState(currentYear);
  const [statsStartDate, setStatsStartDate] = useState('');
  const [statsEndDate, setStatsEndDate] = useState('');
  const [statsSortOrder, setStatsSortOrder] = useState('DATE_DESC'); // 'DATE_DESC' | 'DATE_ASC' | 'RATE_DESC' | 'RATE_ASC' | 'TITLE_ASC'

  // Filter only published events for public portal
  const publishedEvents = useMemo(() => {
    return events.filter(e => e.is_published !== false);
  }, [events]);

  // Info label rentang periode aktif di tab statistik
  const statsPeriodInfo = useMemo(() => {
    return getPeriodRange(statsPeriodType, {
      startDate: statsStartDate,
      endDate: statsEndDate,
      month: statsMonth,
      year: statsYear,
    });
  }, [statsPeriodType, statsStartDate, statsEndDate, statsMonth, statsYear]);

  // Acara publik yang masuk dalam filter periode statistik
  const statsPeriodEvents = useMemo(() => {
    return publishedEvents.filter(e => {
      return isDateInPeriod(e.tanggal, statsPeriodType, {
        startDate: statsStartDate,
        endDate: statsEndDate,
        month: statsMonth,
        year: statsYear,
      });
    });
  }, [publishedEvents, statsPeriodType, statsStartDate, statsEndDate, statsMonth, statsYear]);

  // Filtered events based on search & category
  const filteredEvents = useMemo(() => {
    return publishedEvents.filter(event => {
      const matchSearch = (
        !searchQuery ||
        (event.tema && event.tema.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (event.pembicara && event.pembicara.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (event.deskripsi && event.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      const matchCategory = selectedCategory === 'ALL' || (
        (event.targetCategoryIds && event.targetCategoryIds.includes(Number(selectedCategory))) ||
        (event.targetCategories && event.targetCategories.some(c => c.id === Number(selectedCategory)))
      );

      return matchSearch && matchCategory;
    });
  }, [publishedEvents, searchQuery, selectedCategory]);

  // Find the next upcoming event for Hero spotlight
  const nextEvent = publishedEvents[0];

  // Category statistics calculation (dihitung dinamis sesuai periode yang dipilih, diawali kartu Keseluruhan)
  const categoryStats = useMemo(() => {
    const totalActiveMembers = jamaahList.filter(j => j.isActive).length;

    // Hitung akumulasi kehadiran seluruh kategori pada acara dalam rentang periode terpilih
    let allHadirCount = 0;
    let allTotalAssigned = 0;

    statsPeriodEvents.forEach(ev => {
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

    if (activeTab !== 'statistik') {
      return [
        overallCard,
        ...categories.map(cat => ({
          ...cat,
          totalMembers: cat.memberCount || 0,
          hadirCount: 0,
          totalAssigned: 0,
          rate: 0,
          isOverall: false
        }))
      ];
    }

    const catList = categories.map(cat => {
      // Find members of this category
      const members = jamaahList.filter(j => j.categoryIds && j.categoryIds.includes(cat.id));
      const memberIds = new Set(members.map(m => m.id));

      // Hitung kehadiran pada acara-acara dalam rentang periode terpilih
      let hadirCount = 0;
      let totalAssigned = 0;

      statsPeriodEvents.forEach(ev => {
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
        totalMembers: members.length || cat.memberCount || 0,
        hadirCount,
        totalAssigned,
        rate,
        isOverall: false
      };
    });

    return [overallCard, ...catList];
  }, [categories, jamaahList, attendance, statsPeriodEvents, activeTab]);

  // Daftar acara untuk tabel rekapitulasi (disortir dan difilter periode)
  const eventRecapList = useMemo(() => {
    const list = statsPeriodEvents
      .filter(e => e.show_statistics !== false)
      .map(event => {
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
      if (statsSortOrder === 'DATE_DESC') {
        const da = a.tanggal ? new Date(a.tanggal).getTime() : 0;
        const db = b.tanggal ? new Date(b.tanggal).getTime() : 0;
        return db - da;
      }
      if (statsSortOrder === 'DATE_ASC') {
        const da = a.tanggal ? new Date(a.tanggal).getTime() : 0;
        const db = b.tanggal ? new Date(b.tanggal).getTime() : 0;
        return da - db;
      }
      if (statsSortOrder === 'RATE_DESC') {
        return b.rate - a.rate;
      }
      if (statsSortOrder === 'RATE_ASC') {
        return a.rate - b.rate;
      }
      if (statsSortOrder === 'TITLE_ASC') {
        return (a.tema || '').localeCompare(b.tema || '');
      }
      return 0;
    });
  }, [statsPeriodEvents, attendance, statsSortOrder]);

  // Ringkasan akumulatif periode statistik
  const statsSummary = useMemo(() => {
    let totalHadirSemua = 0;
    let totalKesempatan = 0;

    eventRecapList.forEach(e => {
      totalHadirSemua += e.totalHadir;
      totalKesempatan += e.totalTercatat;
    });

    const avgRate = totalKesempatan > 0 ? Math.round((totalHadirSemua / totalKesempatan) * 100) : 0;

    return {
      totalEvents: eventRecapList.length,
      totalHadirSemua,
      avgRate,
    };
  }, [eventRecapList]);

  // Pinned bulletins for announcement banner
  const pinnedAnnouncements = useMemo(() => {
    return (bulletins || []).filter(b => b.is_pinned);
  }, [bulletins]);

  // Filtered bulletins for the Warta & Pengumuman tab
  const filteredBulletins = useMemo(() => {
    return (bulletins || []).filter(b => {
      const matchType = bulletinFilter === 'ALL' || b.tipe === bulletinFilter;
      const matchSearch =
        !bulletinSearch ||
        (b.judul && b.judul.toLowerCase().includes(bulletinSearch.toLowerCase())) ||
        (b.konten && b.konten.toLowerCase().includes(bulletinSearch.toLowerCase())) ||
        (b.penulis && b.penulis.toLowerCase().includes(bulletinSearch.toLowerCase())) ||
        (b.kategori && b.kategori.toLowerCase().includes(bulletinSearch.toLowerCase()));
      return matchType && matchSearch;
    });
  }, [bulletins, bulletinFilter, bulletinSearch]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-900 via-brand-800 to-slate-900 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.2),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(5,150,105,0.15),transparent_50%)] text-white pt-10 pb-16 sm:pt-14 sm:pb-24">

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Hero Text */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <h1 className="text-xl sm:text-2xl lg:text-[28px] font-bold text-white leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Dibalik manusia yang mempersulit langkah kita, ada Allah yang sedang mempermudah jalan kita. Mungkin hari ini terasa rumit dan berat, tapi tenang aja Allah tau cara membuat semuanya menjadi tepat.
              </h1>

              {/* Quick action buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <button
                  onClick={() => {
                    setActiveTab('jadwal');
                    const el = document.getElementById('jadwal-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md shadow-emerald-500/25 transition-all hover:scale-[1.02] flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Jadwal Terdekat</span>
                </button>
                <button
                  onClick={() => setActiveTab('warta')}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-sm transition-all border border-white/15 flex items-center gap-2"
                >
                  <Megaphone className="w-4 h-4 text-emerald-300" />
                  <span>Berita & Pengumuman</span>
                </button>
                <button
                  onClick={() => setActiveTab('statistik')}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white font-medium text-sm backdrop-blur-sm transition-all border border-white/10 flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4 text-emerald-300" />
                  <span>Statistik</span>
                </button>
              </div>
            </div>

            {/* Right Hero Spotlight Card: Agenda Terdekat */}
            {nextEvent && (
              <div className="lg:col-span-5">
                <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl text-white">
                  <div className="flex items-center justify-end gap-2 mb-4">
                    <span className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {nextEvent.waktu}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white line-clamp-2 leading-snug">
                    {nextEvent.tema}
                  </h3>

                  <div className="mt-4 space-y-2 text-xs sm:text-sm text-slate-200">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-300 shrink-0" />
                      <span className="font-semibold text-white">
                        {new Date(nextEvent.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    {nextEvent.pembicara && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-300 shrink-0" />
                        <span>{nextEvent.pembicara}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-rose-300 shrink-0" />
                      <span>{nextEvent.lokasi || 'Masjid Jami At-Taqwa'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedEventForModal(nextEvent)}
                    className="mt-6 w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-brand-900 font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Buka Rincian & Absensi</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pinned Announcement Bar (Maklumat / Edaran Mendesak) */}
      {pinnedAnnouncements.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-emerald-500/15 border-y border-amber-300/50 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            {pinnedAnnouncements.slice(0, 1).map((ann) => (
              <div key={ann.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-bold text-[11px] uppercase tracking-wider shrink-0 shadow-xs">
                    <Pin className="w-3 h-3 fill-slate-950" />
                    PENGUMUMAN PENTING
                  </span>
                  <span className="font-bold text-slate-900 truncate">{ann.judul}:</span>
                  <span className="text-slate-600 truncate hidden md:inline">{ann.konten}</span>
                </div>
                <button
                  onClick={() => setSelectedBulletinForModal(ann)}
                  className="self-start sm:self-auto shrink-0 font-bold text-brand-700 hover:text-brand-900 underline flex items-center gap-1 text-xs"
                >
                  Baca Rincian <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Sections according to active tab */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" id="jadwal-section">
        {activeTab === 'jadwal' && (
          <div className="space-y-8 animate-fade-in">
            {/* Section Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                  <Calendar className="w-6 h-6 text-brand-700" />
                  Agenda & Jadwal Pengajian
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Berikut daftar pengajian mendatang dan yang telah berlangsung.
                </p>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari tema / pemateri..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Dropdown */}
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full sm:w-auto px-3.5 py-2 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium text-slate-700 shadow-xs cursor-pointer"
                  >
                    <option value="ALL">Semua Kategori</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nama_kategori}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Event Grid */}
            {filteredEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onOpenDetail={(ev) => setSelectedEventForModal(ev)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8 space-y-3">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-semibold text-slate-700">Tidak ada jadwal ditemukan</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                  Coba ubah kata kunci pencarian atau pilih kategori yang berbeda.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                  }}
                  className="mt-2 text-xs font-semibold text-brand-700 hover:underline"
                >
                  Reset Filter
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab: Warta & Pengumuman */}
        {activeTab === 'warta' && (
          <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                  <Megaphone className="w-6 h-6 text-brand-700" />
                  Berita & Pengumuman
                </h2>
              </div>

              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari pengumuman / berita..."
                    value={bulletinSearch}
                    onChange={(e) => setBulletinSearch(e.target.value)}
                    className="w-full sm:w-64 pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-xs"
                  />
                  {bulletinSearch && (
                    <button
                      onClick={() => setBulletinSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setBulletinFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${bulletinFilter === 'ALL'
                        ? 'bg-white text-brand-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Semua ({bulletins.length})
                  </button>
                  <button
                    onClick={() => setBulletinFilter('PENGUMUMAN')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${bulletinFilter === 'PENGUMUMAN'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    📢 Pengumuman
                  </button>
                  <button
                    onClick={() => setBulletinFilter('BERITA')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${bulletinFilter === 'BERITA'
                        ? 'bg-brand-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    📰 Berita
                  </button>
                </div>
              </div>
            </div>

            {/* Bulletin Grid */}
            {filteredBulletins.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBulletins.map((b) => {
                  const isPengumuman = b.tipe === 'PENGUMUMAN';
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBulletinForModal(b)}
                      className={`group cursor-pointer bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-card ${isPengumuman
                          ? 'border-amber-200/80 shadow-subtle hover:border-amber-300'
                          : 'border-slate-200/90 shadow-subtle hover:border-brand-300'
                        }`}
                    >
                      {/* Image Thumbnail for Berita / Pengumuman */}
                      {b.gambar_url ? (
                        <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                          <img
                            src={b.gambar_url}
                            alt={b.judul}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          {b.is_pinned && (
                            <div className="absolute top-3 left-3 flex items-center gap-1.5">
                              <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950 flex items-center gap-1 shadow-xs">
                                <Pin className="w-3 h-3 fill-slate-950" />
                                Disematkan
                              </span>
                            </div>
                          )}
                        </div>
                      ) : b.is_pinned ? (
                        <div className="p-3 pb-0 flex items-center justify-end">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950 flex items-center gap-1">
                            <Pin className="w-3 h-3 fill-slate-950" />
                            Disematkan
                          </span>
                        </div>
                      ) : null}

                      {/* Card Body */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>
                              {new Date(b.tanggal_publikasi || b.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            <span>•</span>
                            <span className="line-clamp-1">{b.penulis || 'Pengurus'}</span>
                          </div>

                          <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-700 transition-colors line-clamp-2 leading-snug">
                            {b.judul}
                          </h3>

                          <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed">
                            {b.konten}
                          </p>
                        </div>

                        {/* Card Footer */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          {b.lampiran_link ? (
                            <span className="text-brand-600 font-medium flex items-center gap-1">
                              <ExternalLink className="w-3.5 h-3.5" />
                              Ada Lampiran
                            </span>
                          ) : (
                            <span className="text-slate-400">Rincian Lengkap</span>
                          )}

                          <span className="font-semibold text-brand-700 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                            Baca <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8 space-y-3">
                <Megaphone className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-semibold text-slate-700">Belum ada warta atau berita</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                  {bulletinSearch
                    ? 'Tidak ada pengumuman atau berita yang sesuai dengan kata kunci pencarian.'
                    : 'Pengurus belum mempublikasikan warta pengumuman atau dokumentasi.'}
                </p>
                {bulletinSearch && (
                  <button
                    onClick={() => setBulletinSearch('')}
                    className="mt-2 text-xs font-semibold text-brand-700 hover:underline"
                  >
                    Reset Pencarian
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Statistik Kehadiran */}
        {activeTab === 'statistik' && (
          <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                  <BarChart3 className="w-6 h-6 text-brand-700" />
                  Statistik & Rekapitulasi Kehadiran
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Pantau persentase kehadiran per bulan, per minggu, atau rentang tanggal tertentu secara transparan.
                </p>
              </div>

              {/* Sortir Dropdown */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-500 font-medium">Urutkan:</span>
                  <select
                    value={statsSortOrder}
                    onChange={(e) => setStatsSortOrder(e.target.value)}
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
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">Pilih Periode Waktu</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Periode:</span>
                  <span className="px-2.5 py-1 rounded-full font-bold bg-brand-50 text-brand-700 border border-brand-200/60">
                    {statsPeriodInfo.label}
                  </span>
                  {statsPeriodType !== 'ALL' && (
                    <button
                      onClick={() => {
                        setStatsPeriodType('ALL');
                        setStatsStartDate('');
                        setStatsEndDate('');
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
                  onClick={() => setStatsPeriodType('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statsPeriodType === 'ALL'
                      ? 'bg-brand-700 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  Semua Waktu
                </button>
                <button
                  onClick={() => setStatsPeriodType('THIS_WEEK')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statsPeriodType === 'THIS_WEEK'
                      ? 'bg-brand-700 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  Minggu Ini
                </button>
                <button
                  onClick={() => setStatsPeriodType('THIS_MONTH')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statsPeriodType === 'THIS_MONTH'
                      ? 'bg-brand-700 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  Bulan Ini
                </button>
                <button
                  onClick={() => setStatsPeriodType('SPECIFIC_MONTH')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statsPeriodType === 'SPECIFIC_MONTH'
                      ? 'bg-brand-700 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  Pilih Bulan
                </button>
                <button
                  onClick={() => setStatsPeriodType('CUSTOM')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statsPeriodType === 'CUSTOM'
                      ? 'bg-brand-700 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  Rentang Tanggal
                </button>
              </div>

              {/* Input Spesifik Bulan */}
              {statsPeriodType === 'SPECIFIC_MONTH' && (
                <div className="pt-1 flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2 text-xs">
                    <label className="font-semibold text-slate-600">Bulan:</label>
                    <select
                      value={statsMonth}
                      onChange={(e) => setStatsMonth(Number(e.target.value))}
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
                      value={statsYear}
                      onChange={(e) => setStatsYear(Number(e.target.value))}
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
              {statsPeriodType === 'CUSTOM' && (
                <div className="pt-1 flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                  <div className="flex items-center gap-2">
                    <label className="font-semibold text-slate-600">Mulai:</label>
                    <input
                      type="date"
                      value={statsStartDate}
                      onChange={(e) => setStatsStartDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="font-semibold text-slate-600">Sampai:</label>
                    <input
                      type="date"
                      value={statsEndDate}
                      onChange={(e) => setStatsEndDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  {(statsStartDate || statsEndDate) && (
                    <button
                      onClick={() => { setStatsStartDate(''); setStatsEndDate(''); }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline"
                    >
                      Bersihkan Tanggal
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Ringkasan Banner Periode */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-subtle">
                <span className="text-2xl font-extrabold text-slate-900">{statsSummary.totalEvents}</span>
                <span className="block text-[11px] font-semibold text-slate-500 uppercase mt-1">Agenda Terdata</span>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                <span className="text-2xl font-extrabold text-emerald-700">{statsSummary.avgRate}%</span>
                <span className="block text-[11px] font-semibold text-emerald-800 uppercase mt-1">Rata-rata Kehadiran</span>
              </div>
              <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 text-center">
                <span className="text-2xl font-extrabold text-sky-700">{statsSummary.totalHadirSemua}</span>
                <span className="block text-[11px] font-semibold text-sky-800 uppercase mt-1">Total Jamaah Hadir</span>
              </div>
            </div>

            {/* Category Cards Overview */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 text-base">Tingkat Partisipasi per Kategori Jamaah</h3>
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
            </div>

            {/* Attendance breakdown per event table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Rekapitulasi Kehadiran per Acara</h3>
                  <p className="text-xs text-slate-500">
                    Menampilkan persentase dan rincian kehadiran kegiatan pada {statsPeriodInfo.label}.
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
                          <span className="block text-[11px] text-emerald-700 font-medium">Hadir Fisik</span>
                          <span className="text-sm font-bold text-emerald-800">{event.hadir}</span>
                        </div>
                        <div className="bg-sky-50 border border-sky-100/80 rounded-xl p-2">
                          <span className="block text-[11px] text-sky-700 font-medium">Daring</span>
                          <span className="text-sm font-bold text-sky-800">{event.daring}</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-100/80 rounded-xl p-2">
                          <span className="block text-[11px] text-amber-700 font-medium">Izin / Sakit</span>
                          <span className="text-sm font-bold text-amber-800">{event.izin}</span>
                        </div>
                      </div>

                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => setSelectedEventForModal(event)}
                          className="text-xs font-semibold text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 px-3.5 py-1.5 rounded-lg transition-colors"
                        >
                          Lihat Rincian Jamaah
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-400 text-xs px-4 space-y-2">
                    <p>Tidak ada kegiatan yang sesuai dengan periode terpilih.</p>
                    {statsPeriodType !== 'ALL' && (
                      <button
                        onClick={() => {
                          setStatsPeriodType('ALL');
                          setStatsStartDate('');
                          setStatsEndDate('');
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
                          Tidak ada kegiatan pengajian pada periode {statsPeriodInfo.label}.
                          {statsPeriodType !== 'ALL' && (
                            <div className="mt-2">
                              <button
                                onClick={() => {
                                  setStatsPeriodType('ALL');
                                  setStatsStartDate('');
                                  setStatsEndDate('');
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
        )}
      </main>

      {/* Modal Detail Event */}
      {selectedEventForModal && (
        <PublicEventDetail
          event={selectedEventForModal}
          onClose={() => setSelectedEventForModal(null)}
        />
      )}

      {/* Modal Detail Bulletin (Pengumuman / Berita Reader) */}
      {selectedBulletinForModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 my-8">
            {/* Modal Image Header (if bulletin has photo) */}
            {selectedBulletinForModal.gambar_url && (
              <div className="relative aspect-video w-full bg-slate-900">
                <img
                  src={selectedBulletinForModal.gambar_url}
                  alt={selectedBulletinForModal.judul}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedBulletinForModal(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="p-6 sm:p-8 space-y-6">
              {/* Header Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    {selectedBulletinForModal.is_pinned && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-950 inline-flex items-center gap-1">
                        <Pin className="w-3 h-3 fill-slate-950" />
                        Disematkan Pengurus
                      </span>
                    )}
                  </div>

                  {!selectedBulletinForModal.gambar_url && (
                    <button
                      onClick={() => setSelectedBulletinForModal(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                  {selectedBulletinForModal.judul}
                </h2>

                <div className="flex items-center gap-3 text-xs text-slate-500 border-b border-slate-100 pb-3">
                  <span className="font-semibold text-slate-700">
                    Oleh: {selectedBulletinForModal.penulis || 'Pengurus'}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(selectedBulletinForModal.tanggal_publikasi || selectedBulletinForModal.created_at).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Main Content */}
              <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line space-y-4">
                {selectedBulletinForModal.konten}
              </div>

              {/* External Attachment Link */}
              {selectedBulletinForModal.lampiran_link && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-800">Lampiran / Tautan Terkait</p>
                      <p className="text-xs text-brand-600 truncate">{selectedBulletinForModal.lampiran_link}</p>
                    </div>
                  </div>
                  <a
                    href={selectedBulletinForModal.lampiran_link}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 px-3.5 py-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <span>Buka Tautan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    const shareText = generateBulletinShareText(selectedBulletinForModal);
                    navigator.clipboard.writeText(shareText);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">Teks Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-slate-500" />
                      <span>Salin / Bagikan</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setSelectedBulletinForModal(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
