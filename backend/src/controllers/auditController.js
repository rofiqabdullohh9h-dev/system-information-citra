import supabase from '../config/supabase.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const { search, action, limit = 50 } = req.query;

    let query = supabase
      .from('AuditLog')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(parseInt(limit));

    if (action && action !== 'ALL') {
      query = query.ilike('action', `%${action}%`);
    }

    if (search) {
      query = query.or(`adminNama.ilike.%${search}%,target.ilike.%${search}%,details.ilike.%${search}%`);
    }

    const { data: logs, error } = await query;
    if (error) throw error;

    const formatted = (logs || []).map(l => ({
      id: l.id,
      adminId: l.adminId,
      adminNama: l.adminNama,
      action: l.action,
      target: l.target,
      details: l.details,
      timestamp: new Date(l.createdAt).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};
