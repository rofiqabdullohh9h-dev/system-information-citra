import supabase from '../config/supabase.js';
import { hashPassword } from '../utils/bcrypt.js';
import { logAudit } from '../services/auditService.js';

export const getAllAdmins = async (req, res, next) => {
  try {
    const { data: admins, error } = await supabase
      .from('Admin')
      .select('id, nama, username, email, role, isActive, lastLogin, createdAt')
      .order('createdAt', { ascending: false });

    if (error) throw error;

    const formatted = (admins || []).map(adm => {
      let formattedLastLogin = adm.lastLogin;
      if (adm.lastLogin) {
        const rawDate = adm.lastLogin;
        const normalized = (typeof rawDate === 'string' && !rawDate.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(rawDate))
          ? `${rawDate}Z`
          : rawDate;
        const dateObj = new Date(normalized);
        if (!isNaN(dateObj.getTime())) {
          formattedLastLogin = dateObj.toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            dateStyle: 'medium',
            timeStyle: 'short',
          });
        }
      }
      return {
        ...adm,
        lastLogin: formattedLastLogin,
        no_whatsapp: adm.email || '',
      };
    });

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

export const createAdmin = async (req, res, next) => {
  try {
    const { nama, username, password, no_whatsapp, email } = req.body;
    const waVal = no_whatsapp !== undefined ? no_whatsapp : email;

    if (!nama || !nama.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nama lengkap pengurus wajib diisi.',
      });
    }

    if (!username || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Username pengurus wajib diisi.',
      });
    }

    if (!password || password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Kata sandi pengurus wajib diisi (minimal 6 karakter).',
      });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check existing
    const { data: existing } = await supabase
      .from('Admin')
      .select('id')
      .eq('username', cleanUsername)
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Username pengurus tersebut sudah digunakan. Silakan gunakan username lain.',
      });
    }

    const passwordHash = await hashPassword(password.trim());

    const { data: newAdmin, error } = await supabase
      .from('Admin')
      .insert([
        {
          nama: nama.trim(),
          username: cleanUsername,
          passwordHash,
          email: waVal && waVal.trim() ? waVal.trim() : null,
          role: 'Pengurus', // Selalu otomatis role Pengurus
          isActive: true,
        },
      ])
      .select('id, nama, username, email, role, isActive, createdAt')
      .single();

    if (error) throw error;

    const formattedAdmin = {
      ...newAdmin,
      no_whatsapp: newAdmin.email || '',
    };

    await logAudit({
      adminId: req.user?.id || 'admin-001',
      adminNama: req.user?.nama || 'Pengurus',
      action: 'CREATE_ADMIN',
      target: newAdmin.nama,
      details: `Pengurus ${req.user?.nama || 'Pengurus'} menambahkan akun pengurus baru (@${newAdmin.username})`,
    });

    res.status(201).json({
      success: true,
      message: 'Akun pengurus berhasil dibuat dengan kata sandi yang disesuaikan.',
      data: formattedAdmin,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdmin = async (req, res, next) => {
  try {
    const adminId = req.params.id;
    const { nama, no_whatsapp, email, password } = req.body;
    const waVal = no_whatsapp !== undefined ? no_whatsapp : email;

    const { data: admin, error: checkError } = await supabase
      .from('Admin')
      .select('id, nama, username, role')
      .eq('id', adminId)
      .single();

    if (checkError || !admin) {
      return res.status(404).json({
        success: false,
        message: 'Akun pengurus tidak ditemukan.',
      });
    }

    const currentUserId = req.user?.id;
    const isTargetDev = (admin.username || '').toLowerCase() === 'rofiq' || admin.role === 'Developer';
    const isSelf = currentUserId === admin.id;

    // Proteksi: Akun Developer hanya boleh diubah oleh Developer itu sendiri!
    if (isTargetDev && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Akun utama Developer (@rofiq) tidak dapat diubah oleh pengurus lain.',
      });
    }

    const updateData = {
      ...(nama && { nama: nama.trim() }),
      ...(waVal !== undefined && { email: waVal && waVal.trim() ? waVal.trim() : null }),
      updatedAt: new Date().toISOString(),
    };

    if (password && password.trim()) {
      if (password.trim().length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Kata sandi baru minimal 6 karakter.',
        });
      }
      updateData.passwordHash = await hashPassword(password.trim());
    }

    const { data: updated, error: updateError } = await supabase
      .from('Admin')
      .update(updateData)
      .eq('id', adminId)
      .select('id, nama, username, email, role, isActive, createdAt')
      .single();

    if (updateError) throw updateError;

    const formattedUpdated = {
      ...updated,
      no_whatsapp: updated.email || '',
    };

    await logAudit({
      adminId: req.user?.id || 'admin-001',
      adminNama: req.user?.nama || 'Pengurus',
      action: 'UPDATE_ADMIN',
      target: updated.nama,
      details: `${req.user?.nama || 'Pengurus'} memperbarui data akun @${updated.username}${password ? ' (kata sandi diubah)' : ''}`,
    });

    res.status(200).json({
      success: true,
      message: 'Data akun pengurus berhasil diperbarui.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAdmin = async (req, res, next) => {
  try {
    const adminId = req.params.id;

    const { data: admin, error: checkError } = await supabase
      .from('Admin')
      .select('id, nama, username, role')
      .eq('id', adminId)
      .single();

    if (checkError || !admin) {
      return res.status(404).json({
        success: false,
        message: 'Akun pengurus tidak ditemukan.',
      });
    }

    const currentUserId = req.user?.id;
    const isTargetDev = (admin.username || '').toLowerCase() === 'rofiq' || admin.role === 'Developer';
    const isSelf = currentUserId === admin.id;

    // 1. Akun Developer TIDAK DAPAT DIHAPUS oleh siapapun
    if (isTargetDev) {
      return res.status(403).json({
        success: false,
        message: 'Akun Developer (@rofiq) adalah akun pengembang sistem utama dan tidak dapat dihapus.',
      });
    }

    // 2. Tidak boleh menghapus akun sendiri saat sedang masuk (mencegah akun terkunci/hilang tak sengaja)
    if (isSelf) {
      return res.status(400).json({
        success: false,
        message: 'Anda tidak dapat menghapus akun Anda sendiri saat sedang masuk ke sistem.',
      });
    }

    // Check if other active admins exist
    const { data: fallbackAdmins } = await supabase
      .from('Admin')
      .select('id, username, nama')
      .neq('id', adminId)
      .eq('isActive', true);

    if (!fallbackAdmins || fallbackAdmins.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus akun ini karena merupakan satu-satunya akun pengurus aktif di sistem.',
      });
    }

    const fallbackAdminId = fallbackAdmins[0].id;

    // Reassign events and attendances so foreign key constraint does not block deletion
    await supabase
      .from('Event')
      .update({ createdById: fallbackAdminId })
      .eq('createdById', adminId);

    await supabase
      .from('Event')
      .update({ updatedById: fallbackAdminId })
      .eq('updatedById', adminId);

    await supabase
      .from('Attendance')
      .update({ recordedById: fallbackAdminId })
      .eq('recordedById', adminId);

    // Delete the admin row cleanly from Admin table
    const { error: deleteError } = await supabase
      .from('Admin')
      .delete()
      .eq('id', adminId);

    if (deleteError) throw deleteError;

    await logAudit({
      adminId: currentUserId || fallbackAdminId,
      adminNama: req.user?.nama || 'Pengurus',
      action: 'DELETE_ADMIN',
      target: admin.nama,
      details: `Pengurus ${req.user?.nama || 'Pengurus'} menghapus akun @${admin.username} dari sistem`,
    });

    res.status(200).json({
      success: true,
      message: `Akun pengurus ${admin.nama} (@${admin.username}) berhasil dihapus secara permanen dari sistem.`,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleAdminStatus = async (req, res, next) => {
  try {
    const adminId = req.params.id;
    const currentUserId = req.user?.id;

    // 1. Tidak boleh mengubah status diri sendiri
    if (adminId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Anda tidak dapat mengubah status akun Anda sendiri.',
      });
    }

    const { data: admin, error: getError } = await supabase
      .from('Admin')
      .select('id, nama, username, role, isActive')
      .eq('id', adminId)
      .single();

    if (getError || !admin) {
      return res.status(404).json({
        success: false,
        message: 'Akun pengurus tidak ditemukan.',
      });
    }

    // 2. Proteksi akun Developer (@rofiq): Status tidak dapat diubah
    if ((admin.username || '').toLowerCase() === 'rofiq' || admin.role === 'Developer') {
      return res.status(403).json({
        success: false,
        message: 'Status akun Developer (@rofiq) tidak dapat diubah.',
      });
    }

    const newActiveState = !admin.isActive;

    const { data: updated, error: updateError } = await supabase
      .from('Admin')
      .update({ isActive: newActiveState, updatedAt: new Date().toISOString() })
      .eq('id', adminId)
      .select('id, nama, username, isActive')
      .single();

    if (updateError) throw updateError;

    await logAudit({
      adminId: currentUserId,
      adminNama: req.user?.nama || 'Pengurus',
      action: 'TOGGLE_ADMIN_STATUS',
      target: updated.nama,
      details: `Pengurus ${req.user?.nama || 'Pengurus'} mengubah status akun @${updated.username} menjadi ${updated.isActive ? 'Aktif' : 'Nonaktif'}`,
    });

    res.status(200).json({
      success: true,
      message: `Status akun pengurus berhasil diubah menjadi ${updated.isActive ? 'Aktif' : 'Nonaktif'}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const resetDatabase = async (req, res, next) => {
  return res.status(403).json({
    success: false,
    message: 'Fitur reset database telah dinonaktifkan secara permanen untuk melindungi data operasional real.',
  });
};

