import { query } from '../db/client.js';
import { requireAuth, cors } from '../middleware/auth.js';

function rowToEntry(row) {
  return {
    id:        row.id,
    accountId: row.account_id,
    date:      row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
    text:      row.text,
    timestamp: row.created_at,
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    try {
      const { accountId } = req.query;
      let sql = `SELECT * FROM journal_entries WHERE user_id = $1`;
      const params = [user.userId];
      if (accountId) { sql += ` AND account_id = $2`; params.push(accountId); }
      sql += ` ORDER BY date ASC`;
      const result = await query(sql, params);
      return res.status(200).json(result.rows.map(rowToEntry));
    } catch (err) {
      console.error('GET journal error:', err);
      return res.status(500).json({ error: 'Failed to fetch journal' });
    }
  }

  if (req.method === 'POST') {
    try {
      const e = req.body;
      if (!e.accountId || !e.date) return res.status(400).json({ error: 'accountId and date are required' });

      const acct = await query('SELECT id FROM accounts WHERE id=$1 AND user_id=$2', [e.accountId, user.userId]);
      if (acct.rows.length === 0) return res.status(403).json({ error: 'Account not found' });

      const result = await query(
        `INSERT INTO journal_entries (account_id, user_id, date, text)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (account_id, date) DO UPDATE SET text = EXCLUDED.text
         RETURNING *`,
        [e.accountId, user.userId, e.date, e.text || '']
      );
      return res.status(201).json(rowToEntry(result.rows[0]));
    } catch (err) {
      console.error('POST journal error:', err);
      return res.status(500).json({ error: 'Failed to save journal entry' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
