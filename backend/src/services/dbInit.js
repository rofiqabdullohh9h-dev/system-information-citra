import supabase from '../config/supabase.js';

export const checkAndSeedDatabase = async () => {
  try {
    // 1. Cek tabel Admin
    const { data: admins, error: adminErr } = await supabase.from('Admin').select('id').limit(1);
    if (adminErr) {
      if (adminErr.code === '42501') {
        console.warn('⚠️ [Supabase RLS Alert]: RLS aktif memblokir akses ke tabel "Admin".');
        console.warn('👉 Solusi: Masukkan SUPABASE_SERVICE_ROLE_KEY ke backend/.env ATAU jalankan ALTER TABLE "Admin" DISABLE ROW LEVEL SECURITY; di Supabase SQL Editor.');
      } else {
        console.warn('⚠️ [Supabase Query Notice]:', adminErr.message);
      }
    } else if (!admins || admins.length === 0) {
      console.log('🌱 Database Admin masih kosong. Menginisialisasi akun pengembang utama (rofiq)...');
      const { error: seedErr } = await supabase.from('Admin').insert([
        {
          id: 'admin-001',
          nama: 'ROFIQ ABDULLOH',
          username: 'rofiq',
          passwordHash: '$2b$10$zDFH1zMJBvVcly.ECJYLL.G4E08CMc66HlFx7qzIoJ5AihwsV.g8e',
          email: 'rofiq@citra.org',
          role: 'Developer',
          isActive: true
        }
      ]);
      if (seedErr) {
        if (seedErr.code === '42501') {
          console.warn('⚠️ [Supabase RLS Alert]: Gagal inisialisasi akun karena RLS. Gunakan SUPABASE_SERVICE_ROLE_KEY.');
        } else {
          console.warn('⚠️ Gagal inisialisasi akun pengurus:', seedErr.message);
        }
      } else {
        console.log('✅ Akun utama pengembang (@rofiq) berhasil diinisialisasi ke Supabase.');
      }
    }

    // 2. Cek tabel Category
    const { data: cats, error: catErr } = await supabase.from('Category').select('id').limit(1);
    if (!catErr && (!cats || cats.length === 0)) {
      console.log('🌱 Database Category masih kosong. Menginisialisasi kategori pengajian master...');
      const { error: seedCatErr } = await supabase.from('Category').insert([
        { id: 1, nama_kategori: 'Umum', deskripsi: 'Semua kelompok & jenjang usia jamaah' },
        { id: 2, nama_kategori: 'Dewasa', deskripsi: 'Kelompok usia dewasa' },
        { id: 3, nama_kategori: 'Lansia', deskripsi: 'Kelompok usia lanjut' },
        { id: 4, nama_kategori: 'Remaja & Muda-Mudi', deskripsi: 'Kelompok generasi muda / milenial' },
        { id: 5, nama_kategori: 'Anak-anak (Cabe Rawit)', deskripsi: 'Kelompok anak-anak & pembinaan dini' }
      ]);
      if (!seedCatErr) {
        console.log('✅ Kategori master pengajian berhasil diinisialisasi ke Supabase.');
      }
    }
  } catch (err) {
    // Non-blocking background check
  }
};
