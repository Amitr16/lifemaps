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
    CREATE TABLE IF NOT EXISTS "user" (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ User table created');

  // Create financial_profile table
  await client.query(`
    CREATE TABLE IF NOT EXISTS financial_profile (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
      age INTEGER,
      current_annual_gross_income DECIMAL(15,2),
      work_tenure_years INTEGER,
      total_asset_gross_market_value DECIMAL(15,2),
      total_loan_outstanding_value DECIMAL(15,2),
      loan_tenure_years INTEGER,
      lifespan_years INTEGER DEFAULT 85,
      income_growth_rate DECIMAL(5,4) DEFAULT 0.06,
      asset_growth_rate DECIMAL(5,4) DEFAULT 0.06,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Financial profile table created');

  // Create financial_asset table
  await client.query(`
    CREATE TABLE IF NOT EXISTS financial_asset (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
      profile_id INTEGER REFERENCES financial_profile(id) ON DELETE CASCADE,
      name VARCHAR(255),
      tag VARCHAR(100),
      sub_type VARCHAR(100),
      owner VARCHAR(100),
      currency VARCHAR(10) DEFAULT 'INR',
      units DECIMAL(15,4),
      cost_basis DECIMAL(15,2),
      current_value DECIMAL(15,2),
      sip_amount DECIMAL(15,2),
      sip_frequency VARCHAR(20),
      sip_expiry_date DATE,
      expected_return DECIMAL(5,4),
      notes TEXT,
      custom_data JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Financial asset table created');

  // Create financial_loan table
  await client.query(`
    CREATE TABLE IF NOT EXISTS financial_loan (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
      profile_id INTEGER REFERENCES financial_profile(id) ON DELETE CASCADE,
      lender VARCHAR(255),
      type VARCHAR(100),
      start_date DATE,
      end_date DATE,
      principal_outstanding DECIMAL(15,2),
      rate DECIMAL(5,4),
      emi DECIMAL(15,2),
      emi_day INTEGER,
      prepay_allowed BOOLEAN,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Financial loan table created');

  // Create financial_goal table
  await client.query(`
    CREATE TABLE IF NOT EXISTS financial_goal (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
      profile_id INTEGER REFERENCES financial_profile(id) ON DELETE CASCADE,
      name VARCHAR(255),
      target_amount DECIMAL(15,2),
      target_year INTEGER,
      target_date DATE,
      term VARCHAR(10) DEFAULT 'LT',
      recommended_allocation VARCHAR(255),
      funding_source VARCHAR(255),
      on_track BOOLEAN DEFAULT false,
      custom_data JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Financial goal table created');

  // Create financial_expense table
  await client.query(`
    CREATE TABLE IF NOT EXISTS financial_expense (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
      profile_id INTEGER REFERENCES financial_profile(id) ON DELETE CASCADE,
      category VARCHAR(255),
      subcategory VARCHAR(255),
      frequency VARCHAR(20) DEFAULT 'Monthly',
      amount DECIMAL(15,2),
      personal_inflation DECIMAL(5,4) DEFAULT 0.06,
      source VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Financial expense table created');

  // Create work_asset table
  await client.query(`
    CREATE TABLE IF NOT EXISTS work_asset (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
      profile_id INTEGER REFERENCES financial_profile(id) ON DELETE CASCADE,
      name VARCHAR(255),
      amount DECIMAL(15,2),
      growth_rate DECIMAL(5,4) DEFAULT 0.03,
      start_age INTEGER,
      end_age INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Work asset table created');

  // Create user_tags table
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_tags (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
      tag_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ User tags table created');

  // Create user_asset_columns table
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_asset_columns (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
      column_name VARCHAR(100) NOT NULL,
      column_type VARCHAR(50) DEFAULT 'text',
      is_visible BOOLEAN DEFAULT true,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ User asset columns table created');

  console.log('🎉 All tables created successfully!');
}

initRenderDatabase();
