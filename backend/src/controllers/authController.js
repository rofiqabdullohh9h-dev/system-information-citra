import supabase from '../config/supabase.js';
import { comparePassword } from '../utils/bcrypt.js';
import { generateToken } from '../utils/jwt.js';
import { logAudit } from '../services/auditService.js';

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan kata sandi wajib diisi.',
      });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Query Pengurus from Supabase Admin table
    const { data: admin, error } = await supabase
      .from('Admin')
      .select('*')
      .eq('username', cleanUsername)
      .single();

    if (error || !admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Username tidak ditemukan atau akun dinonaktifkan.',
      });
    }

    const isMatch = await comparePassword(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Kata sandi tidak sesuai.',
      });
    }

    // Update lastLogin in Supabase
    await supabase
      .from('Admin')
      .update({ lastLogin: new Date().toISOString() })
      .eq('id', admin.id);

    // Generate JWT (Expired 2h)
    const token = generateToken({
      id: admin.id,
      username: admin.username,
      nama: admin.nama,
      role: 'Pengurus',
    });

    // Record Audit Log
    await logAudit({
      adminId: admin.id,
      adminNama: admin.nama,
      action: 'LOGIN',
      target: 'Sistem SIAP',
      details: `Pengurus ${admin.nama} berhasil masuk ke sistem`,
    });

    res.status(200).json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: {
        id: admin.id,
        nama: admin.nama,
        username: admin.username,
        email: admin.email,
        role: 'Pengurus',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};

export const logout = async (req, res) => {
  if (req.user) {
    await logAudit({
      adminId: req.user.id,
      adminNama: req.user.nama,
      action: 'LOGOUT',
      target: 'Sistem SIAP',
      details: `Pengurus ${req.user.nama} keluar dari sistem`,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Logout berhasil.',
  });
};
