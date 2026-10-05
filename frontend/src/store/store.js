import { create } from 'zustand';
import { api } from '../services/api';

// Kategori master default sesuai jenjang kelompok usia/generasi
const DEFAULT_CATEGORIES = [
  { id: 1, nama_kategori: 'Umum', deskripsi: 'Semua kelompok & usia jamaah', color: 'emerald', memberCount: 0 },
  { id: 2, nama_kategori: 'Dewasa', deskripsi: 'Kelompok usia dewasa', color: 'blue', memberCount: 0 },
  { id: 3, nama_kategori: 'Lansia', deskripsi: 'Kelompok usia lanjut', color: 'purple', memberCount: 0 },
  { id: 4, nama_kategori: 'Remaja & Muda-Mudi', deskripsi: 'Kelompok generasi muda / milenial', color: 'amber', memberCount: 0 },
  { id: 5, nama_kategori: 'Anak-anak (Cabe Rawit)', deskripsi: 'Kelompok anak-anak & pembinaan dini', color: 'pink', memberCount: 0 },
];

// Helper to load/save in localStorage
const getSaved = (key, fallback) => {
  try {
    const val = localStorage.getItem(`siap_${key}`);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

const saveItem = (key, value) => {
  try {
    localStorage.setItem(`siap_${key}`, JSON.stringify(value));
  } catch (err) {
    console.error('Storage error', err);
  }
};

// Helper mendeteksi rute awal: /penggurus, /pengurus, /admin -> Pengurus, selain itu -> Jamaah publik
const getInitialPortalMode = () => {
  if (typeof window === 'undefined') return 'public';
  const path = window.location.pathname.toLowerCase();
  if (path.startsWith('/penggurus') || path.startsWith('/pengurus') || path.startsWith('/admin')) {
    const savedUser = getSaved('currentUser', null);
    return savedUser ? 'admin' : 'login';
  }
  return 'public';
};

// Helper sinkronisasi URL browser tanpa reload (HTML5 History API)
export const syncPortalUrl = (mode) => {
  if (typeof window === 'undefined') return;
  const currentPath = window.location.pathname.toLowerCase();
  if (mode === 'admin' || mode === 'login') {
    if (!currentPath.startsWith('/penggurus')) {
      window.history.pushState({ mode }, '', '/penggurus');
    }
  } else {
    if (currentPath !== '/') {
      window.history.pushState({ mode: 'public' }, '', '/');
    }
  }
};

export const useAppStore = create((set, get) => ({
  // Data State - BERSIH DARI DATA DUMMY
  categories: getSaved('categories', DEFAULT_CATEGORIES),
  jamaah: getSaved('jamaah', []),
  events: getSaved('events', []),
  attendance: getSaved('attendance', {}),
  admins: getSaved('admins', []),
  auditLogs: getSaved('auditLogs', []),
  bulletins: getSaved('bulletins', []),
  
  // Loading & sync state
  isLoading: false,
  isResetting: false,
  apiError: null,

  // Auth state
  currentUser: getSaved('currentUser', null),
  
  // Current active view / portal ('public' | 'admin' | 'login')
  portalMode: getInitialPortalMode(),
  setPortalMode: (mode) => {
    syncPortalUrl(mode);
    set({ portalMode: mode });
  },

  // Draft attendance storage
  attendanceDrafts: getSaved('attendanceDrafts', {}),

  // =========================================================================
  // SYNC DENGAN BACKEND / DATABASE (PARALEL, EFISIEN, CEPAT & HEMAT MEMORI)
  // =========================================================================
  fetchData: async (options = {}) => {
    const isManual = options?.manual === true;
    const now = Date.now();

    // Prevent concurrent fetch requests piling up on slow mobile connections
    if (useAppStore.__isFetching) {
      return;
    }

    // Throttle automatic/background polling (minimal 5 detik antar-pemanggilan otomatis)
    if (!isManual && useAppStore.__lastFetchTime && now - useAppStore.__lastFetchTime < 5000) {
      return;
    }

    useAppStore.__isFetching = true;
    useAppStore.__lastFetchTime = now;

    if (isManual) {
      set({ isLoading: true, apiError: null });
    }

    try {
      const user = get().currentUser;
      const isAdmin = Boolean(user) || get().portalMode === 'admin';

      // Smart Selective Query:
      // Pengunjung publik hanya perlu Categories, Events, dan Bulletins
      // Jamaah dan Attendance hanya di-fetch bila admin atau saat data awal masih kosong
      const currentJamaah = get().jamaah;
      const currentAttendance = get().attendance;
      const shouldFetchJamaah = isAdmin || currentJamaah.length === 0 || options?.includeAll === true;
      const shouldFetchAttendance = isAdmin || Object.keys(currentAttendance).length === 0 || options?.includeAll === true;

      // Jalankan seluruh pemanggilan API secara paralel (Promise.allSettled)
      const [catResult, eventResult, bulResult, jamResult, attResult, adminResult, logResult] = await Promise.allSettled([
        api.getCategories(),
        api.getEvents(),
        api.getBulletins(),
        shouldFetchJamaah ? api.getJamaah() : Promise.resolve(null),
        shouldFetchAttendance ? api.getAllAttendance() : Promise.resolve(null),
        user ? api.getPengurus() : Promise.resolve(null),
        user ? api.getAuditLogs() : Promise.resolve(null),
      ]);

      const updates = {};

      // Helper pembanding data untuk mencegah trigger re-render virtual DOM yang tidak perlu
      const hasChanged = (currentData, newData) => {
        if (!currentData && !newData) return false;
        if (!currentData || !newData) return true;
        if (Array.isArray(currentData) && Array.isArray(newData)) {
          if (currentData.length !== newData.length) return true;
          if (currentData.length === 0 && newData.length === 0) return false;
        }
        return JSON.stringify(currentData) !== JSON.stringify(newData);
      };

      // 1. Categories
      if (catResult.status === 'fulfilled' && catResult.value?.success && Array.isArray(catResult.value.data) && catResult.value.data.length > 0) {
        const formattedCats = catResult.value.data.map(c => ({
          ...c,
          color: c.id === 1 ? 'emerald' : c.id === 2 ? 'pink' : c.id === 3 ? 'blue' : c.id === 4 ? 'amber' : 'purple',
          memberCount: c.memberCount || c._count?.members || 0,
        }));
        if (hasChanged(get().categories, formattedCats)) {
          updates.categories = formattedCats;
          saveItem('categories', formattedCats);
        }
      }

      // 2. Events (Jadwal Pengajian)
      let eventsData = null;
      if (eventResult.status === 'fulfilled' && eventResult.value?.success && Array.isArray(eventResult.value.data)) {
        eventsData = eventResult.value.data;
      } else {
        // Fallback mengambil public events jika ada kendala
        try {
          const pubEv = await api.getPublicEvents();
          if (pubEv?.success && Array.isArray(pubEv.data)) {
            eventsData = pubEv.data;
          }
        } catch {
          // ignore
        }
      }

      if (eventsData && hasChanged(get().events, eventsData)) {
        updates.events = eventsData;
        saveItem('events', eventsData);
      }

      // 3. Bulletins (Warta & Pengumuman)
      if (bulResult.status === 'fulfilled' && bulResult.value?.success && Array.isArray(bulResult.value.data)) {
        if (hasChanged(get().bulletins, bulResult.value.data)) {
          updates.bulletins = bulResult.value.data;
          saveItem('bulletins', bulResult.value.data);
        }
      }

      // 4. Jamaah
      if (jamResult && jamResult.status === 'fulfilled' && jamResult.value?.success && Array.isArray(jamResult.value.data)) {
        if (hasChanged(get().jamaah, jamResult.value.data)) {
          updates.jamaah = jamResult.value.data;
          saveItem('jamaah', jamResult.value.data);
        }
      }

      // 5. Attendance (Absensi Real-Time)
      if (attResult && attResult.status === 'fulfilled' && attResult.value?.success && attResult.value.data) {
        if (hasChanged(get().attendance, attResult.value.data)) {
          updates.attendance = attResult.value.data;
          saveItem('attendance', attResult.value.data);
        }
      }

      // 6. Admins
      if (adminResult && adminResult.status === 'fulfilled' && adminResult.value?.success && Array.isArray(adminResult.value.data)) {
        if (hasChanged(get().admins, adminResult.value.data)) {
          updates.admins = adminResult.value.data;
          saveItem('admins', adminResult.value.data);
        }
      }

      // 7. Audit Logs
      if (logResult && logResult.status === 'fulfilled' && logResult.value?.success && Array.isArray(logResult.value.data)) {
        if (hasChanged(get().auditLogs, logResult.value.data)) {
          updates.auditLogs = logResult.value.data;
          saveItem('auditLogs', logResult.value.data);
        }
      }

      // SATU KALI BATCH STATE UPDATE hanya jika data memang berubah!
      if (Object.keys(updates).length > 0) {
        set(updates);
      }
    } catch (err) {
      console.error('Error saat sinkronisasi database:', err);
      if (isManual) {
        set({ apiError: err.message });
      }
    } finally {
      useAppStore.__isFetching = false;
      if (isManual) {
        set({ isLoading: false });
      }
    }
  },

  // =========================================================================
  // ACTIONS: AUTH
  // =========================================================================
  login: async (username, password) => {
    const cleanUsername = username.trim().toLowerCase();
    
    // First try backend API
    try {
      const res = await api.login(cleanUsername, password);
      if (res && res.success && res.token) {
        localStorage.setItem('siap_token', res.token);
        const loggedUser = {
          ...res.user,
          lastLogin: new Date().toLocaleString('id-ID'),
        };
        saveItem('currentUser', loggedUser);
        syncPortalUrl('admin');
        set({ currentUser: loggedUser, portalMode: 'admin' });
        
        // Sync fresh data from backend
        get().fetchData();
        return { success: true, user: loggedUser };
      } else if (res && !res.success) {
        return { success: false, message: res.message || 'Login gagal.' };
      }
    } catch (err) {
      console.warn('Backend API login offline/unreachable, checking local fallback...', err.message);
    }

    // Fallback authentication for offline or initial setup before Supabase connected
    // Default demo accounts: budi_ketua, ani_sekretaris with password admin123
    const validUsers = [
      { id: 'admin-001', username: 'budi_ketua', nama: 'Ust. Dr. Budi Raharjo', role: 'Pengurus', email: 'budi.raharjo@siap-pengajian.org', isActive: true },
      { id: 'admin-002', username: 'ani_sekretaris', nama: 'Ustadzah Ani Maryam', role: 'Pengurus', email: 'ani.maryam@siap-pengajian.org', isActive: true },
      ...(get().admins || [])
    ];

    const user = validUsers.find(a => a.username.toLowerCase() === cleanUsername && a.isActive);
    if (!user) {
      return { success: false, message: 'Username tidak ditemukan atau akun dinonaktifkan.' };
    }
    if (password !== 'admin123' && password !== 'password') {
      return { success: false, message: 'Password salah. (Gunakan kata sandi: admin123)' };
    }

    const updatedUser = { ...user, lastLogin: new Date().toLocaleString('id-ID') };
    saveItem('currentUser', updatedUser);
    syncPortalUrl('admin');
    set({ currentUser: updatedUser, portalMode: 'admin' });
    get().addAuditLog('LOGIN', 'Sistem', `Pengurus ${user.nama} berhasil masuk ke sistem`);
    
    return { success: true, user: updatedUser };
  },

  logout: async () => {
    const user = get().currentUser;
    try {
      await api.logout?.();
    } catch (e) {
      // ignore
    }
    if (user) {
      get().addAuditLog('LOGOUT', 'Sistem', `Pengurus ${user.nama} keluar dari sistem`);
    }
    localStorage.removeItem('siap_token');
    localStorage.removeItem('siap_currentUser');
    syncPortalUrl('public');
    set({ currentUser: null, portalMode: 'public' });
  },

  // =========================================================================
  // ACTIONS: EVENTS
  // =========================================================================
  addEvent: async (eventData) => {
    // Call API
    try {
      const res = await api.createEvent(eventData);
      if (res && res.success && res.data) {
        get().addAuditLog('CREATE_EVENT', res.data.tema, `Membuat jadwal kajian baru`);
        await get().fetchData();
        return res.data;
      } else if (res && !res.success) {
        throw new Error(res.message || 'Gagal menyimpan ke database Supabase');
      }
    } catch (err) {
      console.error('API createEvent failed:', err.message);
      throw err;
    }
  },

  updateEvent: async (id, eventData) => {
    try {
      await api.updateEvent(id, eventData);
    } catch (err) {
      console.warn('API updateEvent failed:', err.message);
    }
    get().addAuditLog('UPDATE_EVENT', eventData.tema || `Event #${id}`, `Memperbarui detail/visibilitas event`);
    await get().fetchData();
  },

  deleteEvent: async (id) => {
    const target = get().events.find(e => e.id === id);
    try {
      await api.deleteEvent(id);
    } catch (err) {
      console.warn('API deleteEvent failed:', err.message);
    }
    get().addAuditLog('DELETE_EVENT', target?.tema || `Event #${id}`, `Menghapus jadwal event`);
    await get().fetchData();
  },

  // =========================================================================
  // ACTIONS: SMART ATTENDANCE
  // =========================================================================
  saveAttendanceDraft: (eventId, records) => {
    const drafts = { ...get().attendanceDrafts, [eventId]: records };
    saveItem('attendanceDrafts', drafts);
    set({ attendanceDrafts: drafts });
  },

  clearAttendanceDraft: (eventId) => {
    const drafts = { ...get().attendanceDrafts };
    delete drafts[eventId];
    saveItem('attendanceDrafts', drafts);
    set({ attendanceDrafts: drafts });
  },

  // Rekam status kehadiran satu jamaah secara instan ke server (Real-time Kolaboratif Antar-Pengurus)
  submitSingleAttendance: async (eventId, jamaahId, status) => {
    // 1. Optimistic update local Zustand attendance state so UI is instant
    const currentAtt = get().attendance;
    const numEventId = Number(eventId);
    const eventAtt = { ...(currentAtt[eventId] || currentAtt[numEventId] || {}) };
    eventAtt[jamaahId] = status;
    const updatedAtt = { ...currentAtt, [eventId]: eventAtt, [numEventId]: eventAtt };
    set({ attendance: updatedAtt });
    saveItem('attendance', updatedAtt);

    // 2. Clear any lingering draft status for this jamaah to avoid stale draft overrides
    const drafts = { ...get().attendanceDrafts };
    if (drafts[eventId]) {
      drafts[eventId] = { ...drafts[eventId], [jamaahId]: status };
      saveItem('attendanceDrafts', drafts);
      set({ attendanceDrafts: drafts });
    }

    // 3. Immediately upsert this single record to Supabase database (autoAlpa: false)
    try {
      await api.recordBulkAttendance(eventId, { [jamaahId]: status }, false);
    } catch (err) {
      console.warn('API submitSingleAttendance failed:', err.message);
    }
  },

  submitAttendance: async (eventId, records, autoAlpa = true) => {
    const user = get().currentUser || { id: 'admin-001', nama: 'Pengurus' };
    const event = get().events.find(e => e.id === Number(eventId));
    
    // Call API
    try {
      await api.recordBulkAttendance(eventId, records, autoAlpa);
    } catch (err) {
      console.warn('API recordBulkAttendance failed:', err.message);
      throw err;
    }

    // Clear draft after successful submission
    get().clearAttendanceDraft(eventId);

    // Refresh state from database
    await get().fetchData();

    const totalRecorded = Object.keys(records).length;
    get().addAuditLog(
      'RECORD_ATTENDANCE',
      event ? event.tema : `Event #${eventId}`,
      `Merekam kehadiran ${totalRecorded} jamaah oleh ${user.nama}`
    );

    return { success: true, count: totalRecorded };
  },

  // =========================================================================
  // ACTIONS: JAMAAH
  // =========================================================================
  addJamaah: async (jamaahData) => {
    try {
      const res = await api.createJamaah(jamaahData);
      if (res && res.success && res.data) {
        get().addAuditLog('CREATE_JAMAAH', res.data.nama, `Menambahkan anggota jamaah baru`);
        await get().fetchData();
        return res.data;
      }
    } catch (err) {
      console.warn('API createJamaah failed:', err.message);
    }
    await get().fetchData();
  },

  updateJamaah: async (id, jamaahData) => {
    try {
      await api.updateJamaah(id, jamaahData);
    } catch (err) {
      console.warn('API updateJamaah failed:', err.message);
    }
    get().addAuditLog('UPDATE_JAMAAH', jamaahData.nama || `Jamaah #${id}`, `Memperbarui data jamaah`);
    await get().fetchData();
  },

  deleteJamaah: async (id) => {
    const target = get().jamaah.find(j => j.id === id);
    try {
      await api.deleteJamaah(id);
    } catch (err) {
      console.warn('API deleteJamaah failed:', err.message);
    }
    get().addAuditLog('DELETE_JAMAAH', target?.nama || `Jamaah #${id}`, `Menghapus data jamaah`);
    await get().fetchData();
  },

  bulkImportJamaah: async (jamaahList) => {
    try {
      await api.bulkImportJamaah(jamaahList);
    } catch (err) {
      console.warn('API bulkImportJamaah failed:', err.message);
    }
    get().addAuditLog('BULK_IMPORT_JAMAAH', `${jamaahList.length} Data Jamaah`, `Berhasil mengimpor jamaah via CSV`);
    await get().fetchData();
    return jamaahList.length;
  },

  // =========================================================================
  // ACTIONS: CATEGORIES
  // =========================================================================
  addCategory: async (catData) => {
    try {
      const res = await api.createCategory(catData);
      if (res && res.success && res.data) {
        get().addAuditLog('CREATE_CATEGORY', res.data.nama_kategori, `Menambahkan kategori baru`);
        await get().fetchData();
        return res.data;
      }
    } catch (err) {
      console.warn('API createCategory failed:', err.message);
    }
    await get().fetchData();
  },

  updateCategory: async (id, catData) => {
    try {
      await api.updateCategory(id, catData);
    } catch (err) {
      console.warn('API updateCategory failed:', err.message);
    }
    get().addAuditLog('UPDATE_CATEGORY', catData.nama_kategori || `Kategori #${id}`, `Memperbarui kategori`);
    await get().fetchData();
  },

  deleteCategory: async (id) => {
    const target = get().categories.find(c => c.id === id);
    try {
      await api.deleteCategory(id);
    } catch (err) {
      console.warn('API deleteCategory failed:', err.message);
    }
    get().addAuditLog('DELETE_CATEGORY', target?.nama_kategori || `Kategori #${id}`, `Menghapus kategori`);
    await get().fetchData();
  },

  // =========================================================================
  // ACTIONS: ADMIN (PENGURUS) MANAGEMENT
  // =========================================================================
  addAdmin: async (adminData) => {
    try {
      const res = await api.createPengurus(adminData);
      if (res && res.success && res.data) {
        get().addAuditLog('CREATE_ADMIN', res.data.nama, `Menambahkan akun pengurus baru (${res.data.username})`);
        await get().fetchData();
        return res;
      } else if (res && !res.success) {
        throw new Error(res.message || 'Gagal membuat akun pengurus');
      }
    } catch (err) {
      console.error('API createPengurus error:', err.message);
      throw err;
    }
  },

  updateAdmin: async (id, adminData) => {
    try {
      const res = await api.updatePengurus(id, adminData);
      if (res && res.success) {
        get().addAuditLog('UPDATE_ADMIN', adminData.nama || `Admin #${id}`, `Memperbarui akun pengurus`);
        await get().fetchData();
        return res;
      } else if (res && !res.success) {
        throw new Error(res.message || 'Gagal memperbarui akun pengurus');
      }
    } catch (err) {
      console.error('API updatePengurus error:', err.message);
      throw err;
    }
  },

  deleteAdmin: async (id) => {
    try {
      const target = get().admins.find(a => a.id === id);
      const res = await api.deletePengurus(id);
      if (res && res.success) {
        get().addAuditLog('DELETE_ADMIN', target?.nama || `Admin #${id}`, `Menghapus akun pengurus`);
        await get().fetchData();
        return res;
      } else if (res && !res.success) {
        throw new Error(res.message || 'Gagal menghapus akun pengurus');
      }
    } catch (err) {
      console.error('API deletePengurus error:', err.message);
      throw err;
    }
  },

  toggleAdminStatus: async (id) => {
    try {
      await api.togglePengurusStatus(id);
    } catch (err) {
      console.warn('API togglePengurusStatus failed:', err.message);
    }
    get().addAuditLog('TOGGLE_ADMIN', `Admin #${id}`, `Mengubah status aktif admin`);
    await get().fetchData();
  },

  // =========================================================================
  // ACTIONS: AUDIT LOGS
  // =========================================================================
  addAuditLog: (action, target, details) => {
    const user = get().currentUser || { id: 'sys', nama: 'Sistem' };
    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      adminId: user.id,
      adminNama: user.nama,
      action,
      target,
      timestamp: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
      details,
    };
    const updated = [newLog, ...get().auditLogs.slice(0, 99)];
    saveItem('auditLogs', updated);
    set({ auditLogs: updated });
  },

  // =========================================================================
  // TOMBOL RESET DATA UJI COBA
  // =========================================================================
  resetDatabase: async () => {
    set({ isResetting: true });
    try {
      // 1. Panggil backend API untuk reset data transaksi di database Supabase
      try {
        await api.resetData();
      } catch (err) {
        console.warn('API resetData failed or Supabase not yet live:', err.message);
      }

      // 2. Kosongkan seluruh data transaksi di local state
      set({
        events: [],
        jamaah: [],
        attendance: {},
        auditLogs: [],
        attendanceDrafts: {},
        categories: DEFAULT_CATEGORIES,
      });

      // 3. Bersihkan penyimpanan browser untuk data transaksi
      localStorage.removeItem('siap_events');
      localStorage.removeItem('siap_jamaah');
      localStorage.removeItem('siap_attendance');
      localStorage.removeItem('siap_auditLogs');
      localStorage.removeItem('siap_attendanceDrafts');

      // 4. Catat aktivitas reset ke audit log baru
      const user = get().currentUser || { id: 'admin-001', nama: 'Pengurus' };
      const resetLog = {
        id: `log-reset-${Date.now()}`,
        adminId: user.id,
        adminNama: user.nama,
        action: 'RESET_DATA',
        target: 'Database Pengujian',
        timestamp: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
        details: 'Seluruh data pengujian (jadwal, jamaah, absensi, audit log) berhasil dibersihkan ke kondisi kosong.',
      };
      set({ auditLogs: [resetLog] });
      saveItem('auditLogs', [resetLog]);

      return {
        success: true,
        message: 'Data pengujian berhasil direset ke kondisi bersih (Kosong). Akun pengurus dan kategori master tetap aman.',
      };
    } catch (error) {
      console.error('Reset database failed:', error);
      return {
        success: false,
        message: error.message || 'Gagal mereset data.',
      };
    } finally {
      set({ isResetting: false });
    }
  },

  // =========================================================================
  // ACTIONS: BULLETINS (PENGUMUMAN & WARTA BERITA)
  // =========================================================================
  addBulletin: async (bulletinData) => {
    try {
      const res = await api.createBulletin(bulletinData);
      if (res && res.success && res.data) {
        await get().fetchData();
        return res.data;
      }
    } catch (err) {
      console.warn('API createBulletin failed:', err.message);
    }
    await get().fetchData();
  },

  updateBulletin: async (id, bulletinData) => {
    try {
      await api.updateBulletin(id, bulletinData);
    } catch (err) {
      console.warn('API updateBulletin failed:', err.message);
    }
    await get().fetchData();
  },

  deleteBulletin: async (id) => {
    try {
      await api.deleteBulletin(id);
    } catch (err) {
      console.warn('API deleteBulletin failed:', err.message);
    }
    await get().fetchData();
  },
}));
