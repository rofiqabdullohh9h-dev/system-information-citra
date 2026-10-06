/**
 * dateUtils.js
 * Utilitas normalisasi dan pemformatan tanggal waktu zona Indonesia (WIB / Asia/Jakarta).
 * Memastikan data UTC dari database PostgreSQL/Supabase selalu tersinkronisasi akurat ke waktu lokal.
 */

/**
 * Mengurai string tanggal dari database (termasuk timestamp tanpa penanda zona UTC 'Z')
 * menjadi objek Date Javascript yang valid.
 */
export function parseUtcDate(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;

  let str = String(dateVal).trim();

  // Deteksi format ISO / Timestamp dari database: YYYY-MM-DDTHH:mm:ss atau YYYY-MM-DD HH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(str)) {
    // Jika tidak memiliki penanda timezone ('Z' atau offset '+/-HH:mm')
    if (!str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
      str = str.replace(' ', 'T') + 'Z';
    }
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format tanggal dan jam lengkap dalam zona waktu WIB (Asia/Jakarta)
 * Contoh output: "6 Okt 2026, 18.50"
 */
export function formatDateTimeWIB(dateVal, options = {}) {
  if (!dateVal) return '-';

  const d = parseUtcDate(dateVal);
  if (!d) return String(dateVal);

  return d.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: options.dateStyle || 'medium',
    timeStyle: options.timeStyle || 'short',
    ...options,
  });
}

/**
 * Format tanggal saja dalam zona waktu WIB (Asia/Jakarta)
 * Contoh output: "Selasa, 6 Oktober 2026"
 */
export function formatDateWIB(dateVal, options = {}) {
  if (!dateVal) return '-';

  const d = parseUtcDate(dateVal);
  if (!d) return String(dateVal);

  return d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    ...options,
  });
}

/**
 * Format jam saja dalam zona waktu WIB (Asia/Jakarta)
 * Contoh output: "18.50"
 */
export function formatTimeWIB(dateVal, options = {}) {
  if (!dateVal) return '-';

  const d = parseUtcDate(dateVal);
  if (!d) return String(dateVal);

  return d.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

/**
 * Mengambil string tanggal YYYY-MM-DD dalam waktu lokal / WIB secara aman
 */
export function getLocalDateStr(dateVal) {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    const match = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const d = parseUtcDate(dateVal);
  if (!d || isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const INDONESIAN_MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
];

/**
 * Mendapatkan rentang tanggal (startDate, endDate, label) berdasarkan jenis periode
 * periodType: 'ALL' | 'THIS_WEEK' | 'THIS_MONTH' | 'SPECIFIC_MONTH' | 'CUSTOM'
 */
export function getPeriodRange(periodType, options = {}) {
  const { startDate, endDate, month, year } = options;
  const now = new Date();

  if (periodType === 'THIS_WEEK') {
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const start = getLocalDateStr(monday);
    const end = getLocalDateStr(sunday);
    const monFmt = monday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    const sunFmt = sunday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    return {
      startDate: start,
      endDate: end,
      label: `Minggu Ini (${monFmt} - ${sunFmt})`,
      shortLabel: 'Minggu Ini'
    };
  }

  if (periodType === 'THIS_MONTH') {
    const y = now.getFullYear();
    const m = now.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);

    const start = getLocalDateStr(firstDay);
    const end = getLocalDateStr(lastDay);
    const monthName = firstDay.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    return {
      startDate: start,
      endDate: end,
      label: `Bulan Ini (${monthName})`,
      shortLabel: 'Bulan Ini'
    };
  }

  if (periodType === 'SPECIFIC_MONTH') {
    const selYear = Number(year) || now.getFullYear();
    const selMonth = Number(month) || (now.getMonth() + 1);
    const firstDay = new Date(selYear, selMonth - 1, 1);
    const lastDay = new Date(selYear, selMonth, 0);

    const start = getLocalDateStr(firstDay);
    const end = getLocalDateStr(lastDay);
    const monthName = firstDay.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    return {
      startDate: start,
      endDate: end,
      label: `Bulan ${monthName}`,
      shortLabel: monthName
    };
  }

  if (periodType === 'CUSTOM') {
    const start = startDate ? getLocalDateStr(startDate) : '';
    const end = endDate ? getLocalDateStr(endDate) : '';
    let label = 'Rentang Tanggal Tertentu';
    if (start && end) {
      if (start === end) {
        label = `Tanggal ${formatDateWIB(start, { day: 'numeric', month: 'short', year: 'numeric' })}`;
      } else {
        label = `${formatDateWIB(start, { day: 'numeric', month: 'short' })} s/d ${formatDateWIB(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
      }
    } else if (start) {
      label = `Mulai ${formatDateWIB(start, { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else if (end) {
      label = `Hingga ${formatDateWIB(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return {
      startDate: start,
      endDate: end,
      label,
      shortLabel: 'Kustom Tanggal'
    };
  }

  return {
    startDate: '',
    endDate: '',
    label: 'Semua Waktu',
    shortLabel: 'Semua Waktu'
  };
}

/**
 * Mengecek apakah tanggal berada dalam periode yang dipilih
 */
export function isDateInPeriod(dateVal, periodType, options = {}) {
  if (periodType === 'ALL') return true;
  const dateStr = getLocalDateStr(dateVal);
  if (!dateStr) return false;

  const range = getPeriodRange(periodType, options);
  if (range.startDate && dateStr < range.startDate) return false;
  if (range.endDate && dateStr > range.endDate) return false;
  return true;
}

