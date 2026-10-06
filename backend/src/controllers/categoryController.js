import supabase from '../config/supabase.js';
import { logAudit } from '../services/auditService.js';

export const getAllCategories = async (req, res, next) => {
  try {
    const { data: categories, error } = await supabase
      .from('Category')
      .select('id, nama_kategori, deskripsi, createdAt, jamaahs:JamaahCategory(jamaahId)')
      .order('id', { ascending: true });

    if (error) throw error;

    const formatted = (categories || []).map(c => ({
      id: c.id,
      nama_kategori: c.nama_kategori,
      deskripsi: c.deskripsi,
      memberCount: c.jamaahs ? c.jamaahs.length : 0,
      createdAt: c.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { nama_kategori, deskripsi } = req.body;

    if (!nama_kategori || !nama_kategori.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nama kategori wajib diisi.',
      });
    }

    const { data: newCategory, error } = await supabase
      .from('Category')
      .insert([
        {
          nama_kategori: nama_kategori.trim(),
          deskripsi: deskripsi ? deskripsi.trim() : null,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          message: 'Kategori dengan nama tersebut sudah ada.',
        });
      }
      throw error;
    }

    await logAudit({
      adminId: req.user.id,
      adminNama: req.user.nama,
      action: 'CREATE_CATEGORY',
      target: newCategory.nama_kategori,
      details: `Pengurus ${req.user.nama} membuat kategori majelis baru`,
    });

    res.status(201).json({
      success: true,
      message: 'Kategori baru berhasil dibuat.',
      data: newCategory,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const categoryId = parseInt(req.params.id);
    const { nama_kategori, deskripsi } = req.body;

    const { data: updated, error } = await supabase
      .from('Category')
      .update({
        ...(nama_kategori && { nama_kategori: nama_kategori.trim() }),
        ...(deskripsi !== undefined && { deskripsi: deskripsi.trim() }),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', categoryId)
      .select()
      .single();

    if (error || !updated) {
      return res.status(404).json({
        success: false,
        message: 'Kategori tidak ditemukan.',
      });
    }

    await logAudit({
      adminId: req.user.id,
      adminNama: req.user.nama,
      action: 'UPDATE_CATEGORY',
      target: updated.nama_kategori,
      details: `Pengurus ${req.user.nama} memperbarui kategori majelis`,
    });

    res.status(200).json({
      success: true,
      message: 'Kategori berhasil diperbarui.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const categoryId = parseInt(req.params.id);

    const { data: category, error: getError } = await supabase
      .from('Category')
      .select('id, nama_kategori')
      .eq('id', categoryId)
      .single();

    if (getError || !category) {
      return res.status(404).json({
        success: false,
        message: 'Kategori tidak ditemukan.',
      });
    }

    const { error: delError } = await supabase
      .from('Category')
      .delete()
      .eq('id', categoryId);

    if (delError) throw delError;

    await logAudit({
      adminId: req.user.id,
      adminNama: req.user.nama,
      action: 'DELETE_CATEGORY',
      target: category.nama_kategori,
      details: `Pengurus ${req.user.nama} menghapus kategori majelis`,
    });

    res.status(200).json({
      success: true,
      message: 'Kategori berhasil dihapus.',
    });
  } catch (error) {
    next(error);
  }
};
