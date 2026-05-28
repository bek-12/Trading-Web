-- TradeOS Database Schema
-- Run this once in your Neon SQL editor to create all tables

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  broker            TEXT,
  starting_balance  NUMERIC(12,2) NOT NULL DEFAULT 0,
  overall_drawdown  NUMERIC(12,2) NOT NULL DEFAULT 0,
  daily_drawdown    NUMERIC(12,2) NOT NULL DEFAULT 0,
  phase1_target     NUMERIC(12,2) DEFAULT 0,
  phase2_target     NUMERIC(12,2) DEFAULT 0,
  status            TEXT DEFAULT 'Phase 1',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trades (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date                  DATE NOT NULL,
  pair                  TEXT NOT NULL,
  direction             TEXT NOT NULL CHECK (direction IN ('Buy','Sell')),
  entry                 NUMERIC(16,5),
  stop_loss             NUMERIC(16,5),
  take_profit           NUMERIC(16,5),
  risk_amount           NUMERIC(10,2),
  result                TEXT CHECK (result IN ('Win','Loss','Breakeven')),
  pnl                   NUMERIC(10,2) DEFAULT 0,
  notes                 TEXT,
  moved_sl              BOOLEAN DEFAULT FALSE,
  revenge_flag          BOOLEAN DEFAULT FALSE,
  oversized_position    BOOLEAN DEFAULT FALSE,
  two_loss_rule_broken  BOOLEAN DEFAULT FALSE,
  has_violation         BOOLEAN DEFAULT FALSE,
  punishment_completed  BOOLEAN DEFAULT FALSE,
  punishment_record     JSONB,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checkins (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id              UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date                    DATE NOT NULL,
  balance                 NUMERIC(12,2),
  mood                    INTEGER CHECK (mood BETWEEN 1 AND 5),
  mood_word               TEXT,
  real_capital_remaining  NUMERIC(12,2),
  real_capital_pct        NUMERIC(6,2),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, date)
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  text        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, date)
);

CREATE TABLE IF NOT EXISTS mentor_chats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  messages    JSONB DEFAULT '[]',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_trades_account_date ON trades(account_id, date);
CREATE INDEX IF NOT EXISTS idx_checkins_account_date ON checkins(account_id, date);
CREATE INDEX IF NOT EXISTS idx_journal_account_date ON journal_entries(account_id, date);
