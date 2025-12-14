#!/usr/bin/env node
/**
 * Script to check database schema and identify missing tables/columns
 * Helps identify what needs to be migrated to Render.com
 */

import pool from '../config/database.js';

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema...\n');
    
    const client = await pool.connect();
    
    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('📊 Existing Tables:');
    console.log('─'.repeat(50));
    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    console.log(`\nTotal: ${tablesResult.rows.length} tables\n`);
    
    // Check for key tables that should exist
    const expectedTables = [
      'user',
      'financial_profile',
      'financial_goal',
      'financial_expense',
      'financial_loan',
      'expense_categories',
      'expense_tags',
      'assets',
      'work_assets',
      'user_tags'
    ];
    
    const existingTableNames = tablesResult.rows.map(r => r.table_name);
    const missingTables = expectedTables.filter(t => !existingTableNames.includes(t));
    
    if (missingTables.length > 0) {
      console.log('⚠️  Missing Tables:');
      console.log('─'.repeat(50));
      missingTables.forEach(table => {
        console.log(`  ✗ ${table}`);
      });
      console.log('');
    } else {
      console.log('✅ All expected tables exist!\n');
    }
    
    // Check financial_expense columns (most commonly modified)
    console.log('📋 financial_expense table columns:');
    console.log('─'.repeat(50));
    const expenseColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'financial_expense'
      ORDER BY ordinal_position;
    `);
    
    expenseColumns.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check for key columns that should exist
    const expectedExpenseColumns = [
      'id',
      'user_id',
      'category',
      'subcategory',
      'frequency',
      'amount',
      'expiry',
      'loan_id',
      'tag_for',
      'lifestyle_level',
      'payment_from',
      'description',
      'personal_inflation',
      'source',
      'notes'
    ];
    
    const existingColumnNames = expenseColumns.rows.map(r => r.column_name);
    const missingColumns = expectedExpenseColumns.filter(c => !existingColumnNames.includes(c));
    
    if (missingColumns.length > 0) {
      console.log('\n⚠️  Missing Columns in financial_expense:');
      console.log('─'.repeat(50));
      missingColumns.forEach(col => {
        console.log(`  ✗ ${col}`);
      });
      console.log('');
    } else {
      console.log('\n✅ All expected columns exist in financial_expense!\n');
    }
    
    // Check financial_loan columns
    console.log('📋 financial_loan table columns:');
    console.log('─'.repeat(50));
    const loanColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'financial_loan'
      ORDER BY ordinal_position;
    `);
    
    loanColumns.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check indexes
    console.log('\n📇 Indexes on financial_expense:');
    console.log('─'.repeat(50));
    const indexes = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'financial_expense'
      ORDER BY indexname;
    `);
    
    if (indexes.rows.length > 0) {
      indexes.rows.forEach(idx => {
        console.log(`  ✓ ${idx.indexname}`);
      });
    } else {
      console.log('  (no indexes found)');
    }
    
    client.release();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Schema check completed!');
    console.log('='.repeat(50));
    console.log('\n💡 Next steps:');
    console.log('  1. Review the missing tables/columns above');
    console.log('  2. Create migration scripts for any missing items');
    console.log('  3. Test migrations locally');
    console.log('  4. Apply to Render.com database\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
    process.exit(1);
  }
}

checkSchema();

