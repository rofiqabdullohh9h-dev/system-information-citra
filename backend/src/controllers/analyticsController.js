import supabase from '../config/supabase.js';

export const getOverviewStats = async (req, res, next) => {
  try {
    // 1. Total Jamaah
    const { count: totalJamaah } = await supabase
      .from('Jamaah')
      .select('*', { count: 'exact', head: true })
      .is('deletedAt', null)
      .eq('isActive', true);

    // 2. Total Events
    const { count: totalEvents } = await supabase
      .from('Event')
      .select('*', { count: 'exact', head: true })
      .is('deletedAt', null);

    // 3. Attendances
    const { data: attendances } = await supabase
      .from('Attendance')
      .select('status');

    const attList = attendances || [];
    const totalAttendanceRecords = attList.length;
    const hadir = attList.filter(a => a.status === 'HADIR').length;
    const daring = attList.filter(a => a.status === 'DARING').length;
    const izin = attList.filter(a => a.status === 'IZIN').length;
    const sakit = attList.filter(a => a.status === 'SAKIT').length;
    const alpa = attList.filter(a => a.status === 'ALPA').length;

    const avgAttendanceRate = totalAttendanceRecords > 0
      ? Math.round(((hadir + daring) / totalAttendanceRecords) * 100)
      : 85;

    // 4. Categories
    const { data: categories } = await supabase
      .from('Category')
      .select('id, nama_kategori, jamaahs:JamaahCategory(jamaahId)');

    const categoryStats = (categories || []).map(cat => ({
      id: cat.id,
      nama_kategori: cat.nama_kategori,
      totalMembers: cat.jamaahs ? cat.jamaahs.length : 0,
    }));

    res.status(200).json({
      success: true,
      data: {
        kpi: {
          totalJamaah: totalJamaah || 0,
          totalEvents: totalEvents || 0,
          avgAttendanceRate,
          totalAttendanceRecords,
        },
        presenceBreakdown: {
          hadir,
          daring,
          izin,
          sakit,
          alpa,
        },
        categoryStats,
      },
    });
  } catch (error) {
    next(error);
  }
};
