import axios from 'axios';

/**
 * axiosInstance — pre-configured Axios client for all DriveEase API calls.
 *
 * Base URL:
 *   - Development: Uses '/api' (relative) which goes through Vite dev proxy
 *   - Production: Uses full backend URL from VITE_API_BASE_URL env var
 *
 * withCredentials: true  → sends httpOnly cookies (JWT) with every request.
 *
 * Interceptors:
 *   - Response interceptor normalises error shapes and handles 401 globally.
 */

// Determine base URL: use env var if set, otherwise detect dev vs prod
const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  // If VITE_API_BASE_URL is set to a full URL (starts with http), use it
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl;
  }
  
  // In development (npm run dev), use relative URL for Vite proxy
  if (import.meta.env.DEV) {
    return '/api';
  }
  
  // In production build, must use full backend URL
  // Ignore relative paths like '/api' in production
  return 'https://driveease-driving-school.onrender.com/api';
};

const axiosInstance = axios.create({
  baseURL: getBaseURL(),
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
