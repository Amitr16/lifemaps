/**
 * Migration script for Render.com
 * Creates admin and super_admin tables
 * Run this script on Render after deployment
 * 
 * Usage on Render:
 * 1. Go to Render dashboard -> Your service -> Shell
 * 2. Run: node backend/scripts/migrate-admin-tables.js
 * 
 * Or add to package.json scripts and run as build command
 */

import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

async function migrateAdminTables() {
  let client;
  try {
    console.log('🚀 Starting admin tables migration...');
    console.log('📊 Database:', process.env.DB_NAME || 'Not set');
    console.log('🔗 Host:', process.env.DB_HOST || 'Not set');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, '2025-01-31_create_admin_tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Get a client from the pool
    client = await pool.connect();
    console.log('✅ Connected to database');
    
    // Split SQL into individual statements (remove comments and empty lines)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;
      
      try {
        // Skip the INSERT statement for super admin (we'll handle it with bcrypt)
        if (statement.includes('INSERT INTO super_admin')) {
          console.log(`⏭️  Skipping INSERT statement (will handle with bcrypt)`);
          continue;
        }
        
        await client.query(statement);
        console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
      } catch (error) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists') || error.code === '42P07' || error.code === '42710') {
          console.log(`ℹ️  Statement ${i + 1}: ${error.message.split('\n')[0]}`);
        } else {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }
    
    // Create super admin with proper bcrypt hash
    console.log('👤 Creating/updating super admin...');
    const passwordHash = await bcrypt.hash('superadmin123', 12);
    
    const checkSuperAdmin = await client.query(
      'SELECT id FROM super_admin WHERE username = $1',
      ['superadmin']
    );
    
    if (checkSuperAdmin.rows.length === 0) {
      await client.query(
        'INSERT INTO super_admin (username, password_hash) VALUES ($1, $2)',
        ['superadmin', passwordHash]
      );
      console.log('✅ Super admin created: username=superadmin, password=superadmin123');
    } else {
      console.log('ℹ️  Super admin already exists');
    }
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run migration
migrateAdminTables();

