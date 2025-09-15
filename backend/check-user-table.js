#!/usr/bin/env node

// Check user table structure and data
import pool from './config/database.js';

async function checkUserTable() {
  try {
    console.log('🔍 Checking user table structure...');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user'
      );
    `);
    
    console.log('Table exists:', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Get table structure
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'user' 
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 Table structure:');
      structure.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Check current data
      const userCount = await pool.query('SELECT COUNT(*) FROM "user"');
      console.log(`👥 Current users: ${userCount.rows[0].count}`);
      
      // Show sample data
      const sampleUsers = await pool.query('SELECT id, email, username, first_name, last_name, created_at FROM "user" LIMIT 3');
      console.log('📊 Sample users:');
      sampleUsers.rows.forEach(user => {
        console.log(`  - ID: ${user.id}, Email: ${user.email}, Name: ${user.first_name} ${user.last_name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking user table:', error);
  } finally {
    await pool.end();
  }
}

checkUserTable();
