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
