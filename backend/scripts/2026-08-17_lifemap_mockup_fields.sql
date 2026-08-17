-- Persist LifeMap mockup fields as real columns instead of JSON / localStorage.

-- Growth assumptions + personal assets on the profile
ALTER TABLE financial_profile
  ADD COLUMN IF NOT EXISTS inflation_rate DECIMAL(8,6) DEFAULT 0.06,
  ADD COLUMN IF NOT EXISTS equity_growth_rate DECIMAL(8,6) DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS debt_growth_rate DECIMAL(8,6) DEFAULT 0.07,
  ADD COLUMN IF NOT EXISTS personal_asset_value DECIMAL(15,2) DEFAULT 0;

-- Assets register extras (expected_return already exists on some deploys)
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sip_amount DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sip_frequency VARCHAR(40) DEFAULT 'Monthly',
  ADD COLUMN IF NOT EXISTS sip_expiry_date VARCHAR(40),
  ADD COLUMN IF NOT EXISTS expected_return DECIMAL(8,4),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Work-asset notes / colour
ALTER TABLE work_assets
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS color VARCHAR(20);

-- Goal register extras (target_age already exists on some deploys)
ALTER TABLE financial_goal
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS flexibility VARCHAR(40),
  ADD COLUMN IF NOT EXISTS span_years INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS inflation_pct DECIMAL(8,4) DEFAULT 6,
  ADD COLUMN IF NOT EXISTS target_age INTEGER,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Expense life-stage window + Need/Want/Saving
ALTER TABLE financial_expense
  ADD COLUMN IF NOT EXISTS start_age INTEGER,
  ADD COLUMN IF NOT EXISTS end_age INTEGER,
  ADD COLUMN IF NOT EXISTS need_type VARCHAR(40);

-- Current-loan extras
ALTER TABLE financial_loan
  ADD COLUMN IF NOT EXISTS frequency VARCHAR(40) DEFAULT 'Monthly',
  ADD COLUMN IF NOT EXISTS name VARCHAR(255);

ALTER TABLE financial_loan
  ALTER COLUMN rate TYPE DECIMAL(8,4);

-- Planned borrowing (not yet drawn) — separate from current loans
CREATE TABLE IF NOT EXISTS planned_loan (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  profile_id INTEGER REFERENCES financial_profile(id) ON DELETE SET NULL,
  lender VARCHAR(255),
  name VARCHAR(255),
  type VARCHAR(255),
  principal DECIMAL(15,2) DEFAULT 0,
  rate DECIMAL(8,4) DEFAULT 0,
  emi DECIMAL(15,2) DEFAULT 0,
  frequency VARCHAR(40) DEFAULT 'Monthly',
  start_year INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planned_loan_user_id ON planned_loan(user_id);
CREATE INDEX IF NOT EXISTS idx_planned_loan_profile_id ON planned_loan(profile_id);
