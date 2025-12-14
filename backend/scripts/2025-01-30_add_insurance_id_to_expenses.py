#!/usr/bin/env python3
"""
Migration script to add insurance_id column to financial_expense table
Date: 2025-01-30
Description: Adds insurance_id column to link insurance premiums to expenses

Usage:
    python backend/scripts/2025-01-30_add_insurance_id_to_expenses.py

Environment Variables:
    DATABASE_URL - Full connection string to database
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

def add_insurance_id_column(cursor):
    """Add insurance_id column to financial_expense table"""
    print('[INFO] Adding insurance_id column to financial_expense table...')
    
    try:
        # Check if column already exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='financial_expense' AND column_name='insurance_id'
        """)
        
        if cursor.fetchone():
            print('  [SKIP] Column insurance_id already exists')
            return
        
        # Add insurance_id column
        cursor.execute("""
            ALTER TABLE financial_expense 
            ADD COLUMN insurance_id INTEGER REFERENCES financial_insurance(id) ON DELETE CASCADE;
        """)
        print('  [OK] Added insurance_id column')
        
        # Create index for better query performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_financial_expense_insurance_id 
            ON financial_expense(insurance_id);
        """)
        print('  [OK] Created index on insurance_id')
        
    except psycopg2.Error as e:
        print(f'  [ERROR] Error adding insurance_id column: {e}')
        raise

def main():
    """Main migration function"""
    print('[START] Adding insurance_id to financial_expense table...\n')
    
    conn = None
    try:
        conn = get_db_connection()
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        add_insurance_id_column(cursor)
        
        print('\n[SUCCESS] Migration completed successfully!')
        
    except Exception as e:
        print(f'\n[ERROR] Migration failed: {e}')
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    main()

