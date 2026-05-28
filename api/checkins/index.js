import { query } from '../db/client.js';
import { requireAuth, cors } from '../middleware/auth.js';

function rowToCheckin(row) {
  return {
    id:                    row.id,
    accountId:             row.account_id,
    date:                  row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
    balance:               row.balance !== null ? parseFloat(row.balance) : null,
    mood:                  row.mood,
    moodWord:              row.mood_word,
    realCapitalRemaining:  row.real_capital_remaining !== null ? parseFloat(row.real_capital_remaining) : null,
    realCapitalPct:        row.real_capital_pct !== null ? parseFloat(row.real_capital_pct) : null,
    timestamp:             row.created_at,
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
      let sql = `SELECT * FROM checkins WHERE user_id = $1`;
      const params = [user.userId];
      if (accountId) { sql += ` AND account_id = $2`; params.push(accountId); }
      sql += ` ORDER BY date ASC`;
      const result = await query(sql, params);
      return res.status(200).json(result.rows.map(rowToCheckin));
    } catch (err) {
      console.error('GET checkins error:', err);
      return res.status(500).json({ error: 'Failed to fetch check-ins' });
    }
  }

  if (req.method === 'POST') {
    try {
      const c = req.body;
      if (!c.accountId || !c.date) return res.status(400).json({ error: 'accountId and date are required' });

      const acct = await query('SELECT id FROM accounts WHERE id=$1 AND user_id=$2', [c.accountId, user.userId]);
      if (acct.rows.length === 0) return res.status(403).json({ error: 'Account not found' });

      // Upsert — one check-in per account per day
      const result = await query(
        `INSERT INTO checkins
           (account_id, user_id, date, balance, mood, mood_word, real_capital_remaining, real_capital_pct)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (account_id, date) DO UPDATE SET
           balance = EXCLUDED.balance,
           mood = EXCLUDED.mood,
           mood_word = EXCLUDED.mood_word,
           real_capital_remaining = EXCLUDED.real_capital_remaining,
           real_capital_pct = EXCLUDED.real_capital_pct
         RETURNING *`,
        [c.accountId, user.userId, c.date, c.balance || null, c.mood || null,
         c.moodWord || null, c.realCapitalRemaining || null, c.realCapitalPct || null]
      );
      return res.status(201).json(rowToCheckin(result.rows[0]));
    } catch (err) {
      console.error('POST checkin error:', err);
      return res.status(500).json({ error: 'Failed to save check-in' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
