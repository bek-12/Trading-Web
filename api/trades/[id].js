import { query } from '../db/client.js';
import { requireAuth, cors } from '../middleware/auth.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;

  // PUT — update trade (stop_loss is LOCKED — never overwritten)
  if (req.method === 'PUT') {
    try {
      const t = req.body;
      const result = await query(
        `UPDATE trades SET
           result=$1, pnl=$2, notes=$3, moved_sl=$4, revenge_flag=$5,
           oversized_position=$6, two_loss_rule_broken=$7, has_violation=$8,
           punishment_completed=$9, punishment_record=$10
         WHERE id=$11 AND user_id=$12
         RETURNING *`,
        [t.result, t.pnl || 0, t.notes || null,
         t.movedSL || false, t.revengeFlag || false,
         t.oversizedPosition || false, t.twoLossRuleBroken || false,
         t.hasViolation || false, t.punishmentCompleted || false,
         t.punishmentRecord ? JSON.stringify(t.punishmentRecord) : null,
         id, user.userId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Trade not found' });

      const row = result.rows[0];
      return res.status(200).json({
        id: row.id, accountId: row.account_id,
        date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
        pair: row.pair, direction: row.direction,
        entry: parseFloat(row.entry), stopLoss: parseFloat(row.stop_loss),
        takeProfit: row.take_profit ? parseFloat(row.take_profit) : null,
        riskAmount: parseFloat(row.risk_amount), result: row.result,
        pnl: parseFloat(row.pnl), notes: row.notes,
        movedSL: row.moved_sl, revengeFlag: row.revenge_flag,
        oversizedPosition: row.oversized_position, twoLossRuleBroken: row.two_loss_rule_broken,
        hasViolation: row.has_violation, punishmentCompleted: row.punishment_completed,
        punishmentRecord: row.punishment_record, timestamp: row.created_at,
      });
    } catch (err) {
      console.error('PUT trade error:', err);
      return res.status(500).json({ error: 'Failed to update trade' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
