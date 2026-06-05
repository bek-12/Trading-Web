import { query } from '../db/client.js';
import { requireAuth, cors } from '../middleware/auth.js';

function rowToTrade(row) {
  return {
    id:                     row.id,
    accountId:              row.account_id,
    date:                   row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
    pair:                   row.pair,
    direction:              row.direction,
    entry:                  row.entry !== null ? parseFloat(row.entry) : null,
    stopLoss:               row.stop_loss !== null ? parseFloat(row.stop_loss) : null,
    takeProfit:             row.take_profit !== null ? parseFloat(row.take_profit) : null,
    riskAmount:             row.risk_amount !== null ? parseFloat(row.risk_amount) : null,
    result:                 row.result,
    pnl:                    parseFloat(row.pnl || 0),
    notes:                  row.notes,
    movedSL:                row.moved_sl,
    revengeFlag:            row.revenge_flag,
    oversizedPosition:      row.oversized_position,
    twoLossRuleBroken:      row.two_loss_rule_broken,
    hasViolation:           row.has_violation,
    punishmentCompleted:    row.punishment_completed,
    punishmentText:         row.punishment_text || null,
    punishmentCompletedAt:  row.punishment_completed_at || null,
    punishmentRecord:       row.punishment_record
      ? row.punishment_record
      : (row.punishment_text
          ? { punishmentText: row.punishment_text, completedAt: row.punishment_completed_at }
          : null),
    timestamp:              row.created_at,
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  // GET — fetch all trades for user (optionally filter by accountId)
  if (req.method === 'GET') {
    try {
      const { accountId } = req.query;
      let sql = `SELECT * FROM trades WHERE user_id = $1`;
      const params = [user.userId];
      if (accountId) {
        sql += ` AND account_id = $2`;
        params.push(accountId);
      }
      sql += ` ORDER BY created_at DESC`;
      const result = await query(sql, params);
      return res.status(200).json(result.rows.map(rowToTrade));
    } catch (err) {
      console.error('GET trades error:', err);
      return res.status(500).json({ error: 'Failed to fetch trades' });
    }
  }

  // POST — save new trade
  if (req.method === 'POST') {
    try {
      const t = req.body;
      if (!t.accountId || !t.pair) return res.status(400).json({ error: 'accountId and pair are required' });

      // Verify account belongs to user
      const acct = await query('SELECT id FROM accounts WHERE id=$1 AND user_id=$2', [t.accountId, user.userId]);
      if (acct.rows.length === 0) return res.status(403).json({ error: 'Account not found' });

      const result = await query(
        `INSERT INTO trades
           (account_id, user_id, date, pair, direction, entry, stop_loss, take_profit,
            risk_amount, result, pnl, notes, moved_sl, revenge_flag, oversized_position,
            two_loss_rule_broken, has_violation, punishment_completed, punishment_record)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         RETURNING *`,
        [t.accountId, user.userId, t.date, t.pair, t.direction,
         t.entry || null, t.stopLoss || null, t.takeProfit || null,
         t.riskAmount || null, t.result, t.pnl || 0, t.notes || null,
         t.movedSL || false, t.revengeFlag || false, t.oversizedPosition || false,
         t.twoLossRuleBroken || false, t.hasViolation || false,
         t.punishmentCompleted || false, t.punishmentRecord ? JSON.stringify(t.punishmentRecord) : null]
      );

      return res.status(201).json(rowToTrade(result.rows[0]));
    } catch (err) {
      console.error('POST trade error:', err);
      return res.status(500).json({ error: 'Failed to save trade' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
