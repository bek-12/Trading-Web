import { useState, useCallback } from 'react';
import { apiFetch, getToken, setToken } from './api';

export function useAuth() {
  const [user, setUser] = useState(() => {
    const token = getToken();
    if (!token) return null;
    try {
      // Decode payload (no verification — server verifies on every request)
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        setToken(null);
        return null;
      }
      return { id: payload.userId, username: payload.username };
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: { username, password },
      });
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (username, password) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: { username, password },
      });
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    // Clear any cached account selection
    localStorage.removeItem('tradeos_active_account');
  }, []);

  return { user, loading, error, login, register, logout };
}
