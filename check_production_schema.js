// Simple script to check if custom_data columns exist in production database
import pool from './backend/config/database.js';

async function checkProductionSchema() {
  try {
    console.log('🔍 Checking production database schema...');
    
    const client = await pool.connect();
    console.log('✅ Connected to production database');
    
    // Check if custom_data column exists in assets table
    const assetsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'assets' AND column_name = 'custom_data'
    `);
    
    console.log('📊 Assets custom_data column:', assetsColumns.rows);
    
    // Check if custom_data column exists in financial_goal table
    const goalsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'financial_goal' AND column_name = 'custom_data'
    `);
    
    console.log('🎯 Goals custom_data column:', goalsColumns.rows);
    
    // Check actual data in the tables
    const assetsData = await client.query(`
      SELECT id, name, custom_data 
      FROM assets 
      WHERE custom_data IS NOT NULL 
      AND custom_data != '{}'::jsonb
      LIMIT 5
    `);
    
    console.log('📊 Assets with custom_data:', assetsData.rows);
    
    const goalsData = await client.query(`
      SELECT id, name, custom_data 
      FROM financial_goal 
      WHERE custom_data IS NOT NULL 
      AND custom_data != '{}'::jsonb
      LIMIT 5
    `);
    
    console.log('🎯 Goals with custom_data:', goalsData.rows);
    
    client.release();
    console.log('✅ Schema check completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Schema check failed:', error);
    process.exit(1);
  }
}

checkProductionSchema();
