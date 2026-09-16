import axios from 'axios';

/**
 * axiosInstance — pre-configured Axios client for all DriveEase API calls.
 *
 * Base URL:
 *   - Development: Vite dev proxy forwards /api → http://localhost:5000/api
 *     so we use a relative base URL ("/api") to go through the proxy.
 *   - Production build: reads VITE_API_BASE_URL from .env
 *
 * withCredentials: true  → sends httpOnly cookies (JWT) with every request.
 *
 * Interceptors:
 *   - Response interceptor normalises error shapes and handles 401 globally.
 */
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,           // required for httpOnly cookie auth
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,                  // 15 s request timeout
});

// ── Request interceptor ──────────────────────────────────────────────
// Currently a pass-through.
// In PHASE 2, token refresh logic can be added here if needed.
axiosInstance.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// ── Response interceptor ─────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;

    // Dispatch unauthorized event on 401, EXCEPT for the session-restore
    // call (/auth/me on app mount) — that 401 is the normal "no session" state
    // and should not trigger a global redirect/state-clear.
    const url = error.config?.url || '';
    const isSessionRestore = url.includes('/auth/me');

    if (status === 401 && !isSessionRestore) {
      window.dispatchEvent(new CustomEvent('driveease:unauthorized'));
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
