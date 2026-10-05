import supabase from '../config/supabase.js';
import { logAudit } from '../services/auditService.js';

// Helper untuk membaca dan menyimpan target_gender secara fleksibel & backward-compatible
export const extractTargetGender = (event) => {
  if (event.target_gender && ['ALL', 'L', 'P'].includes(event.target_gender)) {
    return event.target_gender;
  }
  const match = (event.deskripsi || '').match(/<!--gender:(ALL|L|P)-->/);
  return match ? match[1] : 'ALL';
};

export const cleanDescription = (desc) => {
  return (desc || '').replace(/<!--gender:(ALL|L|P)-->/g, '').trim();
};

export const packDescription = (desc, gender = 'ALL') => {
  const clean = cleanDescription(desc);
  const validGender = ['L', 'P'].includes(gender) ? gender : 'ALL';
  return clean ? `${clean}\n<!--gender:${validGender}-->` : `<!--gender:${validGender}-->`;
};

export const getAllEvents = async (req, res, next) => {
  try {
    const { data: events, error } = await supabase
      .from('Event')
      .select(`
        *,
        targetCategories:EventCategory(categoryId, category:Category(*)),
        attendances:Attendance(status),
        createdBy:Admin(id, nama)
      `)
      .is('deletedAt', null)
      .order('tanggal', { ascending: false });

    if (error) throw error;

    const formatted = (events || []).map(e => ({
      ...e,
      target_gender: extractTargetGender(e),
      deskripsi: cleanDescription(e.deskripsi),
      targetCategoryIds: (e.targetCategories || []).map(tc => tc.categoryId),
      attendanceCount: e.attendances ? e.attendances.length : 0,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

export const getEventById = async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.id);

    const { data: event, error } = await supabase
      .from('Event')
      .select(`
        *,
        targetCategories:EventCategory(categoryId, category:Category(*)),
        attendances:Attendance(*, jamaah:Jamaah(*)),
        createdBy:Admin(id, nama)
      `)
      .eq('id', eventId)
      .single();

    if (error || !event || event.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Jadwal pengajian tidak ditemukan.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...event,
        target_gender: extractTargetGender(event),
        deskripsi: cleanDescription(event.deskripsi),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createEvent = async (req, res, next) => {
  try {
    const {
      tema,
      tanggal,
      waktu,
      lokasi,
      pembicara,
      deskripsi,
      is_published,
      show_attendees,
      show_statistics,
      targetCategoryIds,
      target_gender,
      targetGender,
    } = req.body;

    if (!tema || !tanggal) {
      return res.status(400).json({
        success: false,
        message: 'Tema dan tanggal pengajian wajib diisi.',
      });
    }

    const isPub = is_published !== undefined ? is_published : true;
    const showAtt = show_attendees !== undefined ? show_attendees : false;
    const showStats = show_statistics !== undefined ? show_statistics : true;

    if (isPub && !showAtt && !showStats) {
      return res.status(400).json({
        success: false,
        message: 'Jika acara dipublikasikan, minimal salah satu toggle (nama atau statistik) harus aktif.',
      });
    }

    const selectedGender = ['L', 'P'].includes(target_gender || targetGender)
      ? (target_gender || targetGender)
      : 'ALL';
    const packedDesc = packDescription(deskripsi, selectedGender);

    // 1. Insert Event
    const { data: newEvent, error: eventError } = await supabase
      .from('Event')
      .insert([
        {
          tema,
          tanggal: new Date(tanggal).toISOString(),
          waktu: waktu || '19:30 - 21:00 WIB',
          lokasi: lokasi || 'Masjid Jami At-Taqwa',
          pembicara: pembicara || '',
          deskripsi: packedDesc,
          is_published: isPub,
          show_attendees: showAtt,
          show_statistics: showStats,
          createdById: req.user.id,
        },
      ])
      .select()
      .single();

    if (eventError) throw eventError;

    // 2. Insert Target Categories (1 kategori sasaran yang ditentukan pengurus)
    const catIds = targetCategoryIds && targetCategoryIds.length > 0 ? [parseInt(targetCategoryIds[0])] : [1];
    const categoryRows = catIds.map(cid => ({
      eventId: newEvent.id,
      categoryId: parseInt(cid),
    }));

    await supabase.from('EventCategory').insert(categoryRows);

    // 3. Audit Log
    await logAudit({
      adminId: req.user.id,
      adminNama: req.user.nama,
      action: 'CREATE_EVENT',
      target: newEvent.tema,
      details: `Pengurus ${req.user.nama} membuat jadwal pengajian baru`,
    });

    res.status(201).json({
      success: true,
      message: 'Jadwal pengajian berhasil dibuat.',
      data: {
        ...newEvent,
        target_gender: selectedGender,
        deskripsi: cleanDescription(packedDesc),
        targetCategoryIds: catIds,
        targetCategories: [],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.id);
    const {
      tema,
      tanggal,
      waktu,
      lokasi,
      pembicara,
      deskripsi,
      is_published,
      show_attendees,
      show_statistics,
      targetCategoryIds,
      target_gender,
      targetGender,
    } = req.body;

    const { data: existing, error: checkError } = await supabase
      .from('Event')
      .select('id, tema, deskripsi, deletedAt')
      .eq('id', eventId)
      .single();

    if (checkError || !existing || existing.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Jadwal pengajian tidak ditemukan.',
      });
    }

    const selectedGender = ['L', 'P', 'ALL'].includes(target_gender || targetGender)
      ? (target_gender || targetGender)
      : extractTargetGender(existing);
    
    const newDesc = deskripsi !== undefined ? deskripsi : cleanDescription(existing.deskripsi);
    const packedDesc = packDescription(newDesc, selectedGender);

    // 1. Update Event data
    const updateData = {
      ...(tema && { tema }),
      ...(tanggal && { tanggal: new Date(tanggal).toISOString() }),
      ...(waktu !== undefined && { waktu }),
      ...(lokasi !== undefined && { lokasi }),
      ...(pembicara !== undefined && { pembicara }),
      deskripsi: packedDesc,
      ...(is_published !== undefined && { is_published }),
      ...(show_attendees !== undefined && { show_attendees }),
      ...(show_statistics !== undefined && { show_statistics }),
      updatedById: req.user.id,
      updatedAt: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await supabase
      .from('Event')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. Sync Categories if supplied (1 kategori)
    if (targetCategoryIds && Array.isArray(targetCategoryIds) && targetCategoryIds.length > 0) {
      await supabase.from('EventCategory').delete().eq('eventId', eventId);
      const newCategoryRows = [{
        eventId,
        categoryId: parseInt(targetCategoryIds[0]),
      }];
      await supabase.from('EventCategory').insert(newCategoryRows);
    }

    // 3. Audit Log
    await logAudit({
      adminId: req.user.id,
      adminNama: req.user.nama,
      action: 'UPDATE_EVENT',
      target: updated.tema,
      details: `Pengurus ${req.user.nama} memperbarui jadwal pengajian`,
    });

    res.status(200).json({
      success: true,
      message: 'Jadwal pengajian berhasil diperbarui.',
      data: {
        ...updated,
        target_gender: selectedGender,
        deskripsi: cleanDescription(updated.deskripsi),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.id);

    const { data: event, error: checkError } = await supabase
      .from('Event')
      .select('id, tema')
      .eq('id', eventId)
      .single();

    if (checkError || !event) {
      return res.status(404).json({
        success: false,
        message: 'Jadwal pengajian tidak ditemukan.',
      });
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('Event')
      .update({ deletedAt: new Date().toISOString() })
      .eq('id', eventId);

    if (deleteError) throw deleteError;

    await logAudit({
      adminId: req.user.id,
      adminNama: req.user.nama,
      action: 'DELETE_EVENT',
      target: event.tema,
      details: `Pengurus ${req.user.nama} menghapus jadwal pengajian`,
    });

    res.status(200).json({
      success: true,
      message: 'Jadwal pengajian berhasil dihapus.',
    });
  } catch (error) {
    next(error);
  }
};
