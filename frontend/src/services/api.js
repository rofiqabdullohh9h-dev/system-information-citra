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

export const api = {
  // Auth
  async login(username, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  // Public Endpoints
  async getPublicEvents() {
    const res = await fetch(`${API_BASE_URL}/public/events`);
    return res.json();
  },

  async getPublicEventDetail(id) {
    const res = await fetch(`${API_BASE_URL}/public/events/${id}`);
    return res.json();
  },

  async getPublicStatistics() {
    const res = await fetch(`${API_BASE_URL}/public/statistics`);
    return res.json();
  },

  // Admin Events
  async getEvents() {
    const res = await fetch(`${API_BASE_URL}/events`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  async createEvent(eventData) {
    const res = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(eventData),
    });
    return res.json();
  },

  async updateEvent(id, eventData) {
    const res = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(eventData),
    });
    return res.json();
  },

  async deleteEvent(id) {
    const res = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.json();
  },

  // Smart Attendance
  async getAllAttendance() {
    const res = await fetch(`${API_BASE_URL}/attendance`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  async getEventAttendance(eventId) {

    const res = await fetch(`${API_BASE_URL}/attendance/event/${eventId}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  async recordBulkAttendance(eventId, records, autoAlpa = true) {
    const res = await fetch(`${API_BASE_URL}/attendance/bulk`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ eventId, records, autoAlpa }),
    });
    return res.json();
  },

  // Jamaah
  async getJamaah(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/jamaah?${query}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  async createJamaah(data) {
    const res = await fetch(`${API_BASE_URL}/jamaah`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateJamaah(id, data) {
    const res = await fetch(`${API_BASE_URL}/jamaah/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteJamaah(id) {
    const res = await fetch(`${API_BASE_URL}/jamaah/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.json();
  },

  async bulkImportJamaah(items) {
    const res = await fetch(`${API_BASE_URL}/jamaah/bulk-import`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ items }),
    });
    return res.json();
  },

  // Categories
  async getCategories() {
    const res = await fetch(`${API_BASE_URL}/categories`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  async createCategory(data) {
    const res = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateCategory(id, data) {
    const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteCategory(id) {
    const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.json();
  },

  // Pengurus Management (All unified)
  async getPengurus() {
    const res = await fetch(`${API_BASE_URL}/admin`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  async createPengurus(data) {
    const res = await fetch(`${API_BASE_URL}/admin`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updatePengurus(id, data) {
    const res = await fetch(`${API_BASE_URL}/admin/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deletePengurus(id) {
    const res = await fetch(`${API_BASE_URL}/admin/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.json();
  },

  async togglePengurusStatus(id) {
    const res = await fetch(`${API_BASE_URL}/admin/${id}/toggle-status`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    return res.json();
  },

  // Reset Data Uji Coba (Bersihkan data pengujian di database)
  async resetData() {
    const res = await fetch(`${API_BASE_URL}/admin/reset-data`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return res.json();
  },

  // Analytics & Audit
  async getAnalyticsOverview() {
    const res = await fetch(`${API_BASE_URL}/analytics/overview`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  async getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/audit-logs?${query}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  // Excel Export download url
  getExcelExportUrl(eventId) {
    return `${API_BASE_URL}/export/excel/${eventId}`;
  },

  // Bulletins (Pengumuman & Warta Berita/Dokumentasi)
  async getBulletins(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/bulletins${query ? `?${query}` : ''}`);
    return res.json();
  },

  async createBulletin(bulletinData) {
    const res = await fetch(`${API_BASE_URL}/bulletins`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(bulletinData),
    });
    return res.json();
  },

  async updateBulletin(id, bulletinData) {
    const res = await fetch(`${API_BASE_URL}/bulletins/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(bulletinData),
    });
    return res.json();
  },

  async deleteBulletin(id) {
    const res = await fetch(`${API_BASE_URL}/bulletins/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.json();
  },
};

