import { query } from '../db/client.js';
import { requireAuth, cors } from '../middleware/auth.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;

  // PUT — update account
  if (req.method === 'PUT') {
    try {
      const { name, broker, startingBalance, overallDrawdown, dailyDrawdown,
              phase1Target, phase2Target, status, notes } = req.body;

      const result = await query(
        `UPDATE accounts SET
           name=$1, broker=$2, starting_balance=$3, overall_drawdown=$4,
           daily_drawdown=$5, phase1_target=$6, phase2_target=$7, status=$8, notes=$9
         WHERE id=$10 AND user_id=$11
         RETURNING id, name, broker, starting_balance, overall_drawdown, daily_drawdown,
                   phase1_target, phase2_target, status, notes, created_at`,
        [name, broker || null, startingBalance || 0, overallDrawdown || 0,
         dailyDrawdown || 0, phase1Target || 0, phase2Target || 0,
         status || 'Phase 1', notes || null, id, user.userId]
      );

      if (result.rows.length === 0) return res.status(404).json({ error: 'Account not found' });

      const row = result.rows[0];
      return res.status(200).json({
        id: row.id, name: row.name, broker: row.broker,
        startingBalance: parseFloat(row.starting_balance),
        overallDrawdown: parseFloat(row.overall_drawdown),
        dailyDrawdown:   parseFloat(row.daily_drawdown),
        phase1Target:    parseFloat(row.phase1_target),
        phase2Target:    parseFloat(row.phase2_target),
        status: row.status, notes: row.notes, createdAt: row.created_at,
      });
    } catch (err) {
      console.error('PUT account error:', err);
      return res.status(500).json({ error: 'Failed to update account' });
    }
  }

  // DELETE — delete account and all linked data (CASCADE handles it)
  if (req.method === 'DELETE') {
    try {
      const result = await query(
        'DELETE FROM accounts WHERE id=$1 AND user_id=$2 RETURNING id',
        [id, user.userId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Account not found' });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('DELETE account error:', err);
      return res.status(500).json({ error: 'Failed to delete account' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
