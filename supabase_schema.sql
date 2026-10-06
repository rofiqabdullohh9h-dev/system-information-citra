-- ==============================================================================
-- SKRIP DATABASE SIAP (Sistem Informasi & Absensi Pengajian) UNTUK SUPABASE
-- ==============================================================================
-- Keterangan: Skrip ini BERSIH DARI DATA DUMMY.
-- Hanya membuat struktur tabel, relasi, indeks, akun pengurus awal, dan kategori dasar.
-- ==============================================================================

-- 1. Ekstensi UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL: Admin (Pengurus)
CREATE TABLE IF NOT EXISTS "Admin" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "nama" VARCHAR(255) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "role" VARCHAR(50) NOT NULL DEFAULT 'Pengurus',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- 3. TABEL: Category (Master Label Kelompok Pengajian)
CREATE TABLE IF NOT EXISTS "Category" (
    "id" SERIAL NOT NULL,
    "nama_kategori" VARCHAR(100) NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- 4. TABEL: Jamaah (Data Induk Anggota Komunitas)
CREATE TABLE IF NOT EXISTS "Jamaah" (
    "id" SERIAL NOT NULL,
    "nama" VARCHAR(255) NOT NULL,
    "no_whatsapp" VARCHAR(20),
    "jenis_kelamin" VARCHAR(1) NOT NULL, -- 'L' (Ikhwan) atau 'P' (Akhwat)
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Jamaah_pkey" PRIMARY KEY ("id")
);

-- 5. TABEL: JamaahCategory (Relasi Many-to-Many Jamaah & Kategori)
CREATE TABLE IF NOT EXISTS "JamaahCategory" (
    "jamaahId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JamaahCategory_pkey" PRIMARY KEY ("jamaahId","categoryId")
);

-- 6. TABEL: Event (Jadwal Acara Pengajian)
CREATE TABLE IF NOT EXISTS "Event" (
    "id" SERIAL NOT NULL,
    "tema" VARCHAR(255) NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "waktu" VARCHAR(50),
    "lokasi" VARCHAR(255),
    "pembicara" VARCHAR(255),
    "deskripsi" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "show_attendees" BOOLEAN NOT NULL DEFAULT false,
    "show_statistics" BOOLEAN NOT NULL DEFAULT true,
    "target_gender" VARCHAR(10) NOT NULL DEFAULT 'ALL', -- 'ALL' (Semua Pria & Wanita), 'L' (Khusus Pria), 'P' (Khusus Wanita)
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- 7. TABEL: EventCategory (Sasaran Audiens Acara)
CREATE TABLE IF NOT EXISTS "EventCategory" (
    "eventId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventCategory_pkey" PRIMARY KEY ("eventId","categoryId")
);

-- 8. TABEL: Attendance (Rekapitulasi Presensi Kehadiran)
CREATE TABLE IF NOT EXISTS "Attendance" (
    "id" SERIAL NOT NULL,
    "status" VARCHAR(20) NOT NULL, -- 'HADIR', 'DARING', 'IZIN', 'SAKIT', 'ALPA'
    "jamaahId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- 9. TABEL: AuditLog (Rekam Jejak Transparansi Aktivitas Pengurus)
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" SERIAL NOT NULL,
    "adminId" TEXT,
    "adminNama" VARCHAR(255) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target" VARCHAR(255) NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- 10. TABEL: Bulletin (Pengumuman Maklumat & Warta Berita/Dokumentasi Ormas)
CREATE TABLE IF NOT EXISTS "Bulletin" (
    "id" SERIAL NOT NULL,
    "tipe" VARCHAR(20) NOT NULL DEFAULT 'PENGUMUMAN', -- 'PENGUMUMAN' atau 'BERITA'
    "judul" VARCHAR(255) NOT NULL,
    "konten" TEXT NOT NULL,
    "kategori" VARCHAR(100) DEFAULT 'Umum',
    "penulis" VARCHAR(255) DEFAULT 'Pengurus Ormas',
    "gambar_url" TEXT,
    "lampiran_link" TEXT,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "tanggal_publikasi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bulletin_pkey" PRIMARY KEY ("id")
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - DINONAKTIFKAN AGAR BACKEND API MEMILIKI AKSES PENUH
-- ==============================================================================
ALTER TABLE "Admin" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Jamaah" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "JamaahCategory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "EventCategory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Attendance" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Bulletin" DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- INDEKS & UNIQUE CONSTRAINTS
-- ==============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS "Admin_username_key" ON "Admin"("username");
CREATE INDEX IF NOT EXISTS "Admin_username_idx" ON "Admin"("username");

CREATE UNIQUE INDEX IF NOT EXISTS "Category_nama_kategori_key" ON "Category"("nama_kategori");
CREATE INDEX IF NOT EXISTS "Category_nama_kategori_idx" ON "Category"("nama_kategori");

CREATE INDEX IF NOT EXISTS "Jamaah_nama_idx" ON "Jamaah"("nama");
CREATE INDEX IF NOT EXISTS "Jamaah_jenis_kelamin_idx" ON "Jamaah"("jenis_kelamin");
CREATE INDEX IF NOT EXISTS "Jamaah_deletedAt_idx" ON "Jamaah"("deletedAt");

CREATE INDEX IF NOT EXISTS "JamaahCategory_jamaahId_idx" ON "JamaahCategory"("jamaahId");
CREATE INDEX IF NOT EXISTS "JamaahCategory_categoryId_idx" ON "JamaahCategory"("categoryId");

CREATE INDEX IF NOT EXISTS "Event_tanggal_idx" ON "Event"("tanggal");
CREATE INDEX IF NOT EXISTS "Event_is_published_idx" ON "Event"("is_published");
CREATE INDEX IF NOT EXISTS "Event_createdById_idx" ON "Event"("createdById");
CREATE INDEX IF NOT EXISTS "Event_deletedAt_idx" ON "Event"("deletedAt");

CREATE INDEX IF NOT EXISTS "EventCategory_eventId_idx" ON "EventCategory"("eventId");
CREATE INDEX IF NOT EXISTS "EventCategory_categoryId_idx" ON "EventCategory"("categoryId");

CREATE INDEX IF NOT EXISTS "Attendance_eventId_idx" ON "Attendance"("eventId");
CREATE INDEX IF NOT EXISTS "Attendance_jamaahId_idx" ON "Attendance"("jamaahId");
CREATE INDEX IF NOT EXISTS "Attendance_recordedById_idx" ON "Attendance"("recordedById");
CREATE INDEX IF NOT EXISTS "Attendance_status_idx" ON "Attendance"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_jamaahId_eventId_key" ON "Attendance"("jamaahId", "eventId");

CREATE INDEX IF NOT EXISTS "AuditLog_adminId_idx" ON "AuditLog"("adminId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE INDEX IF NOT EXISTS "Bulletin_tipe_idx" ON "Bulletin"("tipe");
CREATE INDEX IF NOT EXISTS "Bulletin_is_pinned_idx" ON "Bulletin"("is_pinned");
CREATE INDEX IF NOT EXISTS "Bulletin_tanggal_publikasi_idx" ON "Bulletin"("tanggal_publikasi");

-- ==============================================================================
-- FOREIGN KEYS
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'JamaahCategory_jamaahId_fkey') THEN
        ALTER TABLE "JamaahCategory" ADD CONSTRAINT "JamaahCategory_jamaahId_fkey" FOREIGN KEY ("jamaahId") REFERENCES "Jamaah"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'JamaahCategory_categoryId_fkey') THEN
        ALTER TABLE "JamaahCategory" ADD CONSTRAINT "JamaahCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Event_createdById_fkey') THEN
        ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EventCategory_eventId_fkey') THEN
        ALTER TABLE "EventCategory" ADD CONSTRAINT "EventCategory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EventCategory_categoryId_fkey') THEN
        ALTER TABLE "EventCategory" ADD CONSTRAINT "EventCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Attendance_jamaahId_fkey') THEN
        ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_jamaahId_fkey" FOREIGN KEY ("jamaahId") REFERENCES "Jamaah"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Attendance_eventId_fkey') THEN
        ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Attendance_recordedById_fkey') THEN
        ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- ==============================================================================
-- DATA DASAR AWAL (HANYA AKUN PENGURUS & KATEGORI MASTER)
-- (TIDAK ADA DATA DUMMY JAMAAH, TIDAK ADA DUMMY EVENT, TIDAK ADA DUMMY ABSENSI)
-- ==============================================================================

-- 1. Akun Developer Utama (Password default: admin123)
-- Hash: $2b$10$zDFH1zMJBvVcly.ECJYLL.G4E08CMc66HlFx7qzIoJ5AihwsV.g8e
INSERT INTO "Admin" ("id", "nama", "username", "passwordHash", "email", "role", "isActive")
VALUES 
    ('admin-001', 'ROFIQ ABDULLOH', 'rofiq', '$2b$10$zDFH1zMJBvVcly.ECJYLL.G4E08CMc66HlFx7qzIoJ5AihwsV.g8e', 'rofiq@citra.org', 'Developer', true)
ON CONFLICT ("username") DO NOTHING;

-- 2. Kategori Master Pengajian Dasar (Jenjang Kelompok Usia/Generasi)
INSERT INTO "Category" ("id", "nama_kategori", "deskripsi")
VALUES
    (1, 'Umum', 'Semua kelompok & jenjang usia jamaah'),
    (2, 'Dewasa', 'Kelompok usia dewasa'),
    (3, 'Lansia', 'Kelompok usia lanjut'),
    (4, 'Remaja & Muda-Mudi', 'Kelompok generasi muda / milenial'),
    (5, 'Anak-anak (Cabe Rawit)', 'Kelompok anak-anak & pembinaan dini')
ON CONFLICT ("nama_kategori") DO NOTHING;

SELECT setval('public."Category_id_seq"', (SELECT MAX("id") FROM "Category"));
