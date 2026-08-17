import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const STATEMENTS = [
  `ALTER TABLE financial_profile ADD COLUMN IF NOT EXISTS inflation_rate DECIMAL(8,6) DEFAULT 0.06`,
  `ALTER TABLE financial_profile ADD COLUMN IF NOT EXISTS equity_growth_rate DECIMAL(8,6) DEFAULT 0.15`,
  `ALTER TABLE financial_profile ADD COLUMN IF NOT EXISTS debt_growth_rate DECIMAL(8,6) DEFAULT 0.07`,
  `ALTER TABLE financial_profile ADD COLUMN IF NOT EXISTS personal_asset_value DECIMAL(15,2) DEFAULT 0`,
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS category VARCHAR(100)`,
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS sip_amount DECIMAL(15,2) DEFAULT 0`,
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS sip_frequency VARCHAR(40) DEFAULT 'Monthly'`,
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS sip_expiry_date VARCHAR(40)`,
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS expected_return DECIMAL(8,4)`,
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS notes TEXT`,
  `ALTER TABLE work_assets ADD COLUMN IF NOT EXISTS notes TEXT`,
  `ALTER TABLE work_assets ADD COLUMN IF NOT EXISTS color VARCHAR(20)`,
  `ALTER TABLE financial_goal ADD COLUMN IF NOT EXISTS category VARCHAR(100)`,
  `ALTER TABLE financial_goal ADD COLUMN IF NOT EXISTS flexibility VARCHAR(40)`,
  `ALTER TABLE financial_goal ADD COLUMN IF NOT EXISTS span_years INTEGER DEFAULT 1`,
  `ALTER TABLE financial_goal ADD COLUMN IF NOT EXISTS inflation_pct DECIMAL(8,4) DEFAULT 6`,
  `ALTER TABLE financial_goal ADD COLUMN IF NOT EXISTS target_age INTEGER`,
  `ALTER TABLE financial_goal ADD COLUMN IF NOT EXISTS notes TEXT`,
  `ALTER TABLE financial_expense ADD COLUMN IF NOT EXISTS start_age INTEGER`,
  `ALTER TABLE financial_expense ADD COLUMN IF NOT EXISTS end_age INTEGER`,
  `ALTER TABLE financial_expense ADD COLUMN IF NOT EXISTS need_type VARCHAR(40)`,
  `ALTER TABLE financial_loan ADD COLUMN IF NOT EXISTS frequency VARCHAR(40) DEFAULT 'Monthly'`,
  `ALTER TABLE financial_loan ADD COLUMN IF NOT EXISTS name VARCHAR(255)`,
  `ALTER TABLE financial_loan ALTER COLUMN rate TYPE DECIMAL(8,4) USING rate::DECIMAL(8,4)`,
  `CREATE TABLE IF NOT EXISTS planned_loan (
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
    )`,
  `CREATE INDEX IF NOT EXISTS idx_planned_loan_user_id ON planned_loan(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_planned_loan_profile_id ON planned_loan(profile_id)`,
]

export async function ensureLifemapMockupSchema(pool) {
  console.log('[migrate] Applying LifeMap mockup field schema…')
  for (const sql of STATEMENTS) {
    try {
      await pool.query(sql)
    } catch (error) {
      if (/password authentication failed|ECONNREFUSED|ENOTFOUND/i.test(error.message)) {
        throw error
      }
      console.warn('[migrate] skipped:', sql.split('\n')[0], '-', error.message)
    }
  }
  console.log('[migrate] LifeMap mockup field schema ready')
}

async function runStandalone() {
  const { default: pool } = await import('../config/database.js')
  try {
    await ensureLifemapMockupSchema(pool)
  } finally {
    await pool.end()
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  runStandalone().catch((error) => {
    console.error('[migrate] failed', error)
    process.exit(1)
  })
}

export default ensureLifemapMockupSchema
