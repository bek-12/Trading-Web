import { query } from '../db/client.js';
import { requireAuth, cors } from '../middleware/auth.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  // GET — fetch all accounts for this user
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT id, name, broker, starting_balance, overall_drawdown, daily_drawdown,
                phase1_target, phase2_target, status, notes, created_at
         FROM accounts WHERE user_id = $1 ORDER BY created_at ASC`,
        [user.userId]
      );
      const accounts = result.rows.map(row => ({
        id:               row.id,
        name:             row.name,
        broker:           row.broker,
        startingBalance:  parseFloat(row.starting_balance),
        overallDrawdown:  parseFloat(row.overall_drawdown),
        dailyDrawdown:    parseFloat(row.daily_drawdown),
        phase1Target:     parseFloat(row.phase1_target),
        phase2Target:     parseFloat(row.phase2_target),
        status:           row.status,
        notes:            row.notes,
        createdAt:        row.created_at,
      }));
      return res.status(200).json(accounts);
    } catch (err) {
      console.error('GET accounts error:', err);
      return res.status(500).json({ error: 'Failed to fetch accounts' });
    }
  }

  // POST — create new account
  if (req.method === 'POST') {
    try {
      const { name, broker, startingBalance, overallDrawdown, dailyDrawdown,
              phase1Target, phase2Target, status, notes } = req.body;

      if (!name) return res.status(400).json({ error: 'Account name is required' });

      const result = await query(
        `INSERT INTO accounts
           (user_id, name, broker, starting_balance, overall_drawdown, daily_drawdown,
            phase1_target, phase2_target, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id, name, broker, starting_balance, overall_drawdown, daily_drawdown,
                   phase1_target, phase2_target, status, notes, created_at`,
        [user.userId, name, broker || null, startingBalance || 0, overallDrawdown || 0,
         dailyDrawdown || 0, phase1Target || 0, phase2Target || 0, status || 'Phase 1', notes || null]
      );

      const row = result.rows[0];
      return res.status(201).json({
        id:               row.id,
        name:             row.name,
        broker:           row.broker,
        startingBalance:  parseFloat(row.starting_balance),
        overallDrawdown:  parseFloat(row.overall_drawdown),
        dailyDrawdown:    parseFloat(row.daily_drawdown),
        phase1Target:     parseFloat(row.phase1_target),
        phase2Target:     parseFloat(row.phase2_target),
        status:           row.status,
        notes:            row.notes,
        createdAt:        row.created_at,
      });
    } catch (err) {
      console.error('POST account error:', err);
      return res.status(500).json({ error: 'Failed to create account' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
