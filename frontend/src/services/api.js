// FINDORA AI - Frontend API Service Client

const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('findora_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async register({ name, email, password, role = 'user', adminSecret = '' }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, adminSecret })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  },

  async forgotPassword(email) {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to dispatch reset code');
    return data;
  },

  async resetPassword(email, code, newPassword) {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reset password');
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch user profile');
    return data;
  },

  // Items
  async getItems(filters = {}) {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${API_BASE}/items?${params.toString()}`);
    return res.json();
  },

  async getItem(id) {
    const res = await fetch(`${API_BASE}/items/${id}`, { headers: getHeaders() });
    return res.json();
  },

  async reportLost(itemData) {
    const res = await fetch(`${API_BASE}/items/lost`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(itemData)
    });
    return res.json();
  },

  async reportFound(itemData) {
    const res = await fetch(`${API_BASE}/items/found`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(itemData)
    });
    return res.json();
  },

  async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const token = localStorage.getItem('findora_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/items/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    return res.json();
  },

  // Matches
  async getMatches() {
    const res = await fetch(`${API_BASE}/matches`, { headers: getHeaders() });
    return res.json();
  },

  async getMatch(id) {
    const res = await fetch(`${API_BASE}/matches/${id}`, { headers: getHeaders() });
    return res.json();
  },

  async searchMatches(itemId, weights) {
    const res = await fetch(`${API_BASE}/matches/search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ itemId, weights })
    });
    return res.json();
  },

  // Claims & Blind Verification
  async initiateClaim(data) {
    const res = await fetch(`${API_BASE}/claims/initiate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async submitVerificationAnswers(claimId, answers) {
    const res = await fetch(`${API_BASE}/claims/${claimId}/verify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ answers })
    });
    return res.json();
  },

  async getClaim(id) {
    const res = await fetch(`${API_BASE}/claims/${id}`, { headers: getHeaders() });
    return res.json();
  },

  async getClaims() {
    const res = await fetch(`${API_BASE}/claims`, { headers: getHeaders() });
    return res.json();
  },

  // Admin
  async getAdminDashboard() {
    const res = await fetch(`${API_BASE}/admin/dashboard`, { headers: getHeaders() });
    return res.json();
  },

  async approveClaim(claimId, data = {}) {
    const res = await fetch(`${API_BASE}/admin/claims/${claimId}/approve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async rejectClaim(claimId, reason) {
    const res = await fetch(`${API_BASE}/admin/claims/${claimId}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason })
    });
    return res.json();
  },

  async resetDemo() {
    const res = await fetch(`${API_BASE}/admin/reset-demo`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // Recovery
  async getRecoveryCase(caseId) {
    const res = await fetch(`${API_BASE}/recovery/${caseId}`, { headers: getHeaders() });
    return res.json();
  },

  async completeHandover(caseId, handoverCode) {
    const res = await fetch(`${API_BASE}/recovery/${caseId}/handover`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ handoverCode })
    });
    return res.json();
  },

  // Analytics
  async getAnalytics() {
    const res = await fetch(`${API_BASE}/analytics`);
    return res.json();
  },

  // Assistant
  async queryAssistant(query) {
    const res = await fetch(`${API_BASE}/assistant/query`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ query })
    });
    return res.json();
  },

  // Notifications
  async getNotifications() {
    const res = await fetch(`${API_BASE}/notifications`, { headers: getHeaders() });
    return res.json();
  },

  async markNotificationRead(id) {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // 1-Time Code Verification & Search Closure
  async closeSearchByCode(closeCode, notes = '') {
    const res = await fetch(`${API_BASE}/items/close-search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ closeCode, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to close search');
    return data;
  },

  async getMyReports() {
    const res = await fetch(`${API_BASE}/items/my-reports`, { headers: getHeaders() });
    return res.json();
  },

  // Telegram Integration & Campus Community Hub
  async getTelegramStatus() {
    const res = await fetch(`${API_BASE}/telegram/status`);
    return res.json();
  },

  async broadcastTelegramSummary() {
    const res = await fetch(`${API_BASE}/telegram/broadcast-summary`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  async simulateTelegramCommand(payload) {
    const res = await fetch(`${API_BASE}/telegram/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }
};
