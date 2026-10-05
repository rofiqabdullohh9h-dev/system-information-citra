// API Service client for connecting frontend to backend
export const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

const getHeaders = (isFormData = false) => {
  const token = localStorage.getItem('siap_token');
  const headers = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const safeJson = async (res) => {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    console.warn(`[API Non-JSON Response ${res.status}]:`, text.substring(0, 120));
    return { success: false, message: `Server error (${res.status})` };
  }
  return res.json();
};

export const api = {
  // Auth
  async login(username, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return safeJson(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getHeaders(),
    });
    return safeJson(res);
  },

  // Public Endpoints
  async getPublicEvents() {
    const res = await fetch(`${API_BASE_URL}/public/events`);
    return safeJson(res);
  },

  async getPublicEventDetail(id) {
    const res = await fetch(`${API_BASE_URL}/public/events/${id}`);
    return safeJson(res);
  },

  async getPublicStatistics() {
    const res = await fetch(`${API_BASE_URL}/public/statistics`);
    return safeJson(res);
  },

  // Admin Events
  async getEvents() {
    const res = await fetch(`${API_BASE_URL}/events`, {
      headers: getHeaders(),
    });
    return safeJson(res);
  },

  async createEvent(eventData) {
    const res = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(eventData),
    });
    return safeJson(res);
  },

  async updateEvent(id, eventData) {
    const res = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(eventData),
    });
    return safeJson(res);
  },

  async deleteEvent(id) {
    const res = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return safeJson(res);
  },

  // Smart Attendance
  async getAllAttendance() {
    const res = await fetch(`${API_BASE_URL}/attendance`, {
      headers: getHeaders(),
    });
    return safeJson(res);
  },

  async getEventAttendance(eventId) {

    const res = await fetch(`${API_BASE_URL}/attendance/event/${eventId}`, {
      headers: getHeaders(),
    });
    return safeJson(res);
  },

  async recordBulkAttendance(eventId, records, autoAlpa = true) {
    const res = await fetch(`${API_BASE_URL}/attendance/bulk`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ eventId, records, autoAlpa }),
    });
    return safeJson(res);
  },

  // Jamaah
  async getJamaah(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/jamaah?${query}`, {
      headers: getHeaders(),
    });
    return safeJson(res);
  },

  async createJamaah(data) {
    const res = await fetch(`${API_BASE_URL}/jamaah`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res);
  },

  async updateJamaah(id, data) {
    const res = await fetch(`${API_BASE_URL}/jamaah/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res);
  },

  async deleteJamaah(id) {
    const res = await fetch(`${API_BASE_URL}/jamaah/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return safeJson(res);
  },

  async bulkImportJamaah(items) {
    const res = await fetch(`${API_BASE_URL}/jamaah/bulk-import`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ items }),
    });
    return safeJson(res);
  },

  // Categories
  async getCategories() {
    const res = await fetch(`${API_BASE_URL}/categories`, {
      headers: getHeaders(),
    });
    return safeJson(res);
  },

  async createCategory(data) {
    const res = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res);
  },

  async updateCategory(id, data) {
    const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res);
  },

  async deleteCategory(id) {
    const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return safeJson(res);
  },

  // Pengurus Management (All unified)
  async getPengurus() {
    const res = await fetch(`${API_BASE_URL}/admin`, {
      headers: getHeaders(),
    });
    return safeJson(res);
  },

  async createPengurus(data) {
    const res = await fetch(`${API_BASE_URL}/admin`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res);
  },

  async updatePengurus(id, data) {
    const res = await fetch(`${API_BASE_URL}/admin/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res);
  },

  async deletePengurus(id) {
    const res = await fetch(`${API_BASE_URL}/admin/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return safeJson(res);
  },

  async togglePengurusStatus(id) {
    const res = await fetch(`${API_BASE_URL}/admin/${id}/toggle-status`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    return safeJson(res);
  },

  // Reset Data Uji Coba (Bersihkan data pengujian di database)
  async resetData() {
    const res = await fetch(`${API_BASE_URL}/admin/reset-data`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return safeJson(res);
  },

  // Analytics & Audit
  async getAnalyticsOverview() {
    const res = await fetch(`${API_BASE_URL}/analytics/overview`, {
      headers: getHeaders(),
    });
    return safeJson(res);
  },

  async getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/audit-logs?${query}`, {
      headers: getHeaders(),
    });
    return safeJson(res);
  },

  // Excel Export download url
  getExcelExportUrl(eventId) {
    return `${API_BASE_URL}/export/excel/${eventId}`;
  },

  // Bulletins (Pengumuman & Warta Berita/Dokumentasi)
  async getBulletins(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/bulletins${query ? `?${query}` : ''}`);
    return safeJson(res);
  },

  async createBulletin(bulletinData) {
    const res = await fetch(`${API_BASE_URL}/bulletins`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(bulletinData),
    });
    return safeJson(res);
  },

  async updateBulletin(id, bulletinData) {
    const res = await fetch(`${API_BASE_URL}/bulletins/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(bulletinData),
    });
    return safeJson(res);
  },

  async deleteBulletin(id) {
    const res = await fetch(`${API_BASE_URL}/bulletins/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return safeJson(res);
  },
};

