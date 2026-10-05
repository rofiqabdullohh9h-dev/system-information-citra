import supabase from '../config/supabase.js';

export const logAudit = async ({ adminId, adminNama, action, target, details }) => {
  try {
    await supabase.from('AuditLog').insert([
      {
        adminId: adminId || null,
        adminNama: adminNama || 'Sistem',
        action,
        target,
        details,
      },
    ]);
  } catch (err) {
    console.error('Gagal mencatat audit log:', err.message);
  }
};
