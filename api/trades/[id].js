import { query } from '../db/client.js';
import { requireAuth, cors } from '../middleware/auth.js';

function rowToTrade(row) {
  return {
    id:                   row.id,
    accountId:            row.account_id,
    date:                 row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
    pair:                 row.pair,
    direction:            row.direction,
    entry:                parseFloat(row.entry),
    stopLoss:             parseFloat(row.stop_loss),
    takeProfit:           row.take_profit ? parseFloat(row.take_profit) : null,
    riskAmount:           parseFloat(row.risk_amount),
    result:               row.result,
    pnl:                  parseFloat(row.pnl),
    notes:                row.notes,
    movedSL:              row.moved_sl,
    revengeFlag:          row.revenge_flag,
    oversizedPosition:    row.oversized_position,
    twoLossRuleBroken:    row.two_loss_rule_broken,
    hasViolation:         row.has_violation,
    punishmentCompleted:  row.punishment_completed,
    punishmentText:       row.punishment_text,
    punishmentCompletedAt: row.punishment_completed_at,
    // Keep punishmentRecord as the full object for display purposes
    punishmentRecord:     row.punishment_record
      ? row.punishment_record
      : (row.punishment_text
          ? { punishmentText: row.punishment_text, completedAt: row.punishment_completed_at }
          : null),
    timestamp:            row.created_at,
  };
}

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

      // Extract punishment fields properly
      const punishmentCompleted = t.punishmentCompleted === true || t.punishmentCompleted === 'true';
      const punishmentText = t.punishmentRecord?.punishmentText || t.punishmentText || null;
      const punishmentCompletedAt = punishmentCompleted
        ? (t.punishmentRecord?.completedAt || t.punishmentCompletedAt || new Date().toISOString())
        : null;

      const result = await query(
        `UPDATE trades SET
           result = $1,
           pnl = $2,
           notes = $3,
           moved_sl = $4,
           revenge_flag = $5,
           oversized_position = $6,
           two_loss_rule_broken = $7,
           has_violation = $8,
           punishment_completed = $9,
           punishment_text = $10,
           punishment_completed_at = $11,
           punishment_record = $12
         WHERE id = $13 AND user_id = $14
         RETURNING *`,
        [
          t.result || 'Breakeven',          // never send null — default to Breakeven
          t.pnl != null ? parseFloat(t.pnl) : 0,
          t.notes || null,
          t.movedSL || false,
          t.revengeFlag || false,
          t.oversizedPosition || false,
          t.twoLossRuleBroken || false,
          t.hasViolation || false,
          punishmentCompleted,
          punishmentText,
          punishmentCompletedAt,
          t.punishmentRecord ? JSON.stringify(t.punishmentRecord) : null,
          id,
          user.userId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      return res.status(200).json(rowToTrade(result.rows[0]));
    } catch (err) {
      console.error('PUT trade error:', err.message, err.stack);
      return res.status(500).json({ error: err.message || 'Failed to update trade' });
    }
  }

  // PATCH — complete punishment only (minimal update, avoids spreading full trade)
  if (req.method === 'PATCH') {
    try {
      const { punishmentText, completedAt, violationType } = req.body;
      const completedAtTs = completedAt || new Date().toISOString();

      const result = await query(
        `UPDATE trades SET
           punishment_completed = true,
           punishment_text = $1,
           punishment_completed_at = $2,
           punishment_record = $3
         WHERE id = $4 AND user_id = $5
         RETURNING *`,
        [
          punishmentText || null,
          completedAtTs,
          JSON.stringify({ violationType, punishmentText, completedAt: completedAtTs }),
          id,
          user.userId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      return res.status(200).json(rowToTrade(result.rows[0]));
    } catch (err) {
      console.error('PATCH trade punishment error:', err.message, err.stack);
      return res.status(500).json({ error: err.message || 'Failed to save punishment' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
