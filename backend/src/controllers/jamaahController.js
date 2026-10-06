import supabase from '../config/supabase.js';
import { logAudit } from '../services/auditService.js';

export const getAllJamaah = async (req, res, next) => {
  try {
    const { search, gender, categoryId } = req.query;

    let query = supabase
      .from('Jamaah')
      .select(`
        id,
        nama,
        no_whatsapp,
        jenis_kelamin,
        isActive,
        categories:JamaahCategory(
          categoryId,
          category:Category(*)
        )
      `)
      .is('deletedAt', null)
      .eq('isActive', true)
      .order('nama', { ascending: true });

    if (gender) {
      query = query.eq('jenis_kelamin', gender);
    }

    if (search) {
      query = query.or(`nama.ilike.%${search}%,no_whatsapp.ilike.%${search}%`);
    }

    const { data: jamaahList, error } = await query;
    if (error) throw error;

    let filtered = jamaahList || [];

    // Filter category if provided
    if (categoryId) {
      const catId = parseInt(categoryId);
      filtered = filtered.filter(j => 
        (j.categories || []).some(c => c.categoryId === catId)
      );
    }

    const formatted = filtered.map(j => ({
      id: j.id,
      nama: j.nama,
      no_whatsapp: j.no_whatsapp,
      jenis_kelamin: j.jenis_kelamin,
      isActive: j.isActive,
      categoryIds: (j.categories || []).map(c => c.categoryId),
      categories: (j.categories || []).map(c => c.category).filter(Boolean),
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

export const getJamaahById = async (req, res, next) => {
  try {
    const jamaahId = parseInt(req.params.id);

    const { data: jamaah, error } = await supabase
      .from('Jamaah')
      .select(`
        *,
        categories:JamaahCategory(category:Category(*)),
        attendances:Attendance(*, event:Event(tema, tanggal))
      `)
      .eq('id', jamaahId)
      .single();

    if (error || !jamaah || jamaah.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Data jamaah tidak ditemukan.',
      });
    }

    res.status(200).json({
      success: true,
      data: jamaah,
    });
  } catch (error) {
    next(error);
  }
};

export const createJamaah = async (req, res, next) => {
  try {
    const { nama, no_whatsapp, jenis_kelamin, categoryIds } = req.body;

    if (!nama || !jenis_kelamin) {
      return res.status(400).json({
        success: false,
        message: 'Nama dan jenis kelamin jamaah wajib diisi.',
      });
    }

    const gender = jenis_kelamin.toUpperCase() === 'P' ? 'P' : 'L';

    // 1. Insert Jamaah
    const { data: newJamaah, error: jamaahError } = await supabase
      .from('Jamaah')
      .insert([
        {
          nama: nama.trim(),
          no_whatsapp: no_whatsapp ? no_whatsapp.trim() : '',
          jenis_kelamin: gender,
          isActive: true,
        },
      ])
      .select()
      .single();

    if (jamaahError) throw jamaahError;

    // 2. Hubungkan Kategori (Jamaah hanya memiliki 1 kategori)
    const rawCatId = req.body.categoryId || (Array.isArray(categoryIds) && categoryIds[0]);
    let assignedCategoryIds = [];
    let assignedCategories = [];

    if (rawCatId) {
      const singleCid = parseInt(rawCatId);
      if (!isNaN(singleCid) && singleCid > 0) {
        const { data: dbCat } = await supabase.from('Category').select('*').eq('id', singleCid).single();
        if (dbCat) {
          await supabase.from('JamaahCategory').insert([{
            jamaahId: newJamaah.id,
            categoryId: dbCat.id,
          }]);
          assignedCategoryIds = [dbCat.id];
          assignedCategories = [dbCat];
        }
      }
    }

    // 3. Audit Log
    await logAudit({
      adminId: req.user.id,
      adminNama: req.user.nama,
      action: 'CREATE_JAMAAH',
      target: newJamaah.nama,
      details: `Pengurus ${req.user.nama} menambahkan data jamaah baru`,
    });

    res.status(201).json({
      success: true,
      message: 'Data jamaah berhasil ditambahkan.',
      data: {
        ...newJamaah,
        categoryIds: assignedCategoryIds,
        categories: assignedCategories,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateJamaah = async (req, res, next) => {
  try {
    const jamaahId = parseInt(req.params.id);
    const { nama, no_whatsapp, jenis_kelamin, categoryIds } = req.body;

    const { data: existing, error: checkError } = await supabase
      .from('Jamaah')
      .select('id, nama, deletedAt')
      .eq('id', jamaahId)
      .single();

    if (checkError || !existing || existing.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Data jamaah tidak ditemukan.',
      });
    }

    // 1. Update Jamaah
    const updateData = {
      ...(nama && { nama: nama.trim() }),
      ...(no_whatsapp !== undefined && { no_whatsapp: no_whatsapp.trim() }),
      ...(jenis_kelamin && { jenis_kelamin: jenis_kelamin.toUpperCase() === 'P' ? 'P' : 'L' }),
      updatedAt: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await supabase
      .from('Jamaah')
      .update(updateData)
      .eq('id', jamaahId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. Sync Category (Jamaah hanya memiliki 1 kategori)
    const rawCatId = req.body.categoryId || (Array.isArray(categoryIds) && categoryIds[0]);
    let assignedCategoryIds = [];
    let assignedCategories = [];

    if (rawCatId !== undefined) {
      await supabase.from('JamaahCategory').delete().eq('jamaahId', jamaahId);
      const singleCid = parseInt(rawCatId);
      if (!isNaN(singleCid) && singleCid > 0) {
        const { data: dbCat } = await supabase.from('Category').select('*').eq('id', singleCid).single();
        if (dbCat) {
          await supabase.from('JamaahCategory').insert([{
            jamaahId,
            categoryId: dbCat.id,
          }]);
          assignedCategoryIds = [dbCat.id];
          assignedCategories = [dbCat];
        }
      }
    }

    // 3. Audit Log
    await logAudit({
      adminId: req.user.id,
      adminNama: req.user.nama,
      action: 'UPDATE_JAMAAH',
      target: updated.nama,
      details: `Pengurus ${req.user.nama} memperbarui data jamaah`,
    });

    res.status(200).json({
      success: true,
      message: 'Data jamaah berhasil diperbarui.',
      data: {
        ...updated,
        categoryIds: assignedCategoryIds,
        categories: assignedCategories,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteJamaah = async (req, res, next) => {
  try {
    const jamaahId = parseInt(req.params.id);

    const { data: jamaah, error: checkError } = await supabase
      .from('Jamaah')
      .select('id, nama')
      .eq('id', jamaahId)
      .single();

    if (checkError || !jamaah) {
      return res.status(404).json({
        success: false,
        message: 'Data jamaah tidak ditemukan.',
      });
    }

    // 1. Hapus relasi kehadiran dan kelompok kategori jamaah
    await supabase.from('Attendance').delete().eq('jamaahId', jamaahId);
    await supabase.from('JamaahCategory').delete().eq('jamaahId', jamaahId);

    // 2. Hapus permanen dari tabel Jamaah di Supabase
    const { error: deleteError } = await supabase
      .from('Jamaah')
      .delete()
      .eq('id', jamaahId);

    if (deleteError) throw deleteError;

    await logAudit({
      adminId: req.user.id,
      adminNama: req.user.nama,
      action: 'DELETE_JAMAAH',
      target: jamaah.nama,
      details: `Pengurus ${req.user.nama} menghapus data jamaah: "${jamaah.nama}"`,
    });

    res.status(200).json({
      success: true,
      message: 'Data jamaah berhasil dihapus permanen dari database.',
    });
  } catch (error) {
    next(error);
  }
};

export const bulkImportJamaah = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Daftar data jamaah untuk diimpor tidak boleh kosong.',
      });
    }

    // Ambil daftar kategori yang ada di DB untuk memvalidasi relasi
    const { data: dbCategories } = await supabase.from('Category').select('id, nama_kategori');
    const validCatIdSet = new Set((dbCategories || []).map(c => c.id));
    const catNameToId = new Map((dbCategories || []).map(c => [c.nama_kategori.toLowerCase().trim(), c.id]));

    let insertedCount = 0;

    for (const item of items) {
      if (item.nama && item.nama.trim()) {
        const gender = item.jenis_kelamin && item.jenis_kelamin.toUpperCase().startsWith('P') ? 'P' : 'L';
        
        // Cari ID kategori dari ID atau dari nama kategori
        const resolvedCatIds = [];
        if (Array.isArray(item.categoryIds)) {
          for (const cid of item.categoryIds) {
            const num = parseInt(cid);
            if (validCatIdSet.has(num)) resolvedCatIds.push(num);
          }
        }
        if (item.kategori && typeof item.kategori === 'string') {
          const catNames = item.kategori.split(/[,;]/).map(s => s.trim().toLowerCase());
          for (const cn of catNames) {
            if (catNameToId.has(cn)) {
              resolvedCatIds.push(catNameToId.get(cn));
            }
          }
        }

        const { data: newJ, error } = await supabase
          .from('Jamaah')
          .insert([
            {
              nama: item.nama.trim(),
              no_whatsapp: item.no_whatsapp ? String(item.no_whatsapp).trim() : '',
              jenis_kelamin: gender,
            },
          ])
          .select()
          .single();

        if (!error && newJ) {
          const uniqueCatIds = [...new Set(resolvedCatIds)];
          const singleCatId = uniqueCatIds[0];
          if (singleCatId) {
            await supabase.from('JamaahCategory').insert([{
              jamaahId: newJ.id,
              categoryId: singleCatId,
            }]);
          }
          insertedCount++;
        }
      }
    }

    await logAudit({
      adminId: req.user.id,
      adminNama: req.user.nama,
      action: 'BULK_IMPORT_JAMAAH',
      target: `${insertedCount} Jamaah`,
      details: `Pengurus ${req.user.nama} mengimpor ${insertedCount} data jamaah via Excel / CSV`,
    });

    res.status(201).json({
      success: true,
      message: `Berhasil mengimpor ${insertedCount} data jamaah.`,
      count: insertedCount,
    });
  } catch (error) {
    next(error);
  }
};
