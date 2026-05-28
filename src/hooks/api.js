// ─── Central API client ───────────────────────────────────────────────────────
// All fetch calls go through here. Attaches JWT, handles 401 globally.

const BASE = '/api';

export function getToken() {
  return localStorage.getItem('tradeos_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('tradeos_token', token);
  else localStorage.removeItem('tradeos_token');
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    // Token expired or invalid — clear and reload to login screen
    setToken(null);
    window.location.reload();
    return null;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}
