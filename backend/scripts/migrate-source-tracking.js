import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateSourceTracking() {
  try {
    console.log('🔄 Adding source tracking columns...');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'add_source_tracking.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute SQL
    await pool.query(sqlContent);
    
    console.log('✅ Source tracking columns added successfully!');
    console.log('📊 Added source columns to:');
    console.log('   - financial_profile (main page inputs)');
    console.log('   - financial_goal (goals page)');
    console.log('   - financial_expense (expenses page)');
    console.log('   - financial_loan (loans page)');
    console.log('   - assets (if exists)');
    console.log('   - work_assets (if exists)');
    console.log('   - user_source_preferences (new table)');
    
  } catch (error) {
    console.error('❌ Source tracking migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateSourceTracking();
}

export default migrateSourceTracking;
