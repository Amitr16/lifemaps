#!/usr/bin/env python3
"""
Complete Database Setup Script for LifeMaps
This script creates the database and runs all migrations.
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from pathlib import Path

# Database connection parameters
DB_CONFIG = {
    'host': 'localhost',
    'user': 'postgres',
    'password': 'admin',
    'port': 5432
}

def connect_to_postgres():
    """Connect to PostgreSQL server (not to a specific database)"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        print("✅ Connected to PostgreSQL server")
        return conn
    except psycopg2.Error as e:
        print(f"❌ Error connecting to PostgreSQL server: {e}")
        return None

def create_database(cursor, db_name):
    """Create the database if it doesn't exist"""
    try:
        # Check if database exists
        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'")
        exists = cursor.fetchone()
        
        if exists:
            print(f"✅ Database '{db_name}' already exists")
        else:
            cursor.execute(f"CREATE DATABASE {db_name}")
            print(f"✅ Created database '{db_name}'")
        return True
    except psycopg2.Error as e:
        print(f"❌ Error creating database: {e}")
        return False

def connect_to_database(db_name):
    """Connect to the specific database"""
    try:
        config = DB_CONFIG.copy()
        config['database'] = db_name
        conn = psycopg2.connect(**config)
        conn.autocommit = True
        print(f"✅ Connected to database '{db_name}'")
        return conn
    except psycopg2.Error as e:
        print(f"❌ Error connecting to database '{db_name}': {e}")
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
    """Main setup function"""
    print("🚀 Starting Complete LifeMaps Database Setup...")
    print("=" * 60)
    
    # Step 1: Connect to PostgreSQL server
    conn = connect_to_postgres()
    if not conn:
        return
    
    cursor = conn.cursor()
    
    # Step 2: Create the database
    if not create_database(cursor, 'lifemaps'):
        cursor.close()
        conn.close()
        return
    
    cursor.close()
    conn.close()
    
    # Step 3: Connect to the new database
    conn = connect_to_database('lifemaps')
    if not conn:
        return
    
    cursor = conn.cursor()
    
    # Step 4: Run all migrations
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
    print("=" * 60)
    print(f"📊 Migration Summary: {success_count}/{total_count} files executed successfully")
    
    if success_count == total_count:
        print("🎉 All migrations completed successfully!")
    else:
        print("⚠️  Some migrations failed. Please check the errors above.")
    
    # Test database and show tables
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
    print("\n✅ Database setup complete!")

if __name__ == "__main__":
    main()
