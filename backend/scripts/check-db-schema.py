#!/usr/bin/env python3
"""
Script to check database schema and identify missing tables/columns
Helps identify what needs to be migrated to Render.com
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join('backend', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

def get_db_connection():
    """Get database connection from environment variables"""
    if os.getenv('DATABASE_URL'):
        return psycopg2.connect(os.getenv('DATABASE_URL'))
    else:
        return psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            database=os.getenv('DB_NAME', 'life_sheet'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'password')
        )

def check_schema():
    """Check database schema and report findings"""
    try:
        print('🔍 Checking database schema...\n')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        
        print('📊 Existing Tables:')
        print('─' * 50)
        for table in tables:
            print(f'  ✓ {table[0]}')
        print(f'\nTotal: {len(tables)} tables\n')
        
        # Check for key tables that should exist
        expected_tables = [
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
        ]
        
        existing_table_names = [t[0] for t in tables]
        missing_tables = [t for t in expected_tables if t not in existing_table_names]
        
        if missing_tables:
            print('⚠️  Missing Tables:')
            print('─' * 50)
            for table in missing_tables:
                print(f'  ✗ {table}')
            print('')
        else:
            print('✅ All expected tables exist!\n')
        
        # Check financial_expense columns (most commonly modified)
        print('📋 financial_expense table columns:')
        print('─' * 50)
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'financial_expense'
            ORDER BY ordinal_position;
        """)
        
        expense_columns = cursor.fetchall()
        for col in expense_columns:
            nullable = 'NULL' if col[2] == 'YES' else 'NOT NULL'
            print(f'  {col[0]:<30} {col[1]:<20} {nullable}')
        
        # Check for key columns that should exist
        expected_expense_columns = [
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
            'notes',
            'created_at',
            'updated_at'
        ]
        
        existing_column_names = [c[0] for c in expense_columns]
        missing_columns = [c for c in expected_expense_columns if c not in existing_column_names]
        
        if missing_columns:
            print('\n⚠️  Missing Columns in financial_expense:')
            print('─' * 50)
            for col in missing_columns:
                print(f'  ✗ {col}')
            print('')
        else:
            print('\n✅ All expected columns exist in financial_expense!\n')
        
        # Check financial_loan columns
        print('📋 financial_loan table columns:')
        print('─' * 50)
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'financial_loan'
            ORDER BY ordinal_position;
        """)
        
        loan_columns = cursor.fetchall()
        for col in loan_columns:
            nullable = 'NULL' if col[2] == 'YES' else 'NOT NULL'
            print(f'  {col[0]:<30} {col[1]:<20} {nullable}')
        
        # Check indexes
        print('\n📇 Indexes on financial_expense:')
        print('─' * 50)
        cursor.execute("""
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'financial_expense'
            ORDER BY indexname;
        """)
        
        indexes = cursor.fetchall()
        if indexes:
            for idx in indexes:
                print(f'  ✓ {idx[0]}')
        else:
            print('  (no indexes found)')
        
        cursor.close()
        conn.close()
        
        print('\n' + '=' * 50)
        print('✅ Schema check completed!')
        print('=' * 50)
        print('\n💡 Next steps:')
        print('  1. Review the missing tables/columns above')
        print('  2. Create migration scripts for any missing items')
        print('  3. Test migrations locally')
        print('  4. Apply to Render.com database\n')
        
    except psycopg2.Error as e:
        print(f'❌ Database error: {e}')
        sys.exit(1)
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    check_schema()

