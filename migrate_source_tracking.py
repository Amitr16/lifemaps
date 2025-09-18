#!/usr/bin/env python3
"""
Database migration script to add source tracking columns
Run this to add source tracking to your PostgreSQL database
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def migrate_database():
    """Add source tracking columns to the database"""
    
    # Database connection parameters
    # Use DATABASE_URL if available, otherwise fall back to individual params
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        # Parse DATABASE_URL
        from urllib.parse import urlparse
        parsed = urlparse(database_url)
        db_config = {
            'host': parsed.hostname,
            'port': parsed.port or 5432,
            'database': parsed.path[1:],  # Remove leading slash
            'user': parsed.username,
            'password': parsed.password
        }
    else:
        # Fallback to individual environment variables
        db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'life_sheet'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', 'admin')
        }
    
    print("🔄 Starting database migration for source tracking...")
    print(f"🔍 Connecting to database: {db_config['database']} on {db_config['host']}:{db_config['port']}")
    
    try:
        # Connect to database
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        
        print("✅ Connected to database successfully!")
        
        # Migration SQL
        migration_sql = """
        -- Add source tracking columns to existing tables
        -- 0 = main page/quick calculator, 1 = detailed page

        -- Add source column to financial_profile (for main page inputs)
        ALTER TABLE financial_profile 
        ADD COLUMN IF NOT EXISTS source INTEGER DEFAULT 0;

        -- Add source column to financial_goal (for goals page)
        ALTER TABLE financial_goal 
        ADD COLUMN IF NOT EXISTS source INTEGER DEFAULT 0;

        -- Add source column to financial_expense (for expenses page)
        ALTER TABLE financial_expense 
        ADD COLUMN IF NOT EXISTS source INTEGER DEFAULT 0;

        -- Add source column to financial_loan (for loans page)
        ALTER TABLE financial_loan 
        ADD COLUMN IF NOT EXISTS source INTEGER DEFAULT 0;

        -- Add source column to assets table (if it exists)
        DO $$ 
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets') THEN
                ALTER TABLE assets ADD COLUMN IF NOT EXISTS source INTEGER DEFAULT 0;
            END IF;
        END $$;

        -- Add source column to work_assets table (if it exists)
        DO $$ 
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_assets') THEN
                ALTER TABLE work_assets ADD COLUMN IF NOT EXISTS source INTEGER DEFAULT 0;
            END IF;
        END $$;

        -- Create a user_source_preferences table to track which source is active for each component
        CREATE TABLE IF NOT EXISTS user_source_preferences (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
            component VARCHAR(50) NOT NULL, -- 'assets', 'income', 'loans', 'expenses', 'goals'
            source INTEGER NOT NULL DEFAULT 0, -- 0 = main page, 1 = detailed page
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, component)
        );

        -- Create index for user_source_preferences
        CREATE INDEX IF NOT EXISTS idx_user_source_preferences_user_id ON user_source_preferences(user_id);

        -- Note: updated_at trigger not created as update_updated_at_column() function may not exist
        """
        
        # Execute migration
        print("🔄 Executing migration SQL...")
        cursor.execute(migration_sql)
        
        # Commit changes
        conn.commit()
        
        print("✅ Migration completed successfully!")
        print("📊 Added source columns to:")
        print("   - financial_profile (main page inputs)")
        print("   - financial_goal (goals page)")
        print("   - financial_expense (expenses page)")
        print("   - financial_loan (loans page)")
        print("   - assets (if exists)")
        print("   - work_assets (if exists)")
        print("   - user_source_preferences (new table)")
        
        # Verify the changes
        print("\n🔍 Verifying changes...")
        cursor.execute("""
            SELECT table_name, column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE column_name = 'source' 
            ORDER BY table_name;
        """)
        
        source_columns = cursor.fetchall()
        if source_columns:
            print("✅ Source columns found:")
            for table, column, data_type, default in source_columns:
                print(f"   - {table}.{column} ({data_type}, default: {default})")
        else:
            print("❌ No source columns found!")
        
        # Check if user_source_preferences table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'user_source_preferences'
            );
        """)
        
        if cursor.fetchone()[0]:
            print("✅ user_source_preferences table created successfully!")
        else:
            print("❌ user_source_preferences table not found!")
            
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
        print("🔌 Database connection closed.")
    
    return True

if __name__ == "__main__":
    success = migrate_database()
    if success:
        print("\n🎉 Migration completed successfully!")
        print("You can now use the source tracking system in your application.")
    else:
        print("\n💥 Migration failed!")
        print("Please check the error messages above and try again.")
