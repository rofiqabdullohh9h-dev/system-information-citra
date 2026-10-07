/**
 * attendanceUtils.js
 * Utilitas kalkulasi jamaah sasaran dan statistik kehadiran yang akurat & konsisten.
 * Menghitung persentase kehadiran riil berdasarkan jumlah sasaran jamaah aktif.
 */

/**
 * Mendapatkan daftar jamaah aktif yang berhak/menjadi sasaran suatu acara
 * Memperhitungkan multi-kategori dan target jenis kelamin acara secara presisi.
 */
export function getEligibleJamaahForEvent(event, jamaahList = [], categories = []) {
  if (!event || !jamaahList || !Array.isArray(jamaahList)) return [];

  // Ambil targetCategoryIds dari event
  let targetCategoryIds = [];
  if (Array.isArray(event.targetCategoryIds) && event.targetCategoryIds.length > 0) {
    targetCategoryIds = event.targetCategoryIds.map(Number);
  } else if (Array.isArray(event.targetCategories) && event.targetCategories.length > 0) {
    targetCategoryIds = event.targetCategories.map(tc => Number(tc.categoryId || tc.id || tc));
  } else if (event.targetCategoryId) {
    targetCategoryIds = [Number(event.targetCategoryId)];
  }

  // Acara menyasar seluruh jamaah jika:
  // 1. targetCategoryIds kosong / tidak dibatasi
  // 2. targetCategoryIds menyertakan ID 1 (kategori Umum lama)
  // 3. targetCategoryIds mencakup semua kategori yang ada di sistem
  const isAllCategories = (
    targetCategoryIds.length === 0 ||
    targetCategoryIds.includes(1) ||
    (categories.length > 0 && targetCategoryIds.length >= categories.length)
  );

  const targetGender = event.target_gender || event.targetGender || (
    event.deskripsi && event.deskripsi.includes('<!--gender:L-->') ? 'L' :
    event.deskripsi && event.deskripsi.includes('<!--gender:P-->') ? 'P' : 'ALL'
  );

  return jamaahList.filter(person => {
    if (!person || person.isActive === false) return false;

    // 1. Filter Jenis Kelamin Target Acara
    if (targetGender === 'L' && person.jenis_kelamin !== 'L') return false;
    if (targetGender === 'P' && person.jenis_kelamin !== 'P') return false;

    // 2. Filter Kategori Target Acara
    if (isAllCategories) return true;

    const userCats = (person.categoryIds || (person.categoryId ? [person.categoryId] : [])).map(Number);
    return userCats.some(cid => targetCategoryIds.includes(cid));
  });
}

/**
 * Mengecek apakah jamaah cocok dengan target jenis kelamin suatu acara
 */
export function matchesEventGender(event, person) {
  if (!person) return false;
  const targetGender = event?.target_gender || event?.targetGender || (
    event?.deskripsi && event.deskripsi.includes('<!--gender:L-->') ? 'L' :
    event?.deskripsi && event.deskripsi.includes('<!--gender:P-->') ? 'P' : 'ALL'
  );
  if (targetGender === 'L' && person.jenis_kelamin !== 'L') return false;
  if (targetGender === 'P' && person.jenis_kelamin !== 'P') return false;
  return true;
}

/**
 * Menghitung statistik absensi lengkap (Hadir, Daring, Izin, Sakit, Alpa, Rate)
 * untuk suatu acara terhadap seluruh jamaah sasaran.
 */
export function calculateEventAttendanceStats(event, attendanceMap = {}, jamaahList = [], categories = [], allEvents = []) {
  const eligible = getEligibleJamaahForEvent(event, jamaahList, categories);
  const totalTarget = eligible.length;
  const eventAtt = attendanceMap[event.id] || attendanceMap[Number(event.id)] || {};

  const eventDateStr = event.tanggal ? String(event.tanggal).split('T')[0] : '';

  let hadir = 0;
  let daring = 0;
  let izin = 0;
  let sakit = 0;
  let alpa = 0;

  eligible.forEach(person => {
    let s = eventAtt[person.id];

    // Jika belum ada record pada sesi ini, cek kompensasi sesi lain pada tanggal yang sama
    if (!s && eventDateStr && Array.isArray(allEvents) && allEvents.length > 0) {
      const otherAttended = allEvents.some(oe => {
        if (!oe || oe.id === event.id) return false;
        const od = oe.tanggal ? String(oe.tanggal).split('T')[0] : '';
        if (od !== eventDateStr) return false;
        const oAtt = attendanceMap[oe.id] || attendanceMap[Number(oe.id)] || {};
        return oAtt[person.id] === 'HADIR' || oAtt[person.id] === 'DARING';
      });
      if (otherAttended) {
        s = 'HADIR';
      }
    }

    if (s === 'HADIR') hadir++;
    else if (s === 'DARING') daring++;
    else if (s === 'IZIN') izin++;
    else if (s === 'SAKIT') sakit++;
    else alpa++; // Belum diabsen dihitung sebagai ALPA / Tanpa Keterangan
  });

  const totalHadir = hadir + daring;
  const rate = totalTarget > 0 ? Math.round((totalHadir / totalTarget) * 100) : 0;

  return {
    totalTarget,
    hadir,
    daring,
    izin,
    sakit,
    alpa,
    totalHadir,
    rate,
    eligible
  };
}
