/**
 * QueueSmart - Backend API client. Owner: Killian.
 * Everyone: call these instead of fetch() directly, so the base URL, auth
 * header and error shape are handled in one place.
 */
const BASE_URL = 'http://localhost:4000/api';
const TOKEN_KEY = 'queuesmart_token';

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

/**
 * Thrown for any non-2xx response.
 * .code    e.g. 'VALIDATION_ERROR', 'INVALID_CREDENTIALS'
 * .fields  per-field messages on a 400, otherwise {}
 */
export class ApiRequestError extends Error {
    constructor(status, code, message, fields) {
        super(message);
        this.status = status;
        this.code = code;
        this.fields = fields || {};
    }
}

async function request(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const err = data.error || {};
        throw new ApiRequestError(
            res.status,
            err.code || 'UNKNOWN',
            err.message || 'Request failed',
            err.fields
        );
    }

    return data;
}

export const api = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body }),
    put: (path, body) => request(path, { method: 'PUT', body }),
    del: (path) => request(path, { method: 'DELETE' }),
};

// --- Auth (Killian) ---
export const authApi = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    me: () => api.get('/auth/me'),
};

// --- Services (Andres) ---
export const servicesApi = {
    list: () => api.get('/services'),
    get: (id) => api.get(`/services/${id}`),
    create: (data) => api.post('/services', data),
    update: (id, data) => api.put(`/services/${id}`, data),
    remove: (id) => api.del(`/services/${id}`),
};

// --- Queue admin actions (Andres, calling into Alan's queue module) ---
export const queueApi = {
    adminView: (serviceId) => api.get(`/queue/admin/${serviceId}`),
    serveNext: (serviceId) => api.post(`/queue/admin/${serviceId}/serve`),
};

// --- History + Notifications (David) ---
export const historyApi = {
    list: () => api.get('/history'),
    stats: () => api.get('/history/stats'),
    create: (data) => api.post('/history', data),
};

export const notificationsApi = {
    list: () => api.get('/notifications'),
    create: (data) => api.post('/notifications', data),
    markAllRead: () => api.post('/notifications/read-all'),
    clearAll: () => api.del('/notifications'),
};
