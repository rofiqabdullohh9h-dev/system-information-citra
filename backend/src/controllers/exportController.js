import ExcelJS from 'exceljs';
import supabase from '../config/supabase.js';

export const exportAttendanceToExcel = async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.eventId);

    const { data: event, error } = await supabase
      .from('Event')
      .select(`
        id,
        tema,
        tanggal,
        waktu,
        pembicara,
        targetCategories:EventCategory(categoryId),
        attendances:Attendance(
          jamaahId,
          status,
          recordedBy:Admin(nama)
        )
      `)
      .eq('id', eventId)
      .single();

    if (error || !event) {
      return res.status(404).json({
        success: false,
        message: 'Jadwal pengajian tidak ditemukan.',
      });
    }

    // Ambil seluruh data jamaah aktif beserta kategorinya
    const { data: allJamaah, error: jamaahError } = await supabase
      .from('Jamaah')
      .select(`
        id,
        nama,
        no_whatsapp,
        jenis_kelamin,
        isActive,
        categories:JamaahCategory(categoryId, category:Category(nama_kategori))
      `)
      .is('deletedAt', null);

    if (jamaahError) throw jamaahError;

    // Filter jamaah sasaran acara
    const targetCategoryIds = (event.targetCategories || []).map(tc => tc.categoryId);
    const isGeneralEvent = targetCategoryIds.length === 0 || targetCategoryIds.includes(1);

    const eligibleJamaah = (allJamaah || []).filter(j => {
      if (j.isActive === false) return false;
      if (isGeneralEvent) return true;
      const userCats = (j.categories || []).map(c => c.categoryId);
      return userCats.some(cid => targetCategoryIds.includes(cid));
    });

    // Petakan data absensi yang sudah ada di database
    const attMap = {};
    (event.attendances || []).forEach(att => {
      attMap[att.jamaahId] = att;
    });

    // Cek acara lain pada tanggal yang sama untuk kompensasi otomatis
    const eventDateStr = event.tanggal ? (event.tanggal.toString().match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || '') : '';
    const otherSameDayMap = {};
    if (eventDateStr) {
      const { data: otherEvents } = await supabase
        .from('Event')
        .select(`
          id, tema, tanggal,
          attendances:Attendance(jamaahId, status)
        `)
        .neq('id', eventId);
      (otherEvents || []).forEach(oe => {
        const oeDate = oe.tanggal ? (oe.tanggal.toString().match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || '') : '';
        if (oeDate === eventDateStr) {
          (oe.attendances || []).forEach(a => {
            if (a.status === 'HADIR' || a.status === 'DARING') {
              otherSameDayMap[a.jamaahId] = {
                status: a.status,
                tema: oe.tema,
              };
            }
          });
        }
      });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SIAP System (Supabase)';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Rekap Absensi', {
      pageSetup: { paperSize: 9, orientation: 'portrait' },
    });

    // Title Row
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `REKAPITULASI KEHADIRAN PENGAJIAN`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF047857' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 25;

    // Subtitle Info
    worksheet.getCell('A3').value = `Tema Pengajian:`;
    worksheet.getCell('B3').value = event.tema;
    worksheet.getCell('B3').font = { bold: true };

    worksheet.getCell('A4').value = `Tanggal:`;
    worksheet.getCell('B4').value = new Date(event.tanggal).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    worksheet.getCell('A5').value = `Waktu:`;
    worksheet.getCell('B5').value = event.waktu || '-';

    worksheet.getCell('A6').value = `Penceramah:`;
    worksheet.getCell('B6').value = event.pembicara || '-';

    // Header Table
    const headerRow = worksheet.getRow(8);
    headerRow.values = [
      'No',
      'Nama Jamaah',
      'No. WhatsApp',
      'Jenis Kelamin',
      'Kategori Jamaah',
      'Status Kehadiran',
      'Keterangan & Pencatat',
    ];
    headerRow.height = 24;

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF047857' },
      };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Populate Attendance Data: Jika belum ada keterangan/absensi, OTOMATIS JADI ALPA (kecuali hadir di sesi sore/lain)
    let rowIndex = 9;
    let countHadir = 0;
    let countDaring = 0;
    let countIzin = 0;
    let countSakit = 0;
    let countAlpa = 0;

    eligibleJamaah.forEach((person, index) => {
      const row = worksheet.getRow(rowIndex);
      const existing = attMap[person.id];
      const otherAtt = !existing ? otherSameDayMap[person.id] : null;

      // JIKA TIDAK ADA KETERANGAN: CEK SESI LAIN, JIKA TIDAK ADA OTOMATIS ALPA
      const status = existing?.status || (otherAtt ? otherAtt.status : 'ALPA');
      const displayStatus = status === 'ALPA' ? 'Tanpa Keterangan' : status;
      const isAuto = !existing && !otherAtt;
      const petugas = existing?.recordedBy?.nama 
        ? `Petugas: ${existing.recordedBy.nama}` 
        : (otherAtt ? `Ikut ngaji di ${otherAtt.tema}` : (isAuto ? 'Tanpa Keterangan' : 'Pengurus'));

      if (status === 'HADIR') countHadir++;
      else if (status === 'DARING') countDaring++;
      else if (status === 'IZIN') countIzin++;
      else if (status === 'SAKIT') countSakit++;
      else countAlpa++;

      const cats = (person.categories || [])
        .map(c => c.category?.nama_kategori)
        .filter(Boolean)
        .join(', ');

      row.values = [
        index + 1,
        person.nama || '-',
        person.no_whatsapp || '-',
        person.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan',
        cats || 'Umum',
        displayStatus,
        petugas,
      ];

      // Formatting status cell
      const statusCell = row.getCell(6);
      statusCell.alignment = { horizontal: 'center', vertical: 'middle' };
      statusCell.font = { bold: true };

      if (status === 'HADIR') {
        statusCell.font = { bold: true, color: { argb: 'FF047857' } };
      } else if (status === 'DARING') {
        statusCell.font = { bold: true, color: { argb: 'FF0369A1' } };
      } else if (status === 'IZIN') {
        statusCell.font = { bold: true, color: { argb: 'FFD97706' } };
      } else if (status === 'SAKIT') {
        statusCell.font = { bold: true, color: { argb: 'FF7C3AED' } };
      } else {
        statusCell.font = { bold: true, color: { argb: 'FFE11D48' } };
      }

      // Zebra striping
      if (index % 2 === 1) {
        row.eachCell((cell, colNumber) => {
          if (colNumber !== 6) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8FAFC' },
            };
          }
        });
      }

      rowIndex++;
    });

    // Summary Section
    rowIndex += 2;
    const totalEligible = eligibleJamaah.length;
    const rate = totalEligible > 0 ? Math.round(((countHadir + countDaring) / totalEligible) * 100) : 0;

    worksheet.getCell(`A${rowIndex}`).value = 'RINGKASAN KEHADIRAN (REKAP LAPORAN)';
    worksheet.getCell(`A${rowIndex}`).font = { bold: true, size: 11, color: { argb: 'FF047857' } };
    rowIndex++;

    const summaryRows = [
      ['Total Sasaran Jamaah', totalEligible],
      ['Hadir Fisik', countHadir],
      ['Mengikuti Daring', countDaring],
      ['Izin Berhalangan', countIzin],
      ['Sakit', countSakit],
      ['Tanpa Keterangan', countAlpa],
      ['Tingkat Partisipasi', `${rate}%`],
    ];

    summaryRows.forEach(([lbl, val]) => {
      worksheet.getCell(`A${rowIndex}`).value = lbl;
      worksheet.getCell(`B${rowIndex}`).value = val;
      worksheet.getCell(`A${rowIndex}`).font = { bold: true };
      worksheet.getCell(`B${rowIndex}`).font = { bold: true };
      rowIndex++;
    });

    // Set Column Widths
    worksheet.columns = [
      { width: 6 },
      { width: 30 },
      { width: 18 },
      { width: 22 },
      { width: 24 },
      { width: 20 },
      { width: 35 },
    ];

    const safeTitle = event.tema.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
    const fileName = `Rekap_Absensi_${safeTitle}_${event.id}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};
