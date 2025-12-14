#!/usr/bin/env python3
"""
Migration script to sync all schema changes to Render.com
Date: 2025-01-29
Description: Ensures Render.com database has all tables, columns, and indexes that exist locally

Usage:
    python backend/scripts/2025-01-29_sync_all_schema_to_render.py

Environment Variables:
    DATABASE_URL - Full connection string to Render database
    OR set: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
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

def add_financial_expense_columns(cursor):
    """Add missing columns to financial_expense table"""
    print('[INFO] Adding columns to financial_expense table...')
    
    columns = [
        ('profile_id', 'INTEGER'),
        ('description', 'VARCHAR(255)'),
        ('order_index', 'INTEGER'),
        ('expense_type', 'VARCHAR(255)'),
        ('is_essential', 'BOOLEAN'),
        ('category', 'VARCHAR(255)'),
        ('subcategory', 'VARCHAR(255)'),
        ('personal_inflation', 'DECIMAL(5,4) DEFAULT 0.06'),
        ('source', 'VARCHAR(255)'),
        ('notes', 'TEXT'),
        ('tag_for', 'VARCHAR(255)'),
        ('lifestyle_level', 'VARCHAR(255)'),
        ('payment_from', 'VARCHAR(255)'),
        ('expiry', 'DATE'),
        ('loan_id', 'INTEGER REFERENCES financial_loan(id) ON DELETE CASCADE'),
    ]
    
    for col_name, col_type in columns:
        try:
            cursor.execute(f"""
                ALTER TABLE financial_expense 
                ADD COLUMN IF NOT EXISTS {col_name} {col_type};
            """)
            print(f'  [OK] Added column: {col_name}')
        except psycopg2.Error as e:
            if 'already exists' in str(e):
                print(f'  [SKIP] Column {col_name} already exists (skipping)')
            else:
                print(f'  [ERROR] Error adding {col_name}: {e}')
                raise

def add_financial_loan_columns(cursor):
    """Add missing columns to financial_loan table"""
    print('\n[INFO] Adding columns to financial_loan table...')
    
    columns = [
        ('profile_id', 'INTEGER'),
        ('name', 'VARCHAR(255)'),
        ('order_index', 'INTEGER'),
        ('lender', 'VARCHAR(255)'),
        ('type', 'VARCHAR(255)'),
        ('start_date', 'DATE'),
        ('end_date', 'DATE'),
        ('principal_outstanding', 'DECIMAL(15,2)'),
        ('rate', 'DECIMAL(5,4)'),
        ('emi_day', 'INTEGER DEFAULT 1 CHECK (emi_day >= 1 AND emi_day <= 31)'),
        ('prepay_allowed', 'BOOLEAN DEFAULT TRUE'),
        ('notes', 'TEXT'),
        ('source', 'INTEGER'),
    ]
    
    for col_name, col_type in columns:
        try:
            cursor.execute(f"""
                ALTER TABLE financial_loan 
                ADD COLUMN IF NOT EXISTS {col_name} {col_type};
            """)
            print(f'  [OK] Added column: {col_name}')
        except psycopg2.Error as e:
            if 'already exists' in str(e):
                print(f'  [SKIP] Column {col_name} already exists (skipping)')
            else:
                print(f'  [ERROR] Error adding {col_name}: {e}')
                raise

def add_indexes(cursor):
    """Add indexes for better performance"""
    print('\n[INFO] Adding indexes...')
    
    indexes = [
        ('idx_financial_expense_category', 'financial_expense', 'category'),
        ('idx_financial_expense_lifestyle_level', 'financial_expense', 'lifestyle_level'),
        ('idx_financial_expense_loan_id', 'financial_expense', 'loan_id'),
        ('idx_financial_expense_payment_from', 'financial_expense', 'payment_from'),
        ('idx_financial_expense_tag_for', 'financial_expense', 'tag_for'),
        ('idx_financial_expense_expiry', 'financial_expense', 'expiry'),
        ('idx_financial_expense_profile_id', 'financial_expense', 'profile_id'),
        ('idx_financial_loan_profile_id', 'financial_loan', 'profile_id'),
        ('idx_financial_loan_lender', 'financial_loan', 'lender'),
        ('idx_financial_loan_type', 'financial_loan', 'type'),
    ]
    
    for idx_name, table_name, column_name in indexes:
        try:
            cursor.execute(f"""
                CREATE INDEX IF NOT EXISTS {idx_name} 
                ON {table_name}({column_name});
            """)
            print(f'  [OK] Created index: {idx_name}')
        except psycopg2.Error as e:
            if 'already exists' in str(e):
                print(f'  [SKIP] Index {idx_name} already exists (skipping)')
            else:
                print(f'  [ERROR] Error creating index {idx_name}: {e}')

def add_foreign_keys(cursor):
    """Add foreign key constraints if they don't exist"""
    print('\n[INFO] Adding foreign key constraints...')
    
    # Check and add foreign key for financial_expense.profile_id
    try:
        cursor.execute("""
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'financial_expense_profile_id_fkey';
        """)
        if cursor.fetchone():
            print('  [SKIP] Foreign key financial_expense_profile_id_fkey already exists')
        else:
            cursor.execute("""
                ALTER TABLE financial_expense 
                ADD CONSTRAINT financial_expense_profile_id_fkey 
                FOREIGN KEY (profile_id) REFERENCES financial_profile(id) ON DELETE CASCADE;
            """)
            print('  [OK] Added foreign key: financial_expense_profile_id_fkey')
    except psycopg2.Error as e:
        print(f'  [WARN] Could not add financial_expense_profile_id_fkey: {e}')
    
    # Check and add foreign key for financial_loan.profile_id
    try:
        cursor.execute("""
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'financial_loan_profile_id_fkey';
        """)
        if cursor.fetchone():
            print('  [SKIP] Foreign key financial_loan_profile_id_fkey already exists')
        else:
            cursor.execute("""
                ALTER TABLE financial_loan 
                ADD CONSTRAINT financial_loan_profile_id_fkey 
                FOREIGN KEY (profile_id) REFERENCES financial_profile(id) ON DELETE CASCADE;
            """)
            print('  [OK] Added foreign key: financial_loan_profile_id_fkey')
    except psycopg2.Error as e:
        print(f'  [WARN] Could not add financial_loan_profile_id_fkey: {e}')

