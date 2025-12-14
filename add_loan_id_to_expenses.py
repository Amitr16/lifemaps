#!/usr/bin/env python3
"""
Migration script to add loan_id column to financial_expense table
for cross-linkage between loans and expenses
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

def main():
    """Main function to add loan_id column"""
    try:
        print("Connecting to database...")
        conn = get_db_connection()
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("Adding loan_id column to financial_expense table...")
        
        # Add loan_id column
        cursor.execute("""
            ALTER TABLE financial_expense 
            ADD COLUMN IF NOT EXISTS loan_id INTEGER REFERENCES financial_loan(id) ON DELETE CASCADE;
        """)
        print("  - Added loan_id column")
        
        # Add index for better performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_financial_expense_loan_id 
            ON financial_expense(loan_id);
        """)
        print("  - Added index on loan_id")
        
        # Add comment for documentation
        try:
            cursor.execute("""
                COMMENT ON COLUMN financial_expense.loan_id IS 'Reference to financial_loan.id - links expense to loan EMI';
            """)
            print("  - Added column comment")
        except Exception as e:
            print(f"  - Warning: Could not add comment: {e}")
        
        # Verify column exists
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'financial_expense' 
            AND column_name = 'loan_id';
        """)
        column = cursor.fetchone()
        
        if column:
            print(f"\n[OK] Verification - loan_id column created successfully!")
            print(f"  - Column: {column[0]}, Type: {column[1]}")
        else:
            print("\n[WARNING] Column verification failed")
        
        cursor.close()
        conn.close()
        
        print("\n[SUCCESS] Migration completed successfully!")
        
    except psycopg2.Error as e:
        print(f"[ERROR] Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

