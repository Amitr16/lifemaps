#!/usr/bin/env python3
"""
Check asset-related table names in database
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/.env')

def check_asset_tables():
    """Check what asset-related tables exist"""
    
    # Database connection
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'life_sheet'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'admin')
    )
    
    try:
        cursor = conn.cursor()
        
        print("🔍 Checking asset-related tables...")
        
        # Get all tables with 'asset' in the name
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE '%asset%' 
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        print("📊 Asset-related tables:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Check if assets table exists and has data
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'assets'
            );
        """)
        
        assets_exists = cursor.fetchone()[0]
        print(f"\n📋 'assets' table exists: {assets_exists}")
        
        if assets_exists:
            cursor.execute("SELECT COUNT(*) FROM assets")
            count = cursor.fetchone()[0]
            print(f"📊 Records in 'assets' table: {count}")
            
            if count > 0:
                cursor.execute("SELECT id, name, tag FROM assets LIMIT 3")
                samples = cursor.fetchall()
                print("📋 Sample records:")
                for record in samples:
                    print(f"  - ID: {record[0]}, Name: {record[1]}, Tag: {record[2]}")
        
        # Check if financial_asset table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'financial_asset'
            );
        """)
        
        financial_asset_exists = cursor.fetchone()[0]
        print(f"\n📋 'financial_asset' table exists: {financial_asset_exists}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_asset_tables()
