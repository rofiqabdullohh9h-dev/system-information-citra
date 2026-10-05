import supabase from '../config/supabase.js';
import { extractTargetGender, cleanDescription } from './eventController.js';

export const getPublicEvents = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    const { data: events, error } = await supabase
      .from('Event')
      .select(`
        id,
        tema,
        tanggal,
        waktu,
        lokasi,
        pembicara,
        deskripsi,
        is_published,
        show_attendees,
        show_statistics,
        targetCategories:EventCategory(
          category:Category(*)
        ),
        attendances:Attendance(
          status
        )
      `)
      .eq('is_published', true)
      .is('deletedAt', null)
      .order('tanggal', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Format events adhering to visibility controls
    const formatted = (events || []).map(event => {
      let stats = null;

      if (event.show_statistics && event.attendances) {
        const total = event.attendances.length;
        const hadir = event.attendances.filter(a => a.status === 'HADIR').length;
        const daring = event.attendances.filter(a => a.status === 'DARING').length;
        const izin = event.attendances.filter(a => a.status === 'IZIN').length;
        const sakit = event.attendances.filter(a => a.status === 'SAKIT').length;
        const alpa = event.attendances.filter(a => a.status === 'ALPA').length;

        stats = { hadir, daring, izin, sakit, alpa, total };
      }

      return {
        id: event.id,
        tema: event.tema,
        tanggal: event.tanggal,
        waktu: event.waktu,
        lokasi: event.lokasi,
        pembicara: event.pembicara,
        deskripsi: cleanDescription(event.deskripsi),
        target_gender: extractTargetGender(event),
        is_published: true,
        show_attendees: event.show_attendees,
        show_statistics: event.show_statistics,
        targetCategories: (event.targetCategories || []).map(tc => tc.category).filter(Boolean),
        targetCategoryIds: (event.targetCategories || []).map(tc => tc.category?.id).filter(Boolean),
        stats,
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

export const getPublicEventDetail = async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.id);

    const { data: event, error } = await supabase
      .from('Event')
      .select(`
        id,
        tema,
        tanggal,
        waktu,
        lokasi,
        pembicara,
        deskripsi,
        is_published,
        show_attendees,
        show_statistics,
        deletedAt,
        targetCategories:EventCategory(
          category:Category(*)
        ),
        attendances:Attendance(
          status,
          jamaah:Jamaah(id, nama, jenis_kelamin)
        )
      `)
      .eq('id', eventId)
      .single();

    if (error || !event || !event.is_published || event.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Jadwal pengajian tidak ditemukan atau bersifat internal.',
      });
    }

    // Process statistics
    let stats = null;
    const attList = event.attendances || [];
    if (event.show_statistics) {
      const total = attList.length;
      const hadir = attList.filter(a => a.status === 'HADIR').length;
      const daring = attList.filter(a => a.status === 'DARING').length;
      const izin = attList.filter(a => a.status === 'IZIN').length;
      const sakit = attList.filter(a => a.status === 'SAKIT').length;
      const alpa = attList.filter(a => a.status === 'ALPA').length;

      stats = { hadir, daring, izin, sakit, alpa, total };
    }

    // Process attendees list strictly respecting privacy toggle (FR-VISIBILITY-004)
    let attendees = null;
    if (event.show_attendees) {
      attendees = attList.map(a => ({
        jamaahId: a.jamaah?.id,
        nama: a.jamaah?.nama,
        jenis_kelamin: a.jamaah?.jenis_kelamin,
        status: a.status,
      }));
    }

    res.status(200).json({
      success: true,
      data: {
        id: event.id,
        tema: event.tema,
        tanggal: event.tanggal,
        waktu: event.waktu,
        lokasi: event.lokasi,
        pembicara: event.pembicara,
        deskripsi: event.deskripsi,
        is_published: true,
        show_attendees: event.show_attendees,
        show_statistics: event.show_statistics,
        targetCategories: (event.targetCategories || []).map(tc => tc.category).filter(Boolean),
        targetCategoryIds: (event.targetCategories || []).map(tc => tc.category?.id).filter(Boolean),
        stats,
        attendees, // null jika show_attendees = false
      },
    });

  } catch (error) {
    next(error);
  }
};

export const getPublicStatistics = async (req, res, next) => {
  try {
    const { data: categories, error } = await supabase
      .from('Category')
      .select('id, nama_kategori, deskripsi, jamaahs:JamaahCategory(jamaahId)');

    if (error) throw error;

    const stats = (categories || []).map(cat => ({
      id: cat.id,
      nama_kategori: cat.nama_kategori,
      deskripsi: cat.deskripsi,
      totalMembers: cat.jamaahs ? cat.jamaahs.length : 0,
    }));

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