def verify_migration(cursor):
    """Verify the migration by checking columns and indexes"""
    print('\n[INFO] Verifying migration...')
    
    # Check financial_expense columns
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'financial_expense'
        ORDER BY column_name;
    """)
    expense_columns = [row[0] for row in cursor.fetchall()]
    
    expected_columns = [
        'id', 'user_id', 'profile_id', 'description', 'amount', 'order_index',
        'expense_type', 'frequency', 'is_essential', 'category', 'subcategory',
        'personal_inflation', 'source', 'notes', 'tag_for', 'lifestyle_level',
        'payment_from', 'expiry', 'loan_id', 'created_at', 'updated_at'
    ]
    
    missing_columns = [col for col in expected_columns if col not in expense_columns]
    
    if missing_columns:
        print(f'  [WARN] Missing columns in financial_expense: {missing_columns}')
    else:
        print(f'  [OK] All expected columns exist in financial_expense ({len(expense_columns)} total)')
    
    # Check indexes
    cursor.execute("""
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'financial_expense';
    """)
    indexes = [row[0] for row in cursor.fetchall()]
    print(f'  [OK] Found {len(indexes)} indexes on financial_expense')

def main():
    """Main migration function"""
    # Set UTF-8 encoding for Windows compatibility
    import sys
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    
    try:
        print('[START] Starting database schema migration...\n')
        print('=' * 60)
        
        # Check database connection
        db_url = os.getenv('DATABASE_URL')
        if db_url:
            print('[INFO] Connecting to database (using DATABASE_URL)...')
        else:
            print('[INFO] Connecting to database (using individual credentials)...')
        
        conn = get_db_connection()
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        print('[OK] Connected successfully!\n')
        
        # Run migrations
        add_financial_expense_columns(cursor)
        add_financial_loan_columns(cursor)
        add_indexes(cursor)
        add_foreign_keys(cursor)
        
        # Verify
        verify_migration(cursor)
        
        cursor.close()
        conn.close()
        
        print('\n' + '=' * 60)
        print('[SUCCESS] Migration completed successfully!')
        print('=' * 60)
        print('\n[INFO] Next steps:')
        print('  1. Test your application to ensure everything works')
        print('  2. Check application logs for any errors')
        print('  3. Commit this migration script to Git\n')
        
    except psycopg2.Error as e:
        print(f'\n[ERROR] Database error: {e.pgcode} - {e.pgerror}')
        sys.exit(1)
    except Exception as e:
        print(f'\n[ERROR] Error: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

