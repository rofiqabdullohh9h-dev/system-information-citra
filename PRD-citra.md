# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Sistem Informasi & Absensi Pengajian (SIAP)

**Document Version:** 2.1 (Final - Simplified User Roles & Dual Dashboard)  
**Last Updated:** October 2026  
**Project Status:** Ready for Development

---

## Table of Contents

1. [Overview](#1-overview)
2. [User Roles & Dashboard Structure](#2-user-roles--dashboard-structure)
3. [Requirements](#3-requirements)
4. [Core Features](#4-core-features)
5. [User Flow](#5-user-flow)
6. [Architecture](#6-architecture)
7. [Sequence Diagram](#7-sequence-diagram)
8. [Database Schema](#8-database-schema)
9. [Tech Stack](#9-tech-stack)
10. [Development Roadmap](#10-development-roadmap)

---

## 1. OVERVIEW

### 1.1 Project Summary

Aplikasi web full-stack untuk mendigitalisasi manajemen operasional ormas pengajian. Sistem ini menggantikan proses manual berbasis WhatsApp dengan platform terpusat untuk penjadwalan, penyebaran informasi, dan pencatatan absensi jamaah secara efisien, transparan, dan terukur.

**Sistem SIAP menyediakan TWO SEPARATE DASHBOARDS:**
- **Public Dashboard (Jamaah)** → Portal informasi gratis tanpa login
- **Admin Dashboard (Admin/Pengurus)** → Panel kelola penuh dengan login

### 1.2 Problem Statement

- **Current State:** Pengurus menggunakan grup WhatsApp untuk mengelola jadwal, pengumuman, dan absensi
- **Pain Points:**
  - Informasi tersebar dan sulit untuk diarsipkan
  - Absensi manual sulit dilacak dan tidak terstruktur
  - Tidak ada statistik kehadiran yang akurat per kategori jamaah
  - Tidak ada audit trail (siapa yang melakukan apa)
  - Pengumuman sering hilang di antara chat lainnya

### 1.3 Solution Overview

Dua portal terpisah dengan fungsi berbeda:

1. **Public Portal (Jamaah)** 
   - Gratis, tanpa login
   - Papan informasi, jadwal, dan statistik
   - Read-only access

2. **Admin Portal (Admin/Pengurus)**
   - Login dengan username & password
   - Kelola semua data, input absensi, lihat analitik
   - Full CRUD access

### 1.4 Target Users

1. **Admin (Pengurus/Petugas Ormas)**
   - Meliputi semua tingkatan pengurus (Ketua, Sekretaris, Petugas Absensi)
   - Dapat login ke Admin Dashboard
   - Dapat menambah admin lain (dengan privilege khusus)

2. **Jamaah (Anggota Komunitas)**
   - Akses Portal Publik (gratis, tanpa login)
   - Hanya bisa melihat jadwal dan statistik
   - Tidak perlu signup atau registrasi

### 1.5 Success Metrics

- Sistem teruptime 99.5% (Netlify + Render.com standard)
- Load time halaman publik < 2 detik (SG region Supabase)
- Absensi 500+ jamaah selesai dalam < 10 menit
- Zero data loss (backup PostgreSQL Supabase)

---

## 2. USER ROLES & DASHBOARD STRUCTURE

### 2.1 User Role: Admin

**Definisi:** Semua pengurus/petugas ormas yang dapat login dan mengelola sistem

**Permissions:**
- ✅ Login ke Admin Dashboard
- ✅ Create, Read, Update, Delete Events (jadwal)
- ✅ Create, Read, Update, Delete Categories
- ✅ Create, Read, Update, Delete Jamaah
- ✅ Input absensi untuk event
- ✅ Lihat audit trail dan history
- ✅ Export laporan ke Excel/PDF
- ✅ **Special Permission:** Manage admin accounts (tambah/edit/hapus akun admin lain)

**Tipe Admin dalam sistem (internal classification):**
- **Admin Inti (Ketua/Koordinator)** → Dapat manage akun admin lain
- **Admin Biasa (Petugas Absensi/Sekretaris)** → Fokus input data

*Note: Keduanya login dengan satu role "Admin", tapi privilege untuk manage akun diberikan selektif*

### 2.2 User Role: Jamaah (Public)

**Definisi:** Anggota komunitas pengajian

**Permissions:**
- ✅ Akses Portal Publik (tanpa login)
- ✅ Lihat jadwal event terdekat
- ✅ Lihat statistik kehadiran per kategori
- ❌ Tidak bisa input apa-apa
- ❌ Tidak bisa melihat nama jamaah (sesuai pengaturan admin)

---

## 2.3 TWO SEPARATE DASHBOARDS

### Dashboard #1: PUBLIC DASHBOARD (untuk Jamaah)

**URL:** `https://siap.netlify.app/` (home page)

**Akses:** Gratis, tanpa login, bisa diakses siapa saja

**Tampilan:**
```
┌─────────────────────────────────────────────────┐
│         SISTEM INFORMASI PENGAJIAN (SIAP)      │
│                                                  │
│  🏠 Beranda  |  📅 Jadwal  |  📊 Statistik     │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  📌 JADWAL TERDEKAT                              │
│  ┌──────────────────────────────────────────┐  │
│  │ Kajian Umum - Jumat, 5 Oktober 19:00     │  │
│  │ Tema: Fiqih Ibadah                       │  │
│  │ [Lihat Detail]                           │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  📊 STATISTIK KEHADIRAN (Acara Terakhir)       │
│  Kategori Ibu-ibu: Hadir 25 | Izin 3          │
│  Kategori Remaja: Hadir 15 | Alpa 2           │
│  [Lebih Detail...]                             │
│                                                  │
│  📰 BERITA & PENGUMUMAN                         │
│  - Jadwal perubahan minggu depan                │
│  - Pengajian khusus muda mudi Sabtu             │
│                                                  │
├─────────────────────────────────────────────────┤
│ © 2026 Ormas Pengajian | Contact: 081234567890 │
└─────────────────────────────────────────────────┘
```

**Features:**
- Tampilkan 5 event terdekat (yang is_published = true)
- Statistik kehadiran per kategori
- Visibility control: Tampilkan nama atau hanya angka (sesuai pengaturan admin)
- Responsive (mobile-friendly)
- Caching 60 detik

---

### Dashboard #2: ADMIN DASHBOARD (untuk Admin/Pengurus)

**URL:** `https://siap.netlify.app/login` → kemudian `/admin`

**Akses:** Login dengan username & password (untuk Admin saja)

**Tampilan:**
```
┌──────────────────────────────────────────────────────┐
│  ADMIN PANEL - SIAP                    👤 Budi Asli│
│                                        [Logout]      │
├─────────────┬──────────────────────────────────────┤
│             │                                        │
│  📅 Events  │  📊 Dashboard Overview                │
│  👥 Jamaah  │  ┌───────────────────────────────┐   │
│  🏷️  Category│  │ Total Jamaah: 320             │   │
│  ✅ Absensi │  │ Total Event: 45               │   │
│  📈 Laporan │  │ Kehadiran Rate: 85%           │   │
│  🔑 Kelola  │  │ Admin Login: Budi, Ani, Deni  │   │
│     Admin   │  └───────────────────────────────┘   │
│  📋 Audit   │                                        │
│     Trail   │  📅 UPCOMING EVENTS                   │
│             │  - Jumat: Kajian Umum (19:00)        │
│             │  - Sabtu: Khusus Muda Mudi (18:00)   │
│             │  [+ Tambah Event Baru]                │
│             │                                        │
│             │  ⏰ EVENT HARI INI                    │
│             │  ✅ Kajian Umum (sedang berlangsung) │
│             │  [Isi Absensi]  [Lihat Detail]      │
│             │                                        │
└─────────────┴──────────────────────────────────────┘
```

**Features:**
- Sidebar navigation untuk akses cepat ke semua module
- Overview dashboard (statistik real-time)
- Manage Events (CRUD)
- Manage Jamaah dengan kategori (CRUD + Bulk Import)
- Smart Attendance System (Filter + Live Search)
- Analytics & Reporting (Grafik, Export Excel)
- Audit Log Viewer
- Manage Admin (hanya untuk Admin Inti)
- Visibility control untuk public data

---

## 3. REQUIREMENTS

### 3.1 Functional Requirements

#### Authentication & Authorization (FR-AUTH)

| Code | Requirement |
|------|-------------|
| FR-AUTH-001 | Admin dapat login dengan Username + Password |
| FR-AUTH-002 | Admin dengan privilege "Kelola Admin" dapat menambah/edit/hapus akun admin lain |
| FR-AUTH-003 | Sistem menggunakan JWT (JSON Web Token) untuk session management |
| FR-AUTH-004 | Timeout session setelah 2 jam inaktif |
| FR-AUTH-005 | Password minimal 8 karakter dengan kombinasi huruf + angka |
| FR-AUTH-006 | Jamaah akses Portal Publik tanpa perlu login (gratis) |
| FR-AUTH-007 | Logout admin menghapus JWT token dari local storage |

#### Event Management (FR-EVENT)

| Code | Requirement |
|------|-------------|
| FR-EVENT-001 | Admin dapat membuat event dengan field: Tema, Tanggal, Waktu, Deskripsi |
| FR-EVENT-002 | Admin dapat memilih Target Kategori (atau "Umum" jika kosong) |
| FR-EVENT-003 | Admin dapat mengatur visibility toggles: is_published, show_attendees, show_statistics |
| FR-EVENT-004 | Admin dapat mengubah tanggal event, sistem otomatis update status jadi "Jadwal Diubah" |
| FR-EVENT-005 | Sistem auto-generate WhatsApp message template dari event |
| FR-EVENT-006 | Admin dapat menghapus event (soft delete dengan flag deleted_at) |
| FR-EVENT-007 | Event CRUD tercatat di audit trail (siapa, kapan, apa yang diubah) |

#### Visibility Control (FR-VISIBILITY) ⭐ NEW

| Code | Requirement |
|------|-------------|
| FR-VISIBILITY-001 | Admin dapat toggle `is_published` untuk menampilkan/menyembunyikan event dari public dashboard |
| FR-VISIBILITY-002 | Admin dapat toggle `show_attendees` untuk menampilkan/menyembunyikan daftar nama jamaah di public |
| FR-VISIBILITY-003 | Admin dapat toggle `show_statistics` untuk menampilkan/menyembunyikan statistik kehadiran di public |
| FR-VISIBILITY-004 | Jika `show_attendees=false`, daftar nama disembunyikan tapi statistik tetap tampil (jika show_statistics=true) |
| FR-VISIBILITY-005 | Jika `show_statistics=false`, angka kehadiran per kategori tidak ditampilkan di public |
| FR-VISIBILITY-006 | Perubahan visibility settings berlaku IMMEDIATE (real-time) di public dashboard tanpa perlu refresh |
| FR-VISIBILITY-007 | Minimal 1 toggle dari (show_attendees, show_statistics) harus true jika is_published=true |
| FR-VISIBILITY-008 | Backend hanya send data sesuai visibility settings (tidak kirim data yang disembunyikan) |

#### Category & Jamaah Management (FR-JAMAAH)

| Code | Requirement |
|------|-------------|
| FR-JAMAAH-001 | Admin dapat membuat kategori baru (Ibu-ibi, Remaja, Senior, Pengurus, dll) |
| FR-JAMAAH-002 | Admin dapat menambah jamaah dengan field: Nama, No WA, Jenis Kelamin (L/P), Kategori (multi-select) |
| FR-JAMAAH-003 | Satu jamaah bisa memiliki banyak kategori (relasi Many-to-Many) |
| FR-JAMAAH-004 | Admin dapat mengedit data jamaah |
| FR-JAMAAH-005 | Admin dapat menghapus jamaah (soft delete dengan flag deleted_at) |
| FR-JAMAAH-006 | Admin dapat bulk import jamaah via file CSV/Excel dengan validasi |
| FR-JAMAAH-007 | Kategori baru otomatis tersedia untuk di-assign ke jamaah |

#### Smart Attendance System (FR-ATTENDANCE)

| Code | Requirement |
|------|-------------|
| FR-ATTENDANCE-001 | Admin membuka halaman "Isi Absensi" → sistem otomatis menampilkan event hari itu |
| FR-ATTENDANCE-002 | Saat memilih event, sistem auto-filter jamaah berdasarkan target category event |
| FR-ATTENDANCE-003 | Tabel absensi memiliki Tab filter [Laki-laki] [Perempuan] (dua admin bisa sekaligus) |
| FR-ATTENDANCE-004 | Terdapat Live Search input untuk mencari nama jamaah (real-time, tanpa reload) |
| FR-ATTENDANCE-005 | Admin dapat klik status kehadiran: Hadir, Ngaji Daring, Izin, Sakit, Alpa |
| FR-ATTENDANCE-006 | Auto-save draft ke local storage (jika sinyal putus, data tidak hilang) |
| FR-ATTENDANCE-007 | Sistem mencatat audit trail: siapa (Admin ID) yang input absensi, jam berapa |
| FR-ATTENDANCE-008 | Validasi: 1 jamaah hanya bisa 1x absen per event (constraint UNIQUE) |

#### Public Dashboard (FR-PUBLIC)

| Code | Requirement |
|------|-------------|
| FR-PUBLIC-001 | Halaman publik menampilkan jadwal event terdekat (yang is_published = true) |
| FR-PUBLIC-002 | Menampilkan statistik kehadiran acara sebelumnya, breakdown per kategori (jika show_statistics = true) |
| FR-PUBLIC-003 | Jika event.show_attendees = true, tampilkan daftar nama jamaah yang hadir lengkap |
| FR-PUBLIC-004 | Jika event.show_attendees = false, sembunyikan nama jamaah, tampilkan pesan "Daftar hadir disembunyikan" |
| FR-PUBLIC-005 | Statistik tetap tampil per kategori MESKI nama disembunyikan (jika show_statistics = true) |
| FR-PUBLIC-006 | Jika show_statistics = false, sembunyikan angka statistik kehadiran |
| FR-PUBLIC-007 | Halaman publik responsive dan bisa diakses dari HP/tablet |
| FR-PUBLIC-008 | Jamaah dapat membuka detail event untuk melihat informasi lengkap (sesuai visibility settings) |
| FR-PUBLIC-009 | Backend hanya mengirimkan data yang sesuai visibility settings (security: jangan send hidden data) |

### 3.2 Non-Functional Requirements

#### Performance (NFR-PERF)

| Code | Requirement |
|------|-------------|
| NFR-PERF-001 | Load time halaman publik maksimal 2 detik |
| NFR-PERF-002 | Absensi 500+ jamaah maksimal 10 menit selesai |
| NFR-PERF-003 | API response time < 500ms untuk 95th percentile |
| NFR-PERF-004 | Frontend menggunakan caching (React Query) untuk menghindari duplicate request |

#### Reliability (NFR-RELIAB)

| Code | Requirement |
|------|-------------|
| NFR-RELIAB-001 | Sistem teruptime 99.5% per bulan |
| NFR-RELIAB-002 | Database backup otomatis (Supabase daily backup) |
| NFR-RELIAB-003 | Offline tolerance: draft absensi auto-save ke local storage |

#### Security (NFR-SEC)

| Code | Requirement |
|------|-------------|
| NFR-SEC-001 | Password hash menggunakan bcrypt (salt rounds: 10) |
| NFR-SEC-002 | API endpoint menggunakan JWT auth (Bearer token) |
| NFR-SEC-003 | HTTPS enforced di semua endpoint |
| NFR-SEC-004 | SQL Injection prevention: gunakan Prisma ORM (parameterized query) |
| NFR-SEC-005 | CORS hanya allow origin Netlify domain |

---

## 4. CORE FEATURES

### 4.1 Feature: Event Management

**Description:** Admin dapat membuat, mengubah, menghapus jadwal pengajian dengan kontrol visibility lengkap.

**User Story:**
```
AS: Admin Pengurus
WANT TO: Membuat jadwal pengajian baru dengan target kategori spesifik
SO THAT: Pengajian terstruktur dan jamaah bisa tahu jadwalnya
```

**Acceptance Criteria:**
- Form input: Tema, Tanggal, Waktu, Deskripsi
- Dropdown untuk pilih Target Kategori (multi-select) atau "Umum"
- Toggle: `is_published`, `show_attendees`
- Tombol: Save, Cancel
- Setelah save, event muncul di halaman publik (jika is_published = true)
- Validasi: Tanggal tidak boleh masa lalu, tema tidak boleh kosong

---

### 4.2 Feature: Smart Attendance System

**Description:** Admin input absensi jamaah dengan UI yang cepat, mudah, dan anti-error.

**User Story:**
```
AS: Admin (Petugas Absensi)
WANT TO: Input absensi jamaah untuk event hari ini dengan cepat dan tanpa salah
SO THAT: Tidak ada yang terlewat dan proses absensi lancar
```

**Acceptance Criteria:**
- Halaman attendance hanya tampil acara hari ini (auto-load)
- Jika acara target "Muda Mudi", hanya tampil jamaah muda mudi
- Tab [Laki-laki] [Perempuan] untuk filter gender (dua admin bisa sekaligus)
- Live search input untuk cari nama (real-time, onChange)
- Tabel dengan kolom: Nama, Status (Hadir/Daring/Izin/Sakit/Alpa)
- Status diubah dengan klik tombol atau radio button
- Tombol "Simpan" menyimpan semua ke database
- Auto-save draft ke local storage setiap 10 detik
- Toast notifikasi "Absensi tersimpan" setelah save sukses

---

### 4.3 Feature: Public Dashboard

**Description:** Portal informasi gratis untuk jamaah melihat jadwal dan statistik kehadiran.

**User Story:**
```
AS: Jamaah
WANT TO: Melihat jadwal pengajian terdekat tanpa perlu login
SO THAT: Saya bisa rencana waktu dengan baik
```

**Acceptance Criteria:**
- Halaman utama menampilkan 5 event terdekat (yang is_published = true)
- Menampilkan statistik kehadiran acara sebelumnya per kategori
- Jika event.show_attendees = true, tampilkan tabel daftar nama + status
- Jika event.show_attendees = false, hanya tampilkan "Hadir: X orang, Izin: Y orang"
- Responsive design (mobile-first)
- Caching 60 detik di backend untuk performa

---

### 4.4 Feature: Category & Jamaah Management

**Description:** Master data management untuk kategori dan anggota komunitas.

**User Story:**
```
AS: Admin
WANT TO: Menambah kategori baru dan assign jamaah ke kategori
SO THAT: Data terorganisir dan absensi bisa difilter dengan tepat
```

**Acceptance Criteria:**
- CRUD kategori: Create, Read, Update, Delete
- Form tambah jamaah: Nama, No WA, Jenis Kelamin, multi-select kategori
- Bulk import CSV: upload file → parsing → validasi → insert
- Tabel daftar jamaah dengan action: Edit, Delete
- Tabel daftar kategori dengan action: Edit, Delete

---

### 4.5 Feature: Analytics & Reporting

**Description:** Dashboard analitik untuk mengukur efektivitas pengajian.

**User Story:**
```
AS: Admin Inti
WANT TO: Melihat tren kehadiran per kategori dan export laporan
SO THAT: Saya bisa evaluasi efektivitas pengajian
```

**Acceptance Criteria:**
- Grafik tren kehadiran per kategori per bulan
- Admin dapat export rekap absensi acara tertentu ke Excel/PDF
- Admin dapat melihat history absensi (siapa yang input, jam berapa)
- Filter report berdasarkan tanggal, kategori, status kehadiran
- Audit log viewer untuk melihat semua aktivitas admin

---

### 4.6 Feature: Visibility Control (Admin Control Privacy Data)

**Description:** Admin dapat mengatur apakah daftar nama jamaah yang hadir ditampilkan atau disembunyikan di Portal Publik, sementara statistik tetap ditampilkan.

**User Story:**
```
AS: Admin Inti
WANT TO: Mengontrol apakah nama-nama jamaah yang hadir ditampilkan di public dashboard
SO THAT: Saya bisa menjaga privasi jamaah sambil tetap menampilkan statistik kehadiran
```

**Acceptance Criteria:**

**Saat membuat/edit Event, Admin dapat mengatur 3 toggle:**

1. **is_published** - Tampilkan acara di public dashboard atau tidak?
   - ✅ Yes (Public dapat melihat jadwal & statistik)
   - ❌ No (Hanya admin yang bisa lihat di admin panel)

2. **show_attendees** - Tampilkan daftar nama jamaah yang hadir atau tidak?
   - ✅ Yes (Jamaah publik bisa lihat siapa saja yang hadir)
   - ❌ No (Sembunyikan nama, hanya tampil "Hadir: 50 orang")

3. **show_statistics** - Tampilkan statistik kehadiran per kategori atau tidak?
   - ✅ Yes (Tampilkan "Kategori Ibu-ibi: Hadir 25, Izin 3")
   - ❌ No (Sembunyikan angka-angka statistik)

**Behavior di Public Dashboard:**

**Skenario A: is_published=true, show_attendees=true, show_statistics=true**
```
📌 Kajian Umum - Jumat, 5 Oktober 19:00
Tema: Fiqih Ibadah

📋 DAFTAR HADIR:
┌─────────────────────────┐
│ Nama            Status  │
├─────────────────────────┤
│ Ibu Budi        Hadir   │
│ Bapak Ahmad     Hadir   │
│ Siti Nurhaliza  Izin    │
└─────────────────────────┘

📊 STATISTIK KEHADIRAN:
Kategori Ibu-ibi: Hadir 25 | Izin 3
Kategori Bapak-bapak: Hadir 40 | Sakit 2
Kategori Remaja: Hadir 15 | Alpa 1
```

**Skenario B: is_published=true, show_attendees=false, show_statistics=true**
```
📌 Kajian Khusus Muda Mudi - Sabtu, 6 Oktober 18:00
Tema: Bina Keluarga Sakinah

Daftar hadir disembunyikan oleh pengurus.

📊 STATISTIK KEHADIRAN:
Kategori Muda Mudi: Hadir 30 | Izin 2
Kategori Remaja: Hadir 8 | Alpa 1

Total Peserta: 38 orang
```

**Skenario C: is_published=true, show_attendees=false, show_statistics=false**
```
📌 Rapat Pengurus - Minggu, 7 Oktober 14:00
Tema: Perencanaan Pengajian Bulan Depan

Informasi acara ini bersifat internal.
Statistik tidak ditampilkan untuk publik.
```

---

**Validasi:**
- Minimal 1 dari (show_attendees, show_statistics) harus true jika is_published=true
- Jika is_published=false, toggle lainnya tidak berpengaruh
- Perubahan visibility berlaku IMMEDIATE (real-time di public dashboard)

**Database Implementation:**
```sql
-- Di tabel Event:
- is_published BOOLEAN (default: true)
- show_attendees BOOLEAN (default: false)
- show_statistics BOOLEAN (default: true)
```

**Backend Logic:**
```
GET /events (public endpoint):
  if event.is_published = false
    → jangan include event ini di response
  
  if event.show_attendees = false
    → jangan send array attendance data ke frontend
  
  if event.show_statistics = false
    → jangan send statistik aggregation ke frontend
```

**Frontend Logic:**
```javascript
{event.show_attendees ? (
  <AttendeeTable attendees={event.attendances} />
) : (
  <p>Daftar hadir disembunyikan oleh pengurus.</p>
)}

{event.show_statistics ? (
  <StatisticsChart data={event.stats} />
) : (
  <p>Statistik tidak ditampilkan untuk publik.</p>
)}
```

---

## 5. USER FLOW

### 5.1 Login & Access Admin Dashboard

```
Admin membuka website
    ↓
Klik "Masuk" atau akses /admin
    ↓
Form Login (Username + Password)
    ↓
Backend validasi:
  - Cek username di tabel Admin
  - Hash password & compare
  - Jika valid: generate JWT token (2 hour expiry)
    ↓
Token di-store di localStorage
    ↓
Redirect ke Admin Dashboard
    ↓
Admin Dashboard load dengan data overview
```

### 5.2 Create Event Flow

```
Admin buka "Events" menu di sidebar
    ↓
Klik "+ Tambah Event"
    ↓
Form terbuka dengan field:
  - Tema Pengajian
  - Tanggal & Waktu
  - Deskripsi
  - Target Kategori (multi-select)
  - Toggles: is_published, show_attendees
    ↓
Admin isi form → klik "Save"
    ↓
Backend validasi:
  - Tema tidak kosong
  - Tanggal >= hari ini
  - Kategori valid (jika ada)
    ↓
Insert ke tabel Event + EventCategory
    ↓
Sistem catat audit: siapa (Admin ID), kapan, action "CREATE"
    ↓
Response: "Event berhasil dibuat"
    ↓
Event muncul di halaman publik (jika is_published = true)
    ↓
Tombol "Share to WA" → generate template text → copy to clipboard
```

### 5.3 Input Absensi (Hari H Event)

```
Admin buka "Absensi" menu
    ↓
Sistem auto-load event hari ini:
  - Jika 1 event → langsung buka halaman absensi
  - Jika >1 event → tampil dropdown pilih event
    ↓
Admin pilih event
    ↓
Sistem auto-filter jamaah by event.target_categories
    ↓
Halaman absensi tampil dengan:
  - Tab [Laki-laki] [Perempuan]
  - Search bar
  - Tabel nama + status button
    ↓
Admin klik tab [Laki-laki] atau [Perempuan]
    ↓
Tabel di-filter hanya tampil jamaah sesuai pilihan
    ↓
Dua admin bisa sekaligus (dari device berbeda):
  - Admin A: Tab [Laki-laki]
  - Admin B: Tab [Perempuan]
    ↓
Setiap klik status, frontend auto-save draft ke local storage
    ↓
Setelah selesai, admin klik "Simpan Absensi"
    ↓
Backend validasi & insert ke tabel Attendance:
  - Cek constraint UNIQUE (jamaah_id, event_id)
  - Catat recorded_by = current admin ID
    ↓
Jika sukses → toast "Absensi tersimpan"
    ↓
Halaman attendance redirect ke overview
```

### 5.4 Jamaah Melihat Portal Publik

```
Jamaah (atau siapa saja) buka website
    ↓
Landing page "Portal Publik SIAP" (tanpa login)
    ↓
Halaman load dengan:
  - Fetch event (is_published = true, limit 5)
  - Fetch attendance & hitung statistik per kategori
  - Cache 60 detik
    ↓
Render halaman:
  - Section "Jadwal Terdekat": Event cards
  - Section "Statistik Kehadiran": Per kategori
    ↓
Jamaah dapat klik event untuk lihat detail:
  - Info lengkap (tema, waktu, deskripsi)
  - Jika show_attendees = true:
      → Tampil tabel nama + status kehadiran
    - Jika show_attendees = false:
      → Tampil "Acara ini dihadiri X jamaah"
    - Statistik per kategori TETAP tampil (tidak disembunyikan)
    ↓
Tidak ada action lain (read-only)
    ↓
END: Jamaah paham jadwal pengajian & statistik kehadiran
```

---

## 6. ARCHITECTURE

### 6.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                             │
│                   (React Vite + Tailwind CSS)                   │
│                     Hosted: Netlify Free                        │
│                                                                 │
│  ┌──────────────────────┐      ┌──────────────────────────┐   │
│  │ PUBLIC DASHBOARD     │      │ ADMIN DASHBOARD          │   │
│  │ (untuk Jamaah)       │      │ (untuk Admin/Pengurus)   │   │
│  │                      │      │                          │   │
│  │ - Jadwal terdekat    │      │ - Dashboard Overview     │   │
│  │ - Statistik          │      │ - Event CRUD             │   │
│  │ - Detail event       │      │ - Smart Attendance       │   │
│  │ - No login required  │      │ - Jamaah CRUD            │   │
│  │                      │      │ - Analytics & Reports    │   │
│  │                      │      │ - Manage Admin           │   │
│  │                      │      │ - Audit Logs             │   │
│  └──────────────────────┘      └──────────────────────────┘   │
│           │                              │                      │
│           │                              │                      │
│           └──────────────────┬───────────┘                      │
│                              │                                  │
│                   ┌──────────▼──────────┐                      │
│                   │  State Management   │                      │
│                   │  (Zustand + React   │                      │
│                   │   Query)            │                      │
│                   └────────┬────────────┘                      │
│                            │                                   │
└────────────────────────────┼───────────────────────────────────┘
                             │
                             │ HTTPS / REST API
                             │
┌────────────────────────────▼───────────────────────────────────┐
│                     BACKEND LAYER                              │
│            (Node.js + Express.js)                              │
│          Hosted: Render.com (Free Web Service)                │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Express Server                                         │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │  API Routes:                                    │  │ │
│  │  │  - POST /auth/login                             │  │ │
│  │  │  - POST /auth/logout                            │  │ │
│  │  │  - GET  /events (public)                        │  │ │
│  │  │  - POST /events (admin only)                    │  │ │
│  │  │  - GET  /attendance/:event_id                   │  │ │
│  │  │  - POST /attendance/bulk                        │  │ │
│  │  │  - POST /jamaah/import (CSV upload)             │  │ │
│  │  │  - GET  /statistics/:event_id                   │  │ │
│  │  │  - GET  /audit-logs                             │  │ │
│  │  │  - GET  /export/excel/:event_id                 │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │  Middleware:                                    │  │ │
│  │  │  - JWT Auth Verification                       │  │ │
│  │  │  - Role-based Access Control (RBAC)            │  │ │
│  │  │  - Request Validation                          │  │ │
│  │  │  - Error Handling                              │  │ │
│  │  │  - CORS                                        │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │  Business Logic:                                │  │ │
│  │  │  - Event management service                     │  │ │
│  │  │  - Attendance calculation service               │  │ │
│  │  │  - CSV parsing & bulk import                    │  │ │
│  │  │  - Statistics aggregation                       │  │ │
│  │  │  - Audit logging                                │  │ │
│  │  │  - Excel export                                 │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │  ORM Layer (Prisma):                            │  │ │
│  │  │  - Query builder                                │  │ │
│  │  │  - Type-safe database operations                │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             │ PostgreSQL Connection
                             │
┌────────────────────────────▼───────────────────────────────────┐
│                    DATABASE LAYER                              │
│          (PostgreSQL via Supabase, Region: Singapore)          │
│                                                                │
│  Tables:                                                       │
│  - admin (pengurus yang bisa login)                           │
│  - category (master label)                                    │
│  - jamaah (anggota komunitas)                                 │
│  - jamaah_category (relasi M2M)                               │
│  - event (jadwal pengajian)                                   │
│  - event_category (target audience)                           │
│  - attendance (rekam kehadiran)                               │
│                                                                │
│  Backup:                                                       │
│  - Daily automatic backup (Supabase)                          │
│  - Point-in-time recovery (30 hari)                           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 6.2 Frontend Project Structure

```
src/
├── pages/
│   ├── PublicDashboard.jsx           (Landing page - Jamaah)
│   ├── PublicEventDetail.jsx          (Detail event - Jamaah)
│   ├── LoginPage.jsx                  (Login for Admin)
│   ├── AdminDashboard.jsx             (Main admin panel)
│   ├── EventManagement.jsx            (CRUD events)
│   ├── AttendanceForm.jsx             (Smart attendance)
│   ├── JamaahManagement.jsx           (CRUD jamaah)
│   ├── CategoryManagement.jsx         (CRUD kategori)
│   ├── Analytics.jsx                  (Laporan & grafik)
│   └── AuditLogs.jsx                  (History aktivitas)
│
├── components/
│   ├── common/
│   │   ├── PublicHeader.jsx           (untuk public dashboard)
│   │   ├── AdminHeader.jsx            (untuk admin dashboard)
│   │   ├── AdminSidebar.jsx           (navigasi admin)
│   │   ├── Footer.jsx
│   │   └── Loading.jsx
│   │
│   ├── form/
│   │   ├── EventForm.jsx
│   │   ├── AttendanceTable.jsx
│   │   ├── JamaahForm.jsx
│   │   ├── BulkImportModal.jsx
│   │   ├── SearchInput.jsx
│   │   └── GenderTabs.jsx
│   │
│   ├── display/
│   │   ├── EventCard.jsx
│   │   ├── StatisticsChart.jsx
│   │   ├── AttendeeList.jsx
│   │   └── HistoryTable.jsx
│   │
│   └── ui/
│       ├── Button.jsx
│       ├── Modal.jsx
│       ├── Tab.jsx
│       ├── Toggle.jsx
│       ├── DatePicker.jsx
│       ├── MultiSelect.jsx
│       └── Toast.jsx
│
├── hooks/
│   ├── useAuth.js                    (Auth context)
│   ├── useEvents.js                  (Event API calls)
│   ├── useAttendance.js              (Attendance API calls)
│   ├── useJamaah.js                  (Jamaah API calls)
│   └── useLocalStorage.js            (Draft save)
│
├── services/
│   ├── api.js                        (Axios instance)
│   ├── authService.js                (Login/logout)
│   ├── eventService.js               (Event API calls)
│   ├── attendanceService.js          (Attendance API calls)
│   └── reportService.js              (Export/analytics)
│
├── store/
│   └── store.js                      (Zustand global state)
│
├── context/
│   └── AuthContext.jsx               (Auth provider)
│
├── styles/
│   ├── globals.css                   (Tailwind + custom)
│   ├── public-dashboard.css          (Public portal styles)
│   └── admin-dashboard.css           (Admin panel styles)
│
├── App.jsx                           (Routing: public vs admin)
└── main.jsx                          (Entry point Vite)
```

### 6.3 Backend Project Structure

```
src/
├── routes/
│   ├── auth.routes.js                (Login, logout)
│   ├── events.routes.js              (CRUD events)
│   ├── attendance.routes.js          (CRUD attendance)
│   ├── jamaah.routes.js              (CRUD jamaah + import)
│   ├── categories.routes.js          (CRUD kategori)
│   ├── admin.routes.js               (Manage admin accounts)
│   ├── statistics.routes.js          (Analytics)
│   ├── public.routes.js              (Public endpoints - no auth)
│   └── export.routes.js              (Excel/PDF export)
│
├── controllers/
│   ├── authController.js
│   ├── eventController.js
│   ├── attendanceController.js
│   ├── jamaahController.js
│   ├── categoryController.js
│   ├── adminController.js
│   ├── statisticsController.js
│   └── exportController.js
│
├── services/
│   ├── authService.js                (Business logic: login)
│   ├── eventService.js               (Business logic: events)
│   ├── attendanceService.js          (Business logic: absensi)
│   ├── jamaahService.js              (Business logic: jamaah)
│   ├── statisticsService.js          (Business logic: hitung statistik)
│   ├── csvService.js                 (Business logic: parse CSV)
│   ├── excelService.js               (Business logic: generate Excel)
│   └── auditService.js               (Business logic: log aktivitas)
│
├── middleware/
│   ├── authMiddleware.js             (JWT verify)
│   ├── roleMiddleware.js             (RBAC check - optional)
│   ├── errorHandler.js               (Global error handling)
│   ├── validationMiddleware.js       (Request validation)
│   ├── corsMiddleware.js             (CORS config)
│   └── loggerMiddleware.js           (Request logging)
│
├── config/
│   ├── database.js                   (Prisma client)
│   ├── env.js                        (Environment variables)
│   └── jwt.js                        (JWT config)
│
├── utils/
│   ├── jwt.js                        (Generate & verify JWT)
│   ├── bcrypt.js                     (Hash & compare password)
│   ├── validators.js                 (Input validation)
│   ├── errors.js                     (Custom error classes)
│   └── logger.js                     (Winston logger)
│
├── constants/
│   ├── status.js                     (HADIR, DARING, IZIN, SAKIT, ALPA)
│   └── messages.js                   (API response messages)
│
└── app.js                            (Express initialization)

prisma/
├── schema.prisma                     (Database schema)
└── migrations/                       (Database migrations)

.env.example
package.json
server.js                             (Entry point)
```

---

## 7. SEQUENCE DIAGRAM

### 7.1 Admin Login & Access Dashboard

```
Admin           Browser         Backend         Database
  │               │               │               │
  │── Login ──────>│               │               │
  │                │               │               │
  │                │──POST /auth/login──>│         │
  │                │               │               │
  │                │               │──SELECT * FROM admin WHERE username──>│
  │                │               │               │
  │                │               │<──Admin record──┤
  │                │               │               │
  │                │               │ Verify bcrypt │
  │                │               │               │
  │                │               │ Generate JWT  │
  │                │               │               │
  │                │<──JWT token──────│               │
  │                │               │               │
  │<──Store JWT in localStorage──┤               │
  │                │               │               │
  │── Redirect /admin ────>│       │               │
  │                │       │       │               │
  │                │       │──GET /admin (with JWT)──>│
  │                │       │       │               │
  │                │       │──SELECT COUNT(*) FROM events──>│
  │                │       │       │               │
  │                │       │<──Count data──────┤
  │                │       │       │               │
  │                │<──200 + Admin Dashboard──┤       │
  │                │       │       │               │
  │<──Display Admin Dashboard──┤       │               │
  │                │       │       │               │
  ✓ Admin Logged In & Dashboard Ready
```

### 7.2 Create Event with Target Category

```
Admin           Browser         Backend         Database
  │               │               │               │
  │── Fill Form ──>│               │               │
  │ (tema, date,   │               │               │
  │  target cat)   │               │               │
  │                │               │               │
  │── Click Save ──>│               │               │
  │                │               │               │
  │                │──POST /events (with JWT)──>│  │
  │                │               │               │
  │                │               │ Verify JWT    │
  │                │               │ Validate data │
  │                │               │               │
  │                │               │ Begin Transaction
  │                │               │               │
  │                │               │──INSERT INTO event──>│
  │                │               │               │
  │                │               │<──event_id: 42───┤
  │                │               │               │
  │                │               │──INSERT INTO event_category (42, cat_id)──>│
  │                │               │               │
  │                │               │<──Success──────┤
  │                │               │               │
  │                │               │ Commit Transaction
  │                │               │               │
  │                │               │ Log Audit: CREATE event by admin_id
  │                │               │               │
  │                │<──201 Created + Event──────┤
  │                │       + Share WA button    │
  │                │               │               │
  │<──Toast: "Event Created"──┤       │               │
  │                │               │               │
  ✓ Event saved, visible in public dashboard if is_published = true
```

### 7.3 Smart Attendance Input

```
Admin           Browser         Backend         Database
  │               │               │               │
  │── Click "Isi Absensi" ──>│               │
  │                │               │               │
  │                │──GET /attendance (today)──>│
  │                │               │               │
  │                │               │──SELECT * FROM event WHERE DATE(tanggal) = TODAY──>│
  │                │               │               │
  │                │               │<──Event data───┤
  │                │               │               │
  │                │               │──SELECT * FROM event_category WHERE event_id──>│
  │                │               │               │
  │                │               │<──Target categories──┤
  │                │               │               │
  │                │               │──SELECT * FROM jamaah WHERE IN (select jamaah_id FROM jamaah_category WHERE category_id IN [...])──>│
  │                │               │               │
  │                │               │<──Jamaah list───┤
  │                │               │               │
  │<──Display Attendance Table──┤               │
  │ (with gender tabs)         │               │
  │                │               │               │
  │── Click [Laki-laki] tab ──>│               │
  │                │ (local filter by jenis_kelamin = 'L')
  │                │               │               │
  │── Click "Hadir" for Jamaah X ──>│       │               │
  │                │               │               │
  │                │ Auto-save draft to localStorage
  │                │               │               │
  │── (repeat for all) ──>│       │               │
  │                │               │               │
  │── Click "Simpan Absensi" ──>│               │
  │                │               │               │
  │                │──POST /attendance/bulk (with JWT)──>│
  │                │               │               │
  │                │               │ Validate each row
  │                │               │ Check UNIQUE (jamaah_id, event_id)
  │                │               │               │
  │                │               │──INSERT INTO attendance (multiple rows)──>│
  │                │               │               │
  │                │               │<──Success──────┤
  │                │               │               │
  │                │               │ Log Audit: recorded_by = admin_id
  │                │               │               │
  │                │<──200 OK + Success message──┤
  │                │               │               │
  │<──Toast: "Absensi Tersimpan"──┤       │               │
  │                │               │               │
  ✓ Attendance recorded, statistics in public dashboard update
```

### 7.4 Public Dashboard Load

```
Jamaah          Browser         Backend         Database
  │               │               │               │
  │── Open website ──>│           │               │
  │                │               │               │
  │                │──GET / (no JWT)──>         │
  │                │               │               │
  │                │               │ Check cache (60 detik)
  │                │               │ If not cached, fetch fresh
  │                │               │               │
  │                │               │──SELECT * FROM event WHERE is_published = true ORDER BY tanggal LIMIT 5──>│
  │                │               │               │
  │                │               │<──Event list────┤
  │                │               │               │
  │                │               │ For each event: SELECT category_id, status, COUNT(*) FROM attendance JOIN jamaah_category GROUP BY category_id──>│
  │                │               │               │
  │                │               │<──Stats data────┤
  │                │               │               │
  │                │               │ Cache for 60 seconds
  │                │               │               │
  │                │<──200 OK + Events + Stats──┤
  │                │               │               │
  │<──Render Public Dashboard──┤       │               │
  │ - Event cards              │       │               │
  │ - Statistics per kategori  │       │               │
  │ - If show_attendees=true:  │       │               │
  │     → Tampil nama jamaah   │       │               │
  │ - If show_attendees=false: │       │               │
  │     → Hanya tampil angka   │       │               │
  │                │               │               │
  │── Click event detail ──>│      │               │
  │                │               │               │
  │                │──GET /events/:id (no JWT)──>│
  │                │               │               │
  │                │               │──SELECT * + attendance + aggregation──>│
  │                │               │               │
  │                │               │<──Detailed event data──┤
  │                │               │               │
  │<──Display Event Detail Modal──┤       │               │
  │ (nama jamaah if show_attendees) │       │               │
  │                │               │               │
  ✓ Jamaah sees jadwal & statistik (no login needed)
```

---

## 8. DATABASE SCHEMA

### 8.1 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// 1. ADMIN (Pengurus yang bisa login)
// ============================================
model Admin {
  id                String       @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  nama              String       @db.VarChar(255)
  username          String       @unique @db.VarChar(50)
  passwordHash      String       @db.VarChar(255)
  canManageAdmin    Boolean      @default(false) // Privilege untuk manage akun admin lain
  isActive          Boolean      @default(true)
  lastLogin         DateTime?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  // Relasi
  eventsCreated     Event[]      @relation("EventCreator")
  absensiDicatat    Attendance[] @relation("AttendanceRecorder")

  @@index([username])
}

// ============================================
// 2. CATEGORY (Master Label)
// ============================================
model Category {
  id                Int           @id @default(autoincrement())
  nama_kategori     String        @unique @db.VarChar(100)
  deskripsi         String?       @db.Text
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  // Relasi
  jamaahs           JamaahCategory[]
  events            EventCategory[]

  @@index([nama_kategori])
}

// ============================================
// 3. JAMAAH (Anggota Komunitas)
// ============================================
model Jamaah {
  id                Int           @id @default(autoincrement())
  nama              String        @db.VarChar(255)
  no_whatsapp       String?       @db.VarChar(20)
  jenis_kelamin     String        @db.VarChar(1) // "L" atau "P"
  isActive          Boolean       @default(true)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  deletedAt         DateTime?

  // Relasi
  categories        JamaahCategory[]
  attendances       Attendance[]

  @@index([nama])
  @@index([jenis_kelamin])
  @@index([deletedAt])
}

// ============================================
// 4. JAMAAH_CATEGORY (Relasi M2M)
// ============================================
model JamaahCategory {
  jamaahId          Int
  categoryId        Int
  createdAt         DateTime      @default(now())

  jamaah            Jamaah        @relation(fields: [jamaahId], references: [id], onDelete: Cascade)
  category          Category      @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([jamaahId, categoryId])
  @@index([jamaahId])
  @@index([categoryId])
}

// ============================================
// 5. EVENT (Jadwal Pengajian)
// ============================================
model Event {
  id                Int           @id @default(autoincrement())
  tema              String        @db.VarChar(255)
  tanggal           DateTime
  deskripsi         String?       @db.Text
  
  // Visibility & Control
  is_published      Boolean       @default(true)
  show_attendees    Boolean       @default(false)
  
  // Audit Trail
  createdById       String        @db.Uuid
  updatedById       String?       @db.Uuid
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  deletedAt         DateTime?

  createdBy         Admin         @relation("EventCreator", fields: [createdById], references: [id])

  // Relasi
  targetCategories  EventCategory[]
  attendances       Attendance[]

  @@index([tanggal])
  @@index([is_published])
  @@index([createdById])
  @@index([deletedAt])
}

// ============================================
// 6. EVENT_CATEGORY (Target Audience)
// ============================================
model EventCategory {
  eventId           Int
  categoryId        Int
  createdAt         DateTime      @default(now())

  event             Event         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  category          Category      @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([eventId, categoryId])
  @@index([eventId])
  @@index([categoryId])
}

// ============================================
// 7. ATTENDANCE (Rekam Kehadiran)
// ============================================
model Attendance {
  id                Int           @id @default(autoincrement())
  status            String        @db.VarChar(20) // HADIR, DARING, IZIN, SAKIT, ALPA
  
  // Relasi
  jamaahId          Int
  eventId           Int
  recordedById      String        @db.Uuid
  
  // Audit
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  jamaah            Jamaah        @relation(fields: [jamaahId], references: [id], onDelete: Cascade)
  event             Event         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  recordedBy        Admin         @relation("AttendanceRecorder", fields: [recordedById], references: [id])

  @@unique([jamaahId, eventId]) // Constraint: 1 jamaah 1x absen per event
  @@index([eventId])
  @@index([jamaahId])
  @@index([recordedById])
  @@index([status])
}
```

### 8.2 Table Relationships

```
Admin (id: UUID)
├── eventsCreated: Event[]
└── absensiDicatat: Attendance[]

Category (id: Int)
├── jamaahs: JamaahCategory[]
└── events: EventCategory[]

Jamaah (id: Int)
├── categories: JamaahCategory[]
└── attendances: Attendance[]

JamaahCategory
├── jamaahId (FK)
└── categoryId (FK)

Event (id: Int)
├── createdBy (FK Admin)
├── targetCategories: EventCategory[]
└── attendances: Attendance[]

EventCategory
├── eventId (FK)
└── categoryId (FK)

Attendance (id: Int)
├── jamaahId (FK)
├── eventId (FK)
└── recordedBy (FK Admin)
```

---

## 9. TECH STACK

### 9.1 Frontend Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | React ^18.0.0 | UI library |
| Build Tool | Vite ^4.0.0 | Fast bundler |
| Styling | Tailwind CSS ^3.0.0 | Utility-first CSS |
| State Mgmt | Zustand ^4.0.0 | Global state |
| Data Fetch | React Query ^4.0.0 | Server state + caching |
| HTTP Client | Axios ^1.0.0 | API requests |
| Form Validation | React Hook Form + Zod | Form handling |
| Date Picker | react-datepicker | Date/time input |
| Charts | Chart.js + react-chartjs-2 | Statistics |
| File Upload | react-dropzone | CSV upload |
| Excel Export | exceljs | Generate Excel |
| CSV Parser | papaparse | CSV parsing |
| Notifications | Sonner | Toast notifications |
| Icons | Lucide React | SVG icons |
| Routing | React Router ^6.0.0 | Navigation |

### 9.2 Backend Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Node.js ^18.0.0 | JavaScript runtime |
| Framework | Express.js ^4.18.0 | Web framework |
| ORM | Prisma ^5.0.0 | Database access |
| Auth | JWT + bcrypt | Authentication |
| Validation | Zod / Joi | Input validation |
| File Upload | multer ^1.4.0 | Handle files |
| CSV Parsing | csv-parser + fast-csv | CSV processing |
| Excel Gen | exceljs ^4.0.0 | Excel files |
| Environment | dotenv ^16.0.0 | .env variables |
| Logging | Winston ^3.0.0 | Structured logging |
| Testing | Jest + Supertest | Unit & integration tests |
| Code Quality | ESLint + Prettier | Linting & formatting |

### 9.3 Database & Hosting

| Service | Component | Details |
|---------|-----------|---------|
| Netlify | Frontend | Free (Starter) - 100 GB/month |
| Render.com | Backend | Free (Web Service) - Auto-scale |
| Supabase | Database | PostgreSQL Region Singapore (500MB) |

---

## 10. DEVELOPMENT ROADMAP

### 10.1 Phase-by-Phase Timeline

**Total Estimasi: 2-3 minggu (1 developer fullstack)**

#### Phase 1: Project Setup (1-2 hari)
- Inisialisasi React Vite + Tailwind CSS
- Setup Node.js Express backend
- Konfigurasi Supabase PostgreSQL (Region SG)
- Setup environment variables (.env)
- Create GitHub repository

#### Phase 2: Database & Auth (2-3 hari)
- Jalankan Prisma migration ke Supabase
- Implementasi JWT authentication (login endpoint)
- Password hashing dengan bcrypt
- Logout endpoint & token cleanup
- Test login/logout flow

#### Phase 3: Core CRUD (3-4 hari)
- Event management (create, read, update, delete)
- Category management
- Jamaah management dengan multi-select kategori
- Admin account management (kelola admin lain)
- API error handling & validation

#### Phase 4: Smart Attendance (3-4 hari)
- Attendance CRUD endpoints
- Auto-filter logic (by event target categories)
- Gender tab filter (frontend)
- Live search functionality
- Auto-save draft ke local storage
- Bulk attendance update

#### Phase 5: Public Dashboard (2-3 hari)
- Public event listing endpoint (no auth)
- Statistics aggregation per kategori
- Visibility control logic
- Caching strategy (60 detik)
- Event detail page

#### Phase 6: Advanced Features (3-4 hari)
- CSV bulk import (parsing + validasi + insert)
- Excel export untuk laporan absensi
- Analytics dashboard (grafik & tren)
- Audit log viewer
- WhatsApp message generator

#### Phase 7: Testing & Deployment (2-3 hari)
- Unit tests (backend auth, services)
- Integration tests (API flows)
- Manual testing (semua user flows)
- Deploy frontend ke Netlify
- Deploy backend ke Render.com
- Production seeding & monitoring

### 10.2 Cost Analysis

| Item | Cost |
|------|------|
| Frontend Hosting (Netlify) | Rp 0/bulan |
| Backend Hosting (Render.com) | Rp 0/bulan |
| Database (Supabase) | Rp 0/bulan |
| **TOTAL** | **Rp 0/bulan** |

### 10.3 Scalability

- System dapat handle 1000+ concurrent users tanpa biaya tambahan
- Pagination built-in untuk data besar
- Caching strategy untuk reduce database load
- CDN global melalui Netlify

---

## 11. SECURITY & COMPLIANCE

### 11.1 Authentication

- JWT tokens dengan 2-hour expiration
- Password hashing: bcrypt (salt rounds: 10)
- Refresh token mechanism (opsional)
- API endpoints protected dengan JWT middleware

### 11.2 Data Protection

- HTTPS enforced (Netlify & Render.com auto-handle)
- CORS whitelist (frontend domain only)
- SQL Injection prevention (Prisma parameterized queries)
- XSS prevention (React auto-escape)
- CSRF protection (SPA state-based)

### 11.3 Privacy

- Soft deletes untuk audit trail
- Visibility toggles untuk kontrol data jamaah
- Daily automatic backup (Supabase)
- 30-day point-in-time recovery

---

## 12. GLOSSARY

| Term | Definition |
|------|-----------|
| **Jamaah** | Anggota komunitas pengajian |
| **Admin/Pengurus** | Petugas yang login & mengelola sistem |
| **Event/Acara** | Jadwal pengajian |
| **Category** | Label/tag untuk pengelompokan jamaah |
| **Attendance** | Rekam kehadiran jamaah pada event |
| **Target Category** | Kategori sasaran yang boleh diabsen di event |
| **Audit Trail** | Catatan lengkap siapa melakukan apa & kapan |
| **Public Dashboard** | Portal gratis untuk jamaah (no login) |
| **Admin Dashboard** | Panel lengkap untuk admin (login required) |
| **JWT** | JSON Web Token untuk authentication |
| **ORM** | Object Relational Mapping (Prisma) |
| **Soft Delete** | Tandai deleted_at tanpa remove dari DB |

---

## 13. KESIMPULAN

Dokumen PRD ini adalah blueprint lengkap untuk membangun **Sistem Informasi & Absensi Pengajian (SIAP)** dengan arsitektur modern dan aman.

**Dengan mengikuti spesifikasi ini, sistem akan mampu:**

✅ Mendigitalisasi 100% operasional ormas pengajian  
✅ Meningkatkan efisiensi absensi dari manual menjadi digital (80% lebih cepat)  
✅ Memberikan transparansi penuh melalui audit trail  
✅ Menjaga privasi data jamaah dengan visibility control  
✅ Berjalan tanpa biaya (Rp0 per bulan)  
✅ Scale hingga 1000+ concurrent users  
✅ Menyediakan 2 portal terpisah (Public untuk Jamaah, Admin untuk Pengurus)  

**Key Features:**
- 2 Dashboard terpisah dengan UI/UX yang berbeda
- Smart Attendance System dengan live search & gender filter
- Public Portal yang informatif tanpa login
- Full audit trail untuk akuntabilitas
- Analytics & reporting untuk evaluasi

**Siap untuk diimplementasikan oleh AI Agent (Cursor, Claude, GitHub Copilot)**

---

**Document Information:**
- **Version:** 2.1 (Simplified Roles & Dual Dashboard)
- **Created:** October 2026
- **Status:** Ready for Implementation
- **Format:** Markdown (.md)
- **Audience:** AI Agent Development, Technical Teams

---

Generated for: **Sistem Informasi & Absensi Pengajian (SIAP)**  
Target Audience: **Ormas Pengajian di Bandung & sekitarnya**
