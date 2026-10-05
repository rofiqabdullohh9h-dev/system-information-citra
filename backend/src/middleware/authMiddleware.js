import { verifyToken } from '../utils/jwt.js';
import supabase from '../config/supabase.js';

export const authMiddleware = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token autentikasi tidak ditemukan.',
      });
    }
    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Sesi login tidak valid atau telah kedaluwarsa.',
      });
    }

    // Verify user in Supabase Admin table
    const { data: user, error } = await supabase
      .from('Admin')
      .select('id, nama, username, email, role, isActive')
      .eq('id', decoded.id)
      .single();

    if (error || !user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Akun pengurus tidak ditemukan atau telah dinonaktifkan.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Sesi login telah kedaluwarsa. Silakan masuk kembali.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token otentikasi tidak valid.',
    });
  }
};
