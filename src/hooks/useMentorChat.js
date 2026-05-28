import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from './api';

export function useMentorChat(user, accountId) {
  const [messages, setMessages] = useState([]);

  const fetchMessages = useCallback(async () => {
    if (!user || !accountId) return;
    try {
      const data = await apiFetch(`/mentor/${accountId}`);
      setMessages(data || []);
    } catch {
      setMessages([]);
    }
  }, [user, accountId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const saveMessages = useCallback(async (msgs) => {
    if (!user || !accountId) return;
    setMessages(msgs);
    try {
      await apiFetch(`/mentor/${accountId}`, { method: 'PUT', body: { messages: msgs } });
    } catch {
      // silent — messages already updated in state
    }
  }, [user, accountId]);

  const clearMessages = useCallback(async () => {
    if (!user || !accountId) return;
    setMessages([]);
    try {
      await apiFetch(`/mentor/${accountId}`, { method: 'DELETE' });
    } catch {
      // silent
    }
  }, [user, accountId]);

  return { messages, setMessages: saveMessages, clearMessages, fetchMessages };
}
