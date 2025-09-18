import pool from '../config/database.js';

async function initRenderDatabase() {
  try {
    console.log('🚀 Initializing database for Render...');
    
    // Test connection with timeout
    const client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )
    ]);
    console.log('✅ Connected to Render PostgreSQL database');
    
    // Create tables
    await createTables(client);
    
    client.release();
    console.log('✅ Database initialization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Database connection refused - database might not be ready yet');
    }
    process.exit(1);
  }
}

async function createTables(client) {
  console.log('📋 Creating tables...');
  
  // Create user table
  await client.query(`
CREATE TABLE IF NOT EXISTS user (
  id INTEGER NOT NULL DEFAULT nextval('user_id_seq'::regclass),
  email CHARACTER VARYING(255) NOT NULL,
  password_hash CHARACTER VARYING(255) NOT NULL,
  name CHARACTER VARYING(255) NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
,
  PRIMARY KEY (id)
,
  UNIQUE (email)

)
  `);
  console.log('✅ user table created');

  // Create financial_profile table
  await client.query(`
CREATE TABLE IF NOT EXISTS financial_profile (
  id INTEGER NOT NULL DEFAULT nextval('financial_profile_id_seq'::regclass),
  user_id INTEGER NOT NULL,
  age INTEGER NOT NULL,
  current_annual_gross_income DOUBLE PRECISION,
  work_tenure_years INTEGER,
  total_asset_gross_market_value DOUBLE PRECISION,
  total_loan_outstanding_value DOUBLE PRECISION,
  loan_tenure_years INTEGER,
  monthly_income DOUBLE PRECISION,
  annual_income DOUBLE PRECISION,
  asset_value DOUBLE PRECISION,
  loan_value DOUBLE PRECISION,
  lifespan_years INTEGER,
  income_growth_rate DOUBLE PRECISION,
  asset_growth_rate DOUBLE PRECISION,
  created_at TIMESTAMP WITHOUT TIME ZONE,
  updated_at TIMESTAMP WITHOUT TIME ZONE
,
  PRIMARY KEY (id)

)
  `);
  console.log('✅ financial_profile table created');

  // Create assets table
  await client.query(`
CREATE TABLE IF NOT EXISTS assets (
  id INTEGER NOT NULL DEFAULT nextval('assets_id_seq'::regclass),
  user_id INTEGER NOT NULL,
  profile_id INTEGER NOT NULL,
  name CHARACTER VARYING(255) NOT NULL,
  tag CHARACTER VARYING(50) NOT NULL,
  current_value NUMERIC DEFAULT 0,
  custom_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
  holding_type CHARACTER VARYING(50) DEFAULT 'one_time'::character varying,
  amount_per_month NUMERIC DEFAULT 0,
  start_date DATE,
  end_date DATE,
  owner CHARACTER VARYING(100),
  liquidity CHARACTER VARYING(50),
  expected_return NUMERIC
,
  PRIMARY KEY (id)
,
  FOREIGN KEY (profile_id) REFERENCES financial_profile(id) ON DELETE CASCADE

)
  `);
  console.log('✅ assets table created');

  // Create financial_loan table
  await client.query(`
CREATE TABLE IF NOT EXISTS financial_loan (
  id INTEGER NOT NULL DEFAULT nextval('financial_loan_id_seq'::regclass),
  user_id INTEGER NOT NULL,
  profile_id INTEGER NOT NULL,
  name CHARACTER VARYING(255),
  amount DOUBLE PRECISION,
  emi DOUBLE PRECISION,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITHOUT TIME ZONE,
  updated_at TIMESTAMP WITHOUT TIME ZONE,
  lender CHARACTER VARYING(255),
  type CHARACTER VARYING(255),
  start_date DATE,
  end_date DATE,
  principal_outstanding NUMERIC,
  rate NUMERIC,
  emi_day INTEGER DEFAULT 1,
  prepay_allowed BOOLEAN DEFAULT true,
  notes TEXT
,
  PRIMARY KEY (id)
,
  FOREIGN KEY (profile_id) REFERENCES financial_profile(id) ON DELETE CASCADE

)
  `);
  console.log('✅ financial_loan table created');

  // Create financial_goal table
  await client.query(`
CREATE TABLE IF NOT EXISTS financial_goal (
  id INTEGER NOT NULL DEFAULT nextval('financial_goal_id_seq'::regclass),
  user_id INTEGER NOT NULL,
  profile_id INTEGER NOT NULL,
  description CHARACTER VARYING(255),
  amount DOUBLE PRECISION,
  order_index INTEGER DEFAULT 0,
  target_date DATE,
  priority CHARACTER VARYING(20),
  status CHARACTER VARYING(20),
  created_at TIMESTAMP WITHOUT TIME ZONE,
  updated_at TIMESTAMP WITHOUT TIME ZONE,
  name CHARACTER VARYING(255),
  target_amount NUMERIC,
  term CHARACTER VARYING(10) DEFAULT 'LT'::character varying,
  recommended_allocation CHARACTER VARYING(255),
  funding_source CHARACTER VARYING(255),
  on_track BOOLEAN DEFAULT false,
  custom_data JSONB DEFAULT '{}'::jsonb,
  target_year INTEGER
,
  PRIMARY KEY (id)
,
  FOREIGN KEY (profile_id) REFERENCES financial_profile(id) ON DELETE CASCADE

)
  `);
  console.log('✅ financial_goal table created');

  // Create financial_expense table
  await client.query(`
CREATE TABLE IF NOT EXISTS financial_expense (
  id INTEGER NOT NULL DEFAULT nextval('financial_expense_id_seq'::regclass),
  user_id INTEGER NOT NULL,
  profile_id INTEGER NOT NULL,
  description CHARACTER VARYING(255),
  amount DOUBLE PRECISION,
  order_index INTEGER DEFAULT 0,
  expense_type CHARACTER VARYING(50),
  frequency CHARACTER VARYING(20) DEFAULT 'Monthly'::character varying,
  is_essential BOOLEAN,
  created_at TIMESTAMP WITHOUT TIME ZONE,
  updated_at TIMESTAMP WITHOUT TIME ZONE,
  category CHARACTER VARYING(255),
  subcategory CHARACTER VARYING(255),
  personal_inflation NUMERIC DEFAULT 0.06,
  source CHARACTER VARYING(255),
  notes TEXT
,
  PRIMARY KEY (id)
,
  FOREIGN KEY (profile_id) REFERENCES financial_profile(id) ON DELETE CASCADE

)
  `);
  console.log('✅ financial_expense table created');

  // Create work_assets table
  await client.query(`
CREATE TABLE IF NOT EXISTS work_assets (
  id INTEGER NOT NULL DEFAULT nextval('work_assets_id_seq'::regclass),
  user_id INTEGER NOT NULL,
  profile_id INTEGER NOT NULL,
  stream CHARACTER VARYING(255) NOT NULL,
  amount NUMERIC NOT NULL,
  growth_rate NUMERIC DEFAULT 0.03,
  end_age INTEGER NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
,
  PRIMARY KEY (id)
,
  FOREIGN KEY (profile_id) REFERENCES financial_profile(id) ON DELETE CASCADE

)
  `);
  console.log('✅ work_assets table created');

  // Create user_tags table
  await client.query(`
CREATE TABLE IF NOT EXISTS user_tags (
  id INTEGER NOT NULL DEFAULT nextval('user_tags_id_seq'::regclass),
  user_id INTEGER NOT NULL,
  tag_name CHARACTER VARYING(100) NOT NULL,
  tag_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (id)
,
  UNIQUE (user_id)
,
  UNIQUE (user_id)
,
  UNIQUE (tag_name)
,
  UNIQUE (tag_name)

)
  `);
  console.log('✅ user_tags table created');

  // Create user_asset_columns table
  await client.query(`
CREATE TABLE IF NOT EXISTS user_asset_columns (
  id INTEGER NOT NULL DEFAULT nextval('user_asset_columns_id_seq'::regclass),
  user_id INTEGER NOT NULL,
  column_key CHARACTER VARYING(100) NOT NULL,
  column_label CHARACTER VARYING(255) NOT NULL,
  column_type CHARACTER VARYING(50) DEFAULT 'text'::character varying,
  column_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
,
  PRIMARY KEY (id)
,
  UNIQUE (user_id)
,
  UNIQUE (user_id)
,
  UNIQUE (column_key)
,
  UNIQUE (column_key)

)
  `);
  console.log('✅ user_asset_columns table created');

  // Create financial_scenario table
  await client.query(`
CREATE TABLE IF NOT EXISTS financial_scenario (
  id INTEGER NOT NULL DEFAULT nextval('financial_scenario_id_seq'::regclass),
  user_id INTEGER NOT NULL,
  profile_id INTEGER NOT NULL,
  scenario_name CHARACTER VARYING(100) NOT NULL,
  description TEXT,
  surplus DOUBLE PRECISION,
  total_assets DOUBLE PRECISION,
  total_liabilities DOUBLE PRECISION,
  human_capital DOUBLE PRECISION,
  future_expenses DOUBLE PRECISION,
  net_worth DOUBLE PRECISION,
  asset_growth_rate DOUBLE PRECISION,
  income_growth_rate DOUBLE PRECISION,
  expense_growth_rate DOUBLE PRECISION,
  created_at TIMESTAMP WITHOUT TIME ZONE,
  updated_at TIMESTAMP WITHOUT TIME ZONE
,
  PRIMARY KEY (id)
,
  FOREIGN KEY (profile_id) REFERENCES financial_profile(id) ON DELETE CASCADE

)
  `);
  console.log('✅ financial_scenario table created');

  console.log('🎉 All tables created successfully!');
}

initRenderDatabase();
