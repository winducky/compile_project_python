const API_BASE = '/api';

async function apiRequest(method, path, options = {}) {
    const headers = { 'x-api-key': localStorage.getItem('api_key') || '' };
    const response = await fetch(`${API_BASE}${path}`, { method, headers, ...options });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(err.detail || 'Request failed');
    }
    return response.json();
}
