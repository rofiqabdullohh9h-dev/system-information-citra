import React, { useMemo } from 'react';
import { Calendar, Clock, MapPin, User, Users, Share2, Eye, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../store/store';
import { generateEventShareText } from '../../utils/shareUtils';
import { calculateEventAttendanceStats } from '../../utils/attendanceUtils';

function EventCard({ event, onOpenDetail }) {
  const categories = useAppStore((state) => state.categories);
  const attendance = useAppStore((state) => state.attendance);
  const jamaahList = useAppStore((state) => state.jamaah);
  const events = useAppStore((state) => state.events);

  // Format Indonesian date
  const formatIndoDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
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

  // Find category names (memoized)
  const eventCategories = useMemo(() => {
    let ids = [];
    if (Array.isArray(event.targetCategoryIds) && event.targetCategoryIds.length > 0) {
      ids = event.targetCategoryIds.map(Number);
    } else if (Array.isArray(event.targetCategories) && event.targetCategories.length > 0) {
      ids = event.targetCategories.map(tc => Number(tc.categoryId || tc.id || tc));
    }
    return ids.map(id => categories.find(c => c.id === id)).filter(Boolean);
  }, [event.targetCategoryIds, event.targetCategories, categories]);

  const isAllCategories = (
    eventCategories.length === 0 ||
    eventCategories.some(c => c.id === 1) ||
    (categories.length > 0 && eventCategories.length >= categories.length)
  );

  const targetGender = event.target_gender || event.targetGender || 'ALL';

  // Check if attendance has been recorded for this event
  const attendanceMap = (event.id && attendance[event.id]) || (event.id && attendance[Number(event.id)]) || {};
  const hasAttendanceRecords = Boolean(attendanceMap && Object.keys(attendanceMap).length > 0);

  // Calculate accurate attendance statistics
  const stats = useMemo(() => {
    if (!event.show_statistics || jamaahList.length === 0) return null;
    return calculateEventAttendanceStats(event, attendance, jamaahList, categories, events);
  }, [event, attendance, jamaahList, categories, events]);

  const totalRecord = stats?.totalTarget || 0;
  const totalHadir = stats?.hadir || 0;
  const totalDaring = stats?.daring || 0;
  const totalIzin = (stats?.izin || 0) + (stats?.sakit || 0);

  // WhatsApp share generator
  const handleShareWA = (e) => {
    e.stopPropagation();
    const text = generateEventShareText(event, categories);
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div 
      onClick={() => onOpenDetail(event)}
      className="group relative bg-white rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer hover:border-brand-300"
    >
      {/* Top Banner & Category Tags */}
      <div className="p-5 sm:p-6 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {isAllCategories ? (
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-brand-700 border border-emerald-200/70">
                Semua Jamaah
              </span>
            ) : eventCategories.length > 0 ? (
              eventCategories.map(cat => (
                <span 
                  key={cat.id}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-brand-700 border border-emerald-200/70"
                >
                  {cat.nama_kategori}
                </span>
              ))
            ) : (
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Umum
              </span>
            )}
            {targetGender === 'L' && (
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                🧔 Khusus Pria
              </span>
            )}
            {targetGender === 'P' && (
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-pink-50 text-pink-700 border border-pink-200">
                🧕 Khusus Wanita
              </span>
            )}
          </div>
        </div>

        {/* Event Title */}
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-brand-800 transition-colors line-clamp-2 leading-snug">
          {event.tema}
        </h3>

        {/* Speaker if available */}
        {event.pembicara && (
          <p className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-brand-700 mt-2">
            <User className="w-3.5 h-3.5 shrink-0" />
            <span>{event.pembicara}</span>
          </p>
        )}

        {/* Description snippet */}
        <p className="text-xs sm:text-sm text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
          {event.deskripsi || 'Agenda kegiatan rutin.'}
        </p>

        {/* Meta Info: Date, Time, Location */}
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs sm:text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium text-slate-800">{formatIndoDate(event.tanggal)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{event.waktu}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="line-clamp-1">{event.lokasi || 'Masjid Jami At-Taqwa'}</span>
          </div>
        </div>
      </div>

      {/* Attendance Stats Preview (if show_statistics is enabled) */}
      {event.show_statistics && (
        <div className="px-5 sm:px-6 py-2.5 bg-slate-50 border-t border-slate-100/90 text-xs flex items-center justify-between">
          {hasAttendanceRecords ? (
            <>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">Kehadiran:</span>
                <span className="font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                  {totalHadir} Hadir
                </span>
                {totalDaring > 0 && (
                  <span className="font-medium text-sky-700 bg-sky-100/60 px-2 py-0.5 rounded">
                    {totalDaring} Daring
                  </span>
                )}
                {totalIzin > 0 && (
                  <span className="font-medium text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded">
                    {totalIzin} Izin
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Total {totalRecord}
              </span>
            </>
          ) : (
            <div className="flex items-center justify-between w-full text-slate-400">
              <span className="text-[11px] italic">Presensi belum diisi</span>
              <span className="text-[11px] font-medium text-slate-400">Sasaran {totalRecord} Jamaah</span>
            </div>
          )}
        </div>
      )}

      {/* Card Actions */}
      <div className="p-4 sm:p-5 pt-3 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(event);
          }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100/80 transition-colors"
        >
          <Eye className="w-4 h-4" />
          <span>Lihat Detail</span>
        </button>

        <button
          type="button"
          onClick={handleShareWA}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 transition-colors border border-slate-200 hover:border-emerald-200"
          title="Bagikan ke WhatsApp"
        >
          <Share2 className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">Bagikan</span>
        </button>
      </div>
    </div>
  );
}

export default React.memo(EventCard);
