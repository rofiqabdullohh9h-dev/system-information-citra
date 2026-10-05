import supabase from '../config/supabase.js';
import { logAudit } from '../services/auditService.js';

// In-memory fallback storage when database is unreachable
let localBulletinsCache = [];

const readLocalBulletins = () => localBulletinsCache;
const saveLocalBulletins = (data) => {
  localBulletinsCache = data;
};

/**
 * GET /api/bulletins
 * Ambil seluruh daftar warta / pengumuman / berita
 */
export const getAllBulletins = async (req, res, next) => {
  try {
    const { tipe } = req.query; // 'PENGUMUMAN' | 'BERITA' | undefined

    // 1. Coba baca dari Supabase
    try {
      let query = supabase
        .from('Bulletin')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('tanggal_publikasi', { ascending: false });

      if (tipe) {
        query = query.eq('tipe', tipe.toUpperCase());
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return res.status(200).json({
          success: true,
          data,
          source: 'database',
        });
      }
    } catch (e) {
      // Supabase table not ready, fallback to local storage
    }

    // 2. Fallback Storage
    let list = readLocalBulletins();
    if (tipe) {
      list = list.filter(b => b.tipe === tipe.toUpperCase());
    }
    // Sort: pinned first, then newest
    list.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1;
      return new Date(b.tanggal_publikasi || b.createdAt) - new Date(a.tanggal_publikasi || a.createdAt);
    });

    res.status(200).json({
      success: true,
      data: list,
      source: 'local_storage',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bulletins/:id
 */
export const getBulletinById = async (req, res, next) => {
  try {
    const id = req.params.id;

    // Coba Supabase
    try {
      const { data, error } = await supabase
        .from('Bulletin')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return res.status(200).json({ success: true, data });
      }
    } catch (e) {}

    // Fallback
    const list = readLocalBulletins();
    const found = list.find(b => String(b.id) === String(id));
    if (!found) {
      return res.status(404).json({ success: false, message: 'Warta / pengumuman tidak ditemukan.' });
    }

    res.status(200).json({ success: true, data: found });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/bulletins
 * Buat pengumuman atau warta berita baru (Khusus Pengurus)
 */
export const createBulletin = async (req, res, next) => {
  try {
    const {
      tipe = 'PENGUMUMAN', // 'PENGUMUMAN' | 'BERITA'
      judul,
      konten,
      kategori = 'Umum',
      gambar_url,
      lampiran_link,
      is_pinned = false,
      tanggal_publikasi = new Date().toISOString(),
    } = req.body;

    if (!judul || !konten) {
      return res.status(400).json({
        success: false,
        message: 'Judul dan isi konten wajib diisi.',
      });
    }

    const adminId = req.user?.id || 'admin-001';
    const adminNama = req.user?.nama || 'Pengurus';

    const newRecord = {
      tipe: tipe.toUpperCase() === 'BERITA' ? 'BERITA' : 'PENGUMUMAN',
      judul: judul.trim(),
      konten: konten.trim(),
      kategori: kategori.trim() || 'Umum',
      penulis: adminNama,
      gambar_url: gambar_url ? gambar_url.trim() : null,
      lampiran_link: lampiran_link ? lampiran_link.trim() : null,
      is_pinned: Boolean(is_pinned),
      tanggal_publikasi: tanggal_publikasi || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Coba simpan ke Supabase
    try {
      const { data, error } = await supabase
        .from('Bulletin')
        .insert([newRecord])
        .select()
        .single();

      if (!error && data) {
        await logAudit({
          adminId,
          adminNama,
          action: 'CREATE_BULLETIN',
          target: data.judul,
          details: `Pengurus ${adminNama} menerbitkan ${data.tipe}: "${data.judul}"`,
        });

        return res.status(201).json({
          success: true,
          message: `Berhasil menerbitkan ${data.tipe.toLowerCase()}.`,
          data,
        });
      }
    } catch (e) {
      // Supabase table not created yet, fallback
    }

    // 2. Simpan di local storage
    const list = readLocalBulletins();
    const createdItem = {
      id: Date.now(),
      ...newRecord,
    };
    list.unshift(createdItem);
    saveLocalBulletins(list);

    await logAudit({
      adminId,
      adminNama,
      action: 'CREATE_BULLETIN',
      target: createdItem.judul,
      details: `Pengurus ${adminNama} menerbitkan ${createdItem.tipe}: "${createdItem.judul}"`,
    });

    res.status(201).json({
      success: true,
      message: `Berhasil menerbitkan ${createdItem.tipe.toLowerCase()}.`,
      data: createdItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/bulletins/:id
 * Perbarui pengumuman atau warta berita
 */
export const updateBulletin = async (req, res, next) => {
  try {
    const id = req.params.id;
    const {
      tipe,
      judul,
      konten,
      kategori,
      gambar_url,
      lampiran_link,
      is_pinned,
      tanggal_publikasi,
    } = req.body;

    const adminId = req.user?.id || 'admin-001';
    const adminNama = req.user?.nama || 'Pengurus';

    const updates = {
      ...(tipe && { tipe: tipe.toUpperCase() === 'BERITA' ? 'BERITA' : 'PENGUMUMAN' }),
      ...(judul && { judul: judul.trim() }),
      ...(konten && { konten: konten.trim() }),
      ...(kategori && { kategori: kategori.trim() }),
      gambar_url: gambar_url !== undefined ? (gambar_url ? gambar_url.trim() : null) : undefined,
      lampiran_link: lampiran_link !== undefined ? (lampiran_link ? lampiran_link.trim() : null) : undefined,
      ...(is_pinned !== undefined && { is_pinned: Boolean(is_pinned) }),
      ...(tanggal_publikasi && { tanggal_publikasi }),
      updatedAt: new Date().toISOString(),
    };

    // Remove undefined keys
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

    // 1. Coba update di Supabase
    try {
      const { data, error } = await supabase
        .from('Bulletin')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        await logAudit({
          adminId,
          adminNama,
          action: 'UPDATE_BULLETIN',
          target: data.judul,
          details: `Pengurus ${adminNama} memperbarui ${data.tipe}: "${data.judul}"`,
        });

        return res.status(200).json({
          success: true,
          message: 'Berhasil memperbarui data warta / pengumuman.',
          data,
        });
      }
    } catch (e) {}

    // 2. Fallback update di local storage
    const list = readLocalBulletins();
    const idx = list.findIndex(b => String(b.id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Warta / pengumuman tidak ditemukan.' });
    }

    list[idx] = { ...list[idx], ...updates };
    saveLocalBulletins(list);

    await logAudit({
      adminId,
      adminNama,
      action: 'UPDATE_BULLETIN',
      target: list[idx].judul,
      details: `Pengurus ${adminNama} memperbarui ${list[idx].tipe}: "${list[idx].judul}"`,
    });

    res.status(200).json({
      success: true,
      message: 'Berhasil memperbarui data warta / pengumuman.',
      data: list[idx],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/bulletins/:id
 * Hapus pengumuman atau warta berita
 */
export const deleteBulletin = async (req, res, next) => {
  try {
    const id = req.params.id;
    const adminId = req.user?.id || 'admin-001';
    const adminNama = req.user?.nama || 'Pengurus';

    // 1. Coba hapus di Supabase
    try {
      const { data, error } = await supabase
        .from('Bulletin')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        await logAudit({
          adminId,
          adminNama,
          action: 'DELETE_BULLETIN',
          target: data.judul,
          details: `Pengurus ${adminNama} menghapus ${data.tipe}: "${data.judul}"`,
        });

        return res.status(200).json({
          success: true,
          message: 'Berhasil menghapus data warta / pengumuman.',
          data,
        });
      }
    } catch (e) {}

    // 2. Fallback hapus di local storage
    const list = readLocalBulletins();
    const idx = list.findIndex(b => String(b.id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Warta / pengumuman tidak ditemukan.' });
    }

    const removed = list.splice(idx, 1)[0];
    saveLocalBulletins(list);

    await logAudit({
      adminId,
      adminNama,
      action: 'DELETE_BULLETIN',
      target: removed.judul,
      details: `Pengurus ${adminNama} menghapus ${removed.tipe}: "${removed.judul}"`,
    });

    res.status(200).json({
      success: true,
      message: 'Berhasil menghapus data warta / pengumuman.',
      data: removed,
    });
  } catch (error) {
    next(error);
  }
};
