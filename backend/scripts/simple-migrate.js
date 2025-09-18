import pool from '../config/database.js';

async function simpleMigrate() {
  try {
    console.log('🔄 Adding source tracking columns...');
    
    // Add source columns
    await pool.query('ALTER TABLE financial_profile ADD COLUMN IF NOT EXISTS source INTEGER DEFAULT 0;');
    console.log('✅ Added source column to financial_profile');
    
    await pool.query('ALTER TABLE financial_goal ADD COLUMN IF NOT EXISTS source INTEGER DEFAULT 0;');
    console.log('✅ Added source column to financial_goal');
    
    await pool.query('ALTER TABLE financial_expense ADD COLUMN IF NOT EXISTS source INTEGER DEFAULT 0;');
    console.log('✅ Added source column to financial_expense');
    
    await pool.query('ALTER TABLE financial_loan ADD COLUMN IF NOT EXISTS source INTEGER DEFAULT 0;');
    console.log('✅ Added source column to financial_loan');
    
    // Create user_source_preferences table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_source_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
        component VARCHAR(50) NOT NULL,
        source INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, component)
      );
    `);
    console.log('✅ Created user_source_preferences table');
    
    // Create index
    await pool.query('CREATE INDEX IF NOT EXISTS idx_user_source_preferences_user_id ON user_source_preferences(user_id);');
    console.log('✅ Created index');
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

simpleMigrate();
