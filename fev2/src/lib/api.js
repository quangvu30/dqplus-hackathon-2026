// Single-base API client for backendv2. Skeleton (ApiError, isNetworkError,
// request with timeout + bearer) carried over from /frontend/src/lib/api.js.
const BASE = import.meta.env.VITE_API_BASE || '/api';

let _token = null;
export function setToken(t) {
  _token = t;
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function isNetworkError(e) {
  return e instanceof TypeError || (e && (e.name === 'TimeoutError' || e.name === 'AbortError'));
}

async function request(path, { method = 'GET', body, timeout = 15000 } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(_token ? { Authorization: 'Bearer ' + _token } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new ApiError((data && data.error) || 'Request failed', res.status, data?.details);
  }
  return data;
}

async function requestForm(path, formData) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: _token ? { Authorization: 'Bearer ' + _token } : {},
    body: formData,
    signal: AbortSignal.timeout(30000),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new ApiError((data && data.error) || 'Upload failed', res.status);
  }
  return data;
}

const qs = (params) => {
  const clean = Object.fromEntries(
    Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
};

export const publicApi = {
  featured: (role, limit) => request(`/public/featured${qs({ role, limit })}`),
};

export const auth = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),
};

export const onboarding = {
  submit: (payload) => request('/onboarding/submit', { method: 'POST', body: payload, timeout: 20000 }),
  status: () => request('/onboarding/status'),
};

export const profiles = {
  me: () => request('/profiles/me'),
  updateMe: (payload) => request('/profiles/me', { method: 'PUT', body: payload }),
  get: (id) => request(`/profiles/${id}`),
};

export const discover = {
  browse: (params) => request(`/discover${qs(params)}`),
  recommended: ({ limit, rerank } = {}) =>
    request(`/discover/recommended${qs({ limit, rerank })}`, { timeout: rerank ? 45000 : 15000 }),
  nlFilter: (query) => request('/discover/nl-filter', { method: 'POST', body: { query }, timeout: 30000 }),
};

export const documents = {
  uploadFinancialReport: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return requestForm('/documents/financial-report', fd);
  },
  get: (id) => request(`/documents/${id}`),
};

export const assessments = {
  forProfile: (profileId) => request(`/assessments/profile/${profileId}`),
};

export const meetings = {
  create: (payload) => request('/meetings', { method: 'POST', body: payload }),
  draftMessage: (recipientUserId) =>
    request('/meetings/draft-message', { method: 'POST', body: { recipientUserId }, timeout: 20000 }),
  list: (params) => request(`/meetings${qs(params)}`),
  get: (id) => request(`/meetings/${id}`),
  accept: (id, body) => request(`/meetings/${id}/accept`, { method: 'POST', body }),
  decline: (id, body) => request(`/meetings/${id}/decline`, { method: 'POST', body }),
  cancel: (id) => request(`/meetings/${id}/cancel`, { method: 'POST', body: {} }),
  feedback: (id, body) => request(`/meetings/${id}/feedback`, { method: 'POST', body }),
};

export const notifications = {
  list: (params) => request(`/notifications${qs(params)}`),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'POST', body: {} }),
  markAllRead: () => request('/notifications/read-all', { method: 'POST', body: {} }),
};
