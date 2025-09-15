#!/usr/bin/env python3
"""
Add custom_data JSONB field to financial_goal table for earmarking functionality
This is a minimal, non-breaking migration that preserves all existing functionality.
"""

import psycopg2
import os
import sys
from dotenv import load_dotenv

def get_db_connection():
    """Get database connection from environment variables"""
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            database=os.getenv('DB_NAME', 'life_sheet'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'admin')
        )
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)

def run_migration():
    """Run the goals custom_data migration"""
    print("🚀 Adding custom_data JSONB field to financial_goal table")
    print("=" * 60)
    
    # Load environment variables
    load_dotenv()
    
    # Get database connection
    conn = get_db_connection()
    print("✅ Connected to database")
    
    try:
        cursor = conn.cursor()
        
        # Check if custom_data column already exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'financial_goal' 
            AND column_name = 'custom_data'
        """)
        
        if cursor.fetchone():
            print("✅ custom_data column already exists in financial_goal table")
        else:
            # Add custom_data JSONB field
            print("📝 Adding custom_data JSONB column...")
            cursor.execute("""
                ALTER TABLE financial_goal 
                ADD COLUMN custom_data JSONB DEFAULT '{}'::jsonb
            """)
            print("✅ Added custom_data column")
        
        # Update existing goals to have empty custom_data
        print("📝 Updating existing goals...")
        cursor.execute("""
            UPDATE financial_goal 
            SET custom_data = '{}'::jsonb 
            WHERE custom_data IS NULL
        """)
        updated_rows = cursor.rowcount
        print(f"✅ Updated {updated_rows} existing goals with empty custom_data")
        
        # Add index for better performance on JSON queries
        print("📝 Adding GIN index for JSON queries...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_financial_goal_custom_data 
            ON financial_goal USING GIN (custom_data)
        """)
        print("✅ Added GIN index for custom_data")
        
        # Add comment for documentation
        print("📝 Adding column comment...")
        cursor.execute("""
            COMMENT ON COLUMN financial_goal.custom_data 
            IS 'Custom JSON data for storing linked assets and other metadata'
        """)
        print("✅ Added column documentation")
        
        # Commit all changes
        conn.commit()
        print("\n🎉 Migration completed successfully!")
        print("\n📋 Summary:")
        print("✅ Added custom_data JSONB field to financial_goal table")
        print("✅ Updated existing goals with empty custom_data")
        print("✅ Added GIN index for better JSON query performance")
        print("✅ Added column documentation")
        print("\n🚀 Goals table is now ready for earmarking functionality!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
