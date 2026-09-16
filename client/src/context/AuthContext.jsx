import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

/**
 * AuthContext — global authentication state for DriveEase.
 *
 * Strategy:
 * - On app mount, calls GET /api/auth/me to restore session from the
 *   httpOnly cookie that the server set on login/register.
 * - login(userData)  — called after successful login/register API response.
 * - logout()         — calls POST /api/auth/logout, clears user state.
 * - Listens for the 'driveease:unauthorized' event dispatched by the Axios
 *   interceptor to clear state on 401 responses globally.
 *
 * JWT tokens are NEVER stored in localStorage.
 * All tokens live exclusively in httpOnly cookies managed by the browser.
 */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true until session check completes

  // ── Restore session on mount ──────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (data.success) {
          setUser(data.data.user);
        }
      } catch {
        // 401 = no active session — this is the normal guest state, not an error
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // ── Global 401 handler from Axios interceptor ─────────────────────
  useEffect(() => {
    const handle401 = () => setUser(null);
    window.addEventListener('driveease:unauthorized', handle401);
    return () => window.removeEventListener('driveease:unauthorized', handle401);
  }, []);

  // ── login: called with user data from register/login API response ──
  const login = useCallback((userData) => {
    setUser(userData);
  }, []);

  // ── logout: clears cookies via server, then clears local state ────
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Server-side logout failed — clear local state anyway
    } finally {
      setUser(null);
    }
  }, []);

  const value = {
    user,
    setUser,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;
