#!/usr/bin/env python3
"""
Database Migration Script for LifeMaps
This script runs all the necessary database migrations to set up the complete schema.
"""

import psycopg2
import os
from pathlib import Path

# Database connection parameters
DB_CONFIG = {
    'host': 'localhost',
    'database': 'lifemaps',
    'user': 'postgres',
    'password': 'admin',
    'port': 5432
}

def connect_to_db():
    """Connect to the PostgreSQL database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        print("✅ Connected to PostgreSQL database")
        return conn
    except psycopg2.Error as e:
        print(f"❌ Error connecting to database: {e}")
        return None

def run_sql_file(cursor, file_path):
    """Run a SQL file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            sql_content = file.read()
        
        print(f"📄 Running {file_path.name}...")
        cursor.execute(sql_content)
        print(f"✅ Successfully executed {file_path.name}")
        return True
    except Exception as e:
        print(f"❌ Error running {file_path.name}: {e}")
        return False

def main():
    """Main migration function"""
    print("🚀 Starting LifeMaps Database Migrations...")
    print("=" * 50)
    
    # Connect to database
    conn = connect_to_db()
    if not conn:
        return
    
    cursor = conn.cursor()
    
    # List of migration files in order
    migration_files = [
        "backend/scripts/init-db.sql",
        "backend/scripts/2025-09-14_autosave_compat.sql",
        "backend/scripts/2025-09-14_add_missing_columns.sql",
        "backend/scripts/2025-09-14_create_assets_table.sql",
        "backend/scripts/2025-09-14_create_user_tags_table.sql",
        "backend/scripts/2025-09-14_create_work_assets_table.sql",
        "backend/scripts/2025-09-14_add_target_age_to_goals.sql"
    ]
    
    success_count = 0
    total_count = len(migration_files)
    
    for migration_file in migration_files:
        file_path = Path(migration_file)
        if file_path.exists():
            if run_sql_file(cursor, file_path):
                success_count += 1
        else:
            print(f"⚠️  File not found: {migration_file}")
    
    # Summary
    print("=" * 50)
    print(f"📊 Migration Summary: {success_count}/{total_count} files executed successfully")
    
    if success_count == total_count:
        print("🎉 All migrations completed successfully!")
    else:
        print("⚠️  Some migrations failed. Please check the errors above.")
    
    # Test database connection and show tables
    try:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        print(f"\n📋 Database tables created: {len(tables)}")
        for table in tables:
            print(f"  - {table[0]}")
    except Exception as e:
        print(f"❌ Error listing tables: {e}")
    
    cursor.close()
    conn.close()
    print("\n✅ Database connection closed")

if __name__ == "__main__":
    main()
