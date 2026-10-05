-- ==============================================================================
-- SKRIP TABEL BULLETIN (PENGUMUMAN & WARTA BERITA / DOKUMENTASI KEGIATAN)
-- ==============================================================================
-- Skrip ini untuk membuat tabel Bulletin di Supabase jika ingin menyimpan pengumuman
-- dan berita di database Supabase secara langsung.
-- ==============================================================================

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

-- Matikan RLS agar API backend dapat melakukan operasi penuh
ALTER TABLE "Bulletin" DISABLE ROW LEVEL SECURITY;

-- Indeks performa pencarian dan pengurutan
CREATE INDEX IF NOT EXISTS "Bulletin_tipe_idx" ON "Bulletin"("tipe");
CREATE INDEX IF NOT EXISTS "Bulletin_is_pinned_idx" ON "Bulletin"("is_pinned");
CREATE INDEX IF NOT EXISTS "Bulletin_tanggal_publikasi_idx" ON "Bulletin"("tanggal_publikasi");
