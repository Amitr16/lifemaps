#!/usr/bin/env python3
"""
Migration script to add new columns to financial_expense table
Adds: description, tag_for, lifestyle_level, payment_from
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
        # Production (Render/Railway) - use DATABASE_URL
        return psycopg2.connect(os.getenv('DATABASE_URL'))
    else:
        # Development - use individual environment variables
        return psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            database=os.getenv('DB_NAME', 'life_sheet'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'password')
        )

def main():
    """Main function to add expense columns"""
    try:
        print("Connecting to database...")
        conn = get_db_connection()
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("Adding new columns to financial_expense table...")
        
        # Add description column if it doesn't exist
        cursor.execute("""
            ALTER TABLE financial_expense 
            ADD COLUMN IF NOT EXISTS description VARCHAR(255);
        """)
        print("  - Added description column")
        
        # Add tag_for column
        cursor.execute("""
            ALTER TABLE financial_expense 
            ADD COLUMN IF NOT EXISTS tag_for VARCHAR(255);
        """)
        print("  - Added tag_for column")
        
        # Add lifestyle_level column
        cursor.execute("""
            ALTER TABLE financial_expense 
            ADD COLUMN IF NOT EXISTS lifestyle_level VARCHAR(50);
        """)
        print("  - Added lifestyle_level column")
        
        # Add payment_from column
        cursor.execute("""
            ALTER TABLE financial_expense 
            ADD COLUMN IF NOT EXISTS payment_from VARCHAR(255);
        """)
        print("  - Added payment_from column")
        
        # Create indexes for better performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_financial_expense_tag_for 
            ON financial_expense(tag_for);
        """)
        print("  - Created index on tag_for")
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_financial_expense_lifestyle_level 
            ON financial_expense(lifestyle_level);
        """)
        print("  - Created index on lifestyle_level")
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_financial_expense_payment_from 
            ON financial_expense(payment_from);
        """)
        print("  - Created index on payment_from")
        
        # Add comments for documentation
        try:
            cursor.execute("""
                COMMENT ON COLUMN financial_expense.description IS 'Specific goods or service description';
            """)
            cursor.execute("""
                COMMENT ON COLUMN financial_expense.amount IS 'Price per unit (based on frequency)';
            """)
            cursor.execute("""
                COMMENT ON COLUMN financial_expense.tag_for IS 'Tag indicating who the expense is for (e.g., Self, Family, Kids)';
            """)
            cursor.execute("""
                COMMENT ON COLUMN financial_expense.lifestyle_level IS 'Lifestyle level classification (e.g., Essential, Comfort, Luxury)';
            """)
            cursor.execute("""
                COMMENT ON COLUMN financial_expense.payment_from IS 'Payment source or method (e.g., Credit Card, Bank Account, Cash)';
            """)
            print("  - Added column comments")
        except Exception as e:
            print(f"  - Warning: Could not add comments: {e}")
        
        # Verify columns exist
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'financial_expense' 
            AND column_name IN ('description', 'tag_for', 'lifestyle_level', 'payment_from')
            ORDER BY column_name;
        """)
        columns = cursor.fetchall()
        
        print(f"\nVerification - Found {len(columns)} new columns:")
        for col_name, col_type in columns:
            print(f"  - {col_name}: {col_type}")
        
        cursor.close()
        conn.close()
        
        print("\nMigration completed successfully!")
        
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

