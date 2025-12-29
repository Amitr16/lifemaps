#!/usr/bin/env python3
"""
Complete migration script to set up insurance functionality
Date: 2025-01-30
Description: Creates financial_insurance table, adds profile_id and insurance_id columns

Usage:
    python backend/scripts/2025-01-30_setup_insurance_complete.py

Environment Variables:
    DATABASE_URL - Full connection string to database
"""

import os
import sys
from psycopg import connect
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
        return connect(os.getenv('DATABASE_URL'))
    else:
        return connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            dbname=os.getenv('DB_NAME', 'life_sheet'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'password')
        )

def create_insurance_table_if_not_exists(cursor):
    """Create financial_insurance table if it doesn't exist"""
    print('[INFO] Checking if financial_insurance table exists...')
    
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'financial_insurance'
        );
    """)
    table_exists = cursor.fetchone()[0]
    
    if not table_exists:
        print('  [INFO] Table does not exist, creating it...')
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS financial_insurance (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
                policy_type VARCHAR(255),
                cover DECIMAL(15,2),
                premium DECIMAL(15,2),
                frequency VARCHAR(20) CHECK (frequency IN ('Monthly', 'Quarterly', 'Yearly')) DEFAULT 'Yearly',
                provider VARCHAR(255),
                policy_number VARCHAR(255),
                start_date DATE,
                end_date DATE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """)
        print('  [OK] Created financial_insurance table')
        
        # Create index
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_financial_insurance_user_id 
            ON financial_insurance(user_id);
        """)
        print('  [OK] Created index on user_id')
    else:
        print('  [OK] Table already exists')

def create_update_function_if_not_exists(cursor):
    """Create update_updated_at_column function if it doesn't exist"""
    print('[INFO] Checking if update_updated_at_column function exists...')
    
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM pg_proc 
            WHERE proname = 'update_updated_at_column'
        );
    """)
    function_exists = cursor.fetchone()[0]
    
    if not function_exists:
        print('  [INFO] Function does not exist, creating it...')
        cursor.execute("""
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        """)
        print('  [OK] Created update_updated_at_column function')
    else:
        print('  [OK] Function already exists')
    
    # Create trigger for updated_at
    cursor.execute("""
        DROP TRIGGER IF EXISTS update_financial_insurance_updated_at ON financial_insurance;
        CREATE TRIGGER update_financial_insurance_updated_at 
        BEFORE UPDATE ON financial_insurance
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """)
    print('  [OK] Created/updated updated_at trigger')

def add_profile_id_column(cursor):
    """Add profile_id column to financial_insurance table"""
    print('\n[INFO] Adding profile_id column to financial_insurance table...')
    
    try:
        # Check if column already exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='financial_insurance' AND column_name='profile_id'
        """)
        
        if cursor.fetchone():
            print('  [SKIP] Column profile_id already exists')
        else:
            # Add profile_id column
            cursor.execute("""
                ALTER TABLE financial_insurance 
                ADD COLUMN profile_id INTEGER REFERENCES financial_profile(id) ON DELETE CASCADE;
            """)
            print('  [OK] Added profile_id column')
            
            # Update existing rows to have a profile_id (use the most recent profile for each user)
            cursor.execute("""
                UPDATE financial_insurance fi
                SET profile_id = (
                    SELECT id 
                    FROM financial_profile fp 
                    WHERE fp.user_id = fi.user_id 
                    ORDER BY fp.created_at DESC 
                    LIMIT 1
                )
                WHERE profile_id IS NULL;
            """)
            updated_count = cursor.rowcount
            print(f'  [OK] Updated {updated_count} existing insurance records with profile_id')
        
        # Create index for better query performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_financial_insurance_profile_id 
            ON financial_insurance(profile_id);
        """)
        print('  [OK] Created index on profile_id')
        
    except Exception as e:
        print(f'  [ERROR] Error adding profile_id column: {e}')
        raise

def add_insurance_id_to_expenses(cursor):
    """Add insurance_id column to financial_expense table"""
    print('\n[INFO] Adding insurance_id column to financial_expense table...')
    
    try:
        # Check if column already exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='financial_expense' AND column_name='insurance_id'
        """)
        
        if cursor.fetchone():
            print('  [SKIP] Column insurance_id already exists')
        else:
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
        
    except Exception as e:
        print(f'  [ERROR] Error adding insurance_id column: {e}')
        raise

def main():
    """Main migration function"""
    print('[START] Setting up insurance functionality...\n')
    
    # Check which database we're connecting to
    db_url = os.getenv('DATABASE_URL', '')
    if db_url:
        if 'render.com' in db_url or 'oregon-postgres.render.com' in db_url:
            print('[INFO] Connecting to Render.com database...')
        else:
            print('[INFO] Connecting to database using DATABASE_URL...')
    else:
        print('[INFO] Connecting to local database...')
    
    print()
    
    try:
        print("Connecting to database...")
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Step 1: Create insurance table if it doesn't exist
        create_insurance_table_if_not_exists(cursor)
        
        # Step 2: Create update function and trigger
        create_update_function_if_not_exists(cursor)
        
        # Step 3: Add profile_id to insurance table
        add_profile_id_column(cursor)
        
        # Step 4: Add insurance_id to expenses table
        add_insurance_id_to_expenses(cursor)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print('\n[SUCCESS] All insurance migrations completed successfully!')
        
    except Exception as e:
        print(f'\n[ERROR] Migration failed: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

