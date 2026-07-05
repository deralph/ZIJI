const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'ziji_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
export function hasToken() {
  return !!getToken();
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(BASE + path, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  authStatus: () => request('/api/auth/status'),
  setup: (pin) => request('/api/auth/setup', { method: 'POST', body: JSON.stringify({ pin }) }),
  login: (pin) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ pin }) }),
  changePin: (newPin) => request('/api/auth/change', { method: 'POST', body: JSON.stringify({ newPin }) }),

  getDay: (date) => request('/api/days/' + date),
  getMonthDays: (monthPrefix) => request('/api/days?month=' + monthPrefix),
  saveDay: (date, data) => request('/api/days/' + date, { method: 'PUT', body: JSON.stringify(data) }),

  getVocab: () => request('/api/vocab'),
  addVocab: (item) => request('/api/vocab', { method: 'POST', body: JSON.stringify(item) }),
  deleteVocab: (id) => request('/api/vocab/' + id, { method: 'DELETE' }),

  getLinks: () => request('/api/links'),
  addLink: (item) => request('/api/links', { method: 'POST', body: JSON.stringify(item) }),
  deleteLink: (id) => request('/api/links/' + id, { method: 'DELETE' }),

  getStartDate: () => request('/api/settings/startDate'),
  setStartDate: (startDate) => request('/api/settings/startDate', { method: 'PUT', body: JSON.stringify({ startDate }) }),

  correctSentence: (sentence) => request('/api/correct', { method: 'POST', body: JSON.stringify({ sentence }) }),
  getCorrectionHistory: () => request('/api/correct'),

  getDueVocab: () => request('/api/vocab/due'),
  reviewVocab: (id, result) => request(`/api/vocab/${id}/review`, { method: 'PUT', body: JSON.stringify({ result }) }),

  getAudio: (date) => request('/api/audio' + (date ? '?date=' + date : '')),
  saveAudio: (item) => request('/api/audio', { method: 'POST', body: JSON.stringify(item) }),
  deleteAudio: (id) => request('/api/audio/' + id, { method: 'DELETE' }),
};

export async function uploadAudioToCloudinary(blob) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !preset) {
    throw new Error('Cloudinary is not configured (missing VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET).');
  }
  const form = new FormData();
  form.append('file', blob);
  form.append('upload_preset', preset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Upload to Cloudinary failed.');
  }
  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id };
}

