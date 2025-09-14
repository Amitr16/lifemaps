#!/usr/bin/env python3
"""
Script to check and create the user_asset_columns table for the asset register
"""

import psycopg2
from psycopg2 import sql
import sys

# Database connection parameters
DB_CONFIG = {
    'host': 'localhost',
    'port': '5432',
    'database': 'life_sheet',
    'user': 'postgres',
    'password': 'admin'
}

def check_table_exists(cursor, table_name):
    """Check if a table exists in the database"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = %s
        );
    """, (table_name,))
    return cursor.fetchone()[0]

def create_user_asset_columns_table(cursor):
    """Create the user_asset_columns table"""
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS user_asset_columns (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        column_key VARCHAR(100) NOT NULL,
        column_label VARCHAR(255) NOT NULL,
        column_type VARCHAR(50) DEFAULT 'text',
        column_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, column_key)
    );
    """
    
    cursor.execute(create_table_sql)
    print("✅ Created user_asset_columns table")

def create_indexes(cursor):
    """Create indexes for better performance"""
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_user_asset_columns_user_id ON user_asset_columns(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_user_asset_columns_column_key ON user_asset_columns(column_key);"
    ]
    
    for index_sql in indexes:
        cursor.execute(index_sql)
    
    print("✅ Created indexes for user_asset_columns table")

def check_existing_tables(cursor):
    """Check what tables exist in the database"""
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    """)
    
    tables = cursor.fetchall()
    print("\n📋 Existing tables in database:")
    for table in tables:
        print(f"  - {table[0]}")
    
    return [table[0] for table in tables]

def check_user_asset_columns_structure(cursor):
    """Check the structure of user_asset_columns table"""
    cursor.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'user_asset_columns'
        ORDER BY ordinal_position;
    """)
    
    columns = cursor.fetchall()
    if columns:
        print("\n📊 user_asset_columns table structure:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]} (nullable: {col[2]}, default: {col[3]})")
    else:
        print("\n❌ user_asset_columns table not found")

def main():
    """Main function"""
    print("🔍 Checking database tables and creating user_asset_columns if needed...")
    
    try:
        # Connect to database
        print(f"🔗 Connecting to database: {DB_CONFIG['database']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("✅ Connected to database successfully")
        
        # Check existing tables
        existing_tables = check_existing_tables(cursor)
        
        # Check if user_asset_columns table exists
        if 'user_asset_columns' in existing_tables:
            print("\n✅ user_asset_columns table already exists")
            check_user_asset_columns_structure(cursor)
        else:
            print("\n❌ user_asset_columns table does not exist, creating it...")
            create_user_asset_columns_table(cursor)
            create_indexes(cursor)
            check_user_asset_columns_structure(cursor)
        
        # Check if assets table exists
        if 'assets' in existing_tables:
            print("\n✅ assets table exists")
        else:
            print("\n❌ assets table does not exist")
        
        # Commit changes
        conn.commit()
        print("\n🎉 Database setup completed successfully!")
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    main()
