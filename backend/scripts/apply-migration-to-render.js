#!/usr/bin/env node
/**
 * Helper script to apply a migration script to Render.com database
 * 
 * Usage:
 *   node backend/scripts/apply-migration-to-render.js <migration-file.sql>
 * 
 * Example:
 *   node backend/scripts/apply-migration-to-render.js 2025-01-29_add_new_column.sql
 * 
 * Environment Variables Required:
 *   RENDER_DATABASE_URL - Full connection string to Render database
 *   OR set: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration(migrationFile) {
  try {
    if (!migrationFile) {
      console.error('❌ Error: Migration file not specified');
      console.log('\nUsage: node apply-migration-to-render.js <migration-file.sql>');
      console.log('Example: node apply-migration-to-render.js 2025-01-29_add_new_column.sql');
      process.exit(1);
    }
    
    // Resolve migration file path
    const migrationPath = path.join(__dirname, migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Error: Migration file not found: ${migrationPath}`);
      process.exit(1);
    }
    
    console.log('🚀 Applying migration to Render.com database...\n');
    console.log(`📄 Migration file: ${migrationFile}\n`);
    
    // Read migration SQL
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Check if DATABASE_URL is set (for Render)
    const dbUrl = process.env.DATABASE_URL || process.env.RENDER_DATABASE_URL;
    
    if (!dbUrl) {
      console.error('❌ Error: DATABASE_URL or RENDER_DATABASE_URL not set');
      console.log('\n💡 To get your Render database URL:');
      console.log('   1. Go to Render Dashboard → Your Database');
      console.log('   2. Click "Info" tab');
      console.log('   3. Copy "Internal Database URL" or "External Connection String"');
      console.log('   4. Set it as: export DATABASE_URL="your-connection-string"');
      process.exit(1);
    }
    
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected!\n');
    
    console.log('📝 Executing migration...');
    console.log('─'.repeat(50));
    
    // Execute migration
    await client.query(migrationSQL);
    
    console.log('─'.repeat(50));
    console.log('✅ Migration applied successfully!\n');
    
    // Verify by checking tables
    console.log('🔍 Verifying changes...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`📊 Database now has ${tablesResult.rows.length} tables`);
    
    client.release();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(50));
    console.log('\n💡 Next steps:');
    console.log('  1. Verify the changes in Render dashboard');
    console.log('  2. Test your application to ensure everything works');
    console.log('  3. Check application logs for any errors\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error applying migration:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Get migration file from command line arguments
const migrationFile = process.argv[2];
applyMigration(migrationFile);

