import supabase from '../config/supabase.js';
import { logAudit } from '../services/auditService.js';

export const getAllAttendances = async (req, res, next) => {
  try {
    const { data: attendances, error } = await supabase
      .from('Attendance')
      .select('id, eventId, jamaahId, status, updatedAt');

    if (error) throw error;

    const grouped = {};
    (attendances || []).forEach(att => {
      if (!grouped[att.eventId]) {
        grouped[att.eventId] = {};
      }
      grouped[att.eventId][att.jamaahId] = att.status;
    });

    res.status(200).json({
      success: true,
      data: grouped,
      raw: attendances || [],
    });
  } catch (error) {
    next(error);
  }
};

export const getEventAttendance = async (req, res, next) => {

  try {
    const eventId = parseInt(req.params.eventId);

    const { data: attendances, error } = await supabase
      .from('Attendance')
      .select(`
        *,
        jamaah:Jamaah(
          id,
          nama,
          no_whatsapp,
          jenis_kelamin,
          categories:JamaahCategory(category:Category(*))
        ),
        recordedBy:Admin(id, nama)
      `)
      .eq('eventId', eventId);

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: attendances || [],
    });
  } catch (error) {
    next(error);
  }
};

export const recordBulkAttendance = async (req, res, next) => {
  try {
    const { eventId, records, autoAlpa = true } = req.body;
    // records: { [jamaahId]: 'HADIR' | 'DARING' | 'IZIN' | 'SAKIT' | 'ALPA' }

    if (!eventId || !records || typeof records !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Event ID dan data absensi wajib disertakan.',
      });
    }

    const { data: event, error: eventError } = await supabase
      .from('Event')
      .select('id, tema, deskripsi, targetCategories:EventCategory(categoryId)')
      .eq('id', parseInt(eventId))
      .single();

    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        message: 'Jadwal pengajian tidak ditemukan.',
      });
    }

    const adminId = req.user?.id || 'admin-001';
    const adminNama = req.user?.nama || 'Pengurus';

    const mergedRecords = { ...records };

    // Jika autoAlpa aktif (default true): cari semua jamaah sasaran pengajian yang belum ada status/keterangan, otomatis jadikan ALPA
    if (autoAlpa) {
      const targetCategoryIds = (event.targetCategories || []).map(tc => tc.categoryId);
      const { data: allCats } = await supabase.from('Category').select('id');
      const totalCatCount = (allCats || []).length;
      const isGeneral = targetCategoryIds.length === 0 || targetCategoryIds.includes(1) || (totalCatCount > 0 && targetCategoryIds.length >= totalCatCount);

      const targetGender = (
        event.deskripsi && event.deskripsi.includes('<!--gender:L-->') ? 'L' :
        event.deskripsi && event.deskripsi.includes('<!--gender:P-->') ? 'P' : 'ALL'
      );

      const { data: allJamaah } = await supabase
        .from('Jamaah')
        .select('id, isActive, jenis_kelamin, categories:JamaahCategory(categoryId)')
        .is('deletedAt', null);

      (allJamaah || []).forEach(j => {
        if (j.isActive === false) return;
        if (targetGender === 'L' && j.jenis_kelamin !== 'L') return;
        if (targetGender === 'P' && j.jenis_kelamin !== 'P') return;

        const userCats = (j.categories || []).map(c => c.categoryId);
        const isEligible = isGeneral || userCats.some(cid => targetCategoryIds.includes(cid));

        if (isEligible && !mergedRecords[j.id]) {
          mergedRecords[j.id] = 'ALPA'; // Otomatis ALPA jika tanpa keterangan
        }
      });
    }

    const entries = Object.entries(mergedRecords);
    const rows = entries.map(([jamaahId, status]) => ({
      jamaahId: parseInt(jamaahId),
      eventId: parseInt(eventId),
      status,
      recordedById: adminId,
      updatedAt: new Date().toISOString(),
    }));

    // Upsert into Attendance table using composite unique constraint (jamaahId, eventId)
    const { error: upsertError } = await supabase
      .from('Attendance')
      .upsert(rows, { onConflict: 'jamaahId,eventId' });

    if (upsertError) throw upsertError;

    const count = rows.length;

    // Catat audit log untuk setiap aktivitas pencatatan absensi (baik individu maupun massal)
    try {
      let auditDetails = '';
      if (count === 1) {
        const targetJamaahId = parseInt(entries[0][0]);
        const targetStatus = entries[0][1];
        const { data: jData } = await supabase
          .from('Jamaah')
          .select('nama')
          .eq('id', targetJamaahId)
          .single();
        const namaJamaah = jData?.nama || `Jamaah #${targetJamaahId}`;
        auditDetails = `Pengurus ${adminNama} mencatat status "${targetStatus}" untuk ${namaJamaah} pada agenda "${event.tema}".`;
      } else {
        auditDetails = `Pengurus ${adminNama} merekap absensi kehadiran untuk ${count} jamaah${autoAlpa ? ' (tanpa keterangan otomatis ALPA)' : ''} pada agenda "${event.tema}".`;
      }

      await logAudit({
        adminId,
        adminNama,
        action: 'RECORD_ATTENDANCE',
        target: event.tema,
        details: auditDetails,
      });
    } catch (auditErr) {
      console.warn('Gagal mencatat audit log kehadiran:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Berhasil mencatat absensi untuk ${count} jamaah.`,
      count,
    });
  } catch (error) {
    next(error);
  }
};

export const getTodayEventsAndAttendance = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: eventsToday, error } = await supabase
      .from('Event')
      .select(`
        *,
        targetCategories:EventCategory(category:Category(*))
      `)
      .gte('tanggal', today.toISOString())
      .lt('tanggal', tomorrow.toISOString())
      .is('deletedAt', null);

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: eventsToday || [],
    });
  } catch (error) {
    next(error);
  }
};
