import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from './api';

export function useCheckins(user, accountId) {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCheckins = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const url = accountId ? `/checkins?accountId=${accountId}` : '/checkins';
      const data = await apiFetch(url);
      setCheckins(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, accountId]);

  useEffect(() => { fetchCheckins(); }, [fetchCheckins]);

  const addCheckin = useCallback(async (checkin) => {
    const data = await apiFetch('/checkins', { method: 'POST', body: checkin });
    setCheckins(prev => {
      const idx = prev.findIndex(c => c.accountId === data.accountId && c.date === data.date);
      if (idx >= 0) { const next = [...prev]; next[idx] = data; return next; }
      return [...prev, data];
    });
    return data;
  }, []);

  return { checkins, loading, error, fetchCheckins, addCheckin };
}
