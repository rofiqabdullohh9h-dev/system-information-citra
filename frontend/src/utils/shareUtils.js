/**
 * Utility generator format teks share/bagikan ke WhatsApp & Clipboard
 * Format dibuat rapi, lengkap, tanpa penutup baku agar pengurus leluasa menambahkan pesan sendiri.
 */

export const generateEventShareText = (event, categories = []) => {
  if (!event) return '';

  // Format tanggal Indonesia
  let tanggalStr = '-';
  if (event.tanggal) {
    const d = new Date(event.tanggal);
    if (!isNaN(d.getTime())) {
      tanggalStr = d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } else {
      tanggalStr = String(event.tanggal);
    }
  }

  // Kategori sasaran
  const catIds = event.targetCategoryIds || (event.targetCategoryId ? [event.targetCategoryId] : [1]);
  const catNames = (catIds || [])
    .map(id => categories.find(c => c.id === id)?.nama_kategori)
    .filter(Boolean)
    .join(', ') || 'Umum';

  // Target jenis kelamin
  const targetGender = event.target_gender || event.targetGender;
  let genderLabel = '';
  if (targetGender === 'L') {
    genderLabel = ' (Khusus Ikhwan)';
  } else if (targetGender === 'P') {
    genderLabel = ' (Khusus Akhwat)';
  }

  // Bersihkan deskripsi dari komentar tersembunyi
  const cleanDeskripsi = event.deskripsi
    ? event.deskripsi.replace(/<!--[\s\S]*?-->/g, '').trim()
    : '';

  let text = `*INFORMASI PENGAJIAN*\n\n` +
    `📌 *Tema:* ${event.tema || '-'}\n` +
    `📅 *Hari, Tanggal:* ${tanggalStr}\n` +
    `⏰ *Waktu:* ${event.waktu || '-'}\n`;

  if (event.pembicara && event.pembicara.trim()) {
    text += `🎙️ *Pemateri:* ${event.pembicara.trim()}\n`;
  }

  text += `📍 *Tempat:* ${event.lokasi || 'Masjid Jami At-Taqwa'}\n` +
    `👥 *Peserta:* ${catNames}${genderLabel}`;

  if (cleanDeskripsi) {
    text += `\n\n📝 *Keterangan:*\n${cleanDeskripsi}`;
  }

  return text;
};

export const generateBulletinShareText = (bulletin) => {
  if (!bulletin) return '';
  let text = `*${bulletin.judul || 'PENGUMUMAN'}*\n\n${bulletin.konten || ''}`;
  if (bulletin.lampiran_link && bulletin.lampiran_link.trim()) {
    text += `\n\n🔗 *Tautan:* ${bulletin.lampiran_link.trim()}`;
  }
  return text;
};
