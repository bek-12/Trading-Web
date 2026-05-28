import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from './api';

export function useTrades(user, accountId) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTrades = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const url = accountId ? `/trades?accountId=${accountId}` : '/trades';
      const data = await apiFetch(url);
      setTrades(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, accountId]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  const addTrade = useCallback(async (trade) => {
    const data = await apiFetch('/trades', { method: 'POST', body: trade });
    setTrades(prev => [data, ...prev]);
    return data;
  }, []);

  const updateTrade = useCallback(async (id, trade) => {
    const data = await apiFetch(`/trades/${id}`, { method: 'PUT', body: trade });
    setTrades(prev => prev.map(t => t.id === id ? data : t));
    return data;
  }, []);

  return { trades, loading, error, fetchTrades, addTrade, updateTrade };
}
