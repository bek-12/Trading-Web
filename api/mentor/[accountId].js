import { query } from '../db/client.js';
import { requireAuth, cors } from '../middleware/auth.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const { accountId } = req.query;

  // Verify account belongs to user
  const acct = await query('SELECT id FROM accounts WHERE id=$1 AND user_id=$2', [accountId, user.userId]);
  if (acct.rows.length === 0) return res.status(403).json({ error: 'Account not found' });

  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT messages FROM mentor_chats WHERE account_id=$1 AND user_id=$2`,
        [accountId, user.userId]
      );
      const messages = result.rows.length > 0 ? result.rows[0].messages : [];
      return res.status(200).json(messages);
    } catch (err) {
      console.error('GET mentor chat error:', err);
      return res.status(500).json({ error: 'Failed to fetch chat' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { messages } = req.body;
      await query(
        `INSERT INTO mentor_chats (account_id, user_id, messages, updated_at)
         VALUES ($1,$2,$3,NOW())
         ON CONFLICT (account_id) DO UPDATE SET messages=EXCLUDED.messages, updated_at=NOW()`,
        [accountId, user.userId, JSON.stringify(messages || [])]
      );
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('PUT mentor chat error:', err);
      return res.status(500).json({ error: 'Failed to save chat' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await query(`DELETE FROM mentor_chats WHERE account_id=$1 AND user_id=$2`, [accountId, user.userId]);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('DELETE mentor chat error:', err);
      return res.status(500).json({ error: 'Failed to clear chat' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
