import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from './api';

export function useJournal(user, accountId) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const url = accountId ? `/journal?accountId=${accountId}` : '/journal';
      const data = await apiFetch(url);
      setEntries(data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user, accountId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const saveEntry = useCallback(async (entry) => {
    const data = await apiFetch('/journal', { method: 'POST', body: entry });
    setEntries(prev => {
      const idx = prev.findIndex(e => e.accountId === data.accountId && e.date === data.date);
      if (idx >= 0) { const next = [...prev]; next[idx] = data; return next; }
      return [...prev, data];
    });
    return data;
  }, []);

  return { entries, loading, fetchEntries, saveEntry };
}
