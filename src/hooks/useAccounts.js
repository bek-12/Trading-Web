import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from './api';

export function useAccounts(user) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAccounts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiFetch('/accounts');
      setAccounts(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const addAccount = useCallback(async (account) => {
    const data = await apiFetch('/accounts', { method: 'POST', body: account });
    setAccounts(prev => [...prev, data]);
    return data;
  }, []);

  const updateAccount = useCallback(async (id, account) => {
    const data = await apiFetch(`/accounts/${id}`, { method: 'PUT', body: account });
    setAccounts(prev => prev.map(a => a.id === id ? data : a));
    return data;
  }, []);

  const deleteAccount = useCallback(async (id) => {
    await apiFetch(`/accounts/${id}`, { method: 'DELETE' });
    setAccounts(prev => prev.filter(a => a.id !== id));
  }, []);

  return { accounts, loading, error, fetchAccounts, addAccount, updateAccount, deleteAccount };
}
