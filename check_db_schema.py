#!/usr/bin/env python3
"""
Check the actual database schema to understand the table structure
"""

import psycopg2
import os
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
        return None

def check_schema():
    """Check the database schema"""
    print("🔍 Checking Database Schema")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv()
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        # Check user table structure
        print("📝 User table structure:")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'user' 
            ORDER BY ordinal_position
        """)
        
        user_columns = cursor.fetchall()
        for col in user_columns:
            print(f"   {col[0]}: {col[1]} ({'NULL' if col[2] == 'YES' else 'NOT NULL'})")
        
        # Check financial_goal table structure
        print("\n📝 Financial_goal table structure:")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'financial_goal' 
            ORDER BY ordinal_position
        """)
        
        goal_columns = cursor.fetchall()
        for col in goal_columns:
            print(f"   {col[0]}: {col[1]} ({'NULL' if col[2] == 'YES' else 'NOT NULL'})")
        
        # Check assets table structure
        print("\n📝 Assets table structure:")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'assets' 
            ORDER BY ordinal_position
        """)
        
        asset_columns = cursor.fetchall()
        for col in asset_columns:
            print(f"   {col[0]}: {col[1]} ({'NULL' if col[2] == 'YES' else 'NOT NULL'})")
        
        # Check if custom_data exists in both tables
        print("\n📝 Checking for custom_data columns:")
        
        cursor.execute("""
            SELECT table_name, column_name, data_type
            FROM information_schema.columns 
            WHERE column_name = 'custom_data'
            AND table_name IN ('financial_goal', 'assets')
        """)
        
        custom_data_columns = cursor.fetchall()
        for col in custom_data_columns:
            print(f"   {col[0]}.{col[1]}: {col[2]}")
        
        # Check existing data
        print("\n📝 Checking existing data:")
        
        cursor.execute('SELECT COUNT(*) FROM "user"')
        user_count = cursor.fetchone()[0]
        print(f"   Users: {user_count}")
        
        cursor.execute('SELECT COUNT(*) FROM financial_goal')
        goal_count = cursor.fetchone()[0]
        print(f"   Goals: {goal_count}")
        
        cursor.execute('SELECT COUNT(*) FROM assets')
        asset_count = cursor.fetchone()[0]
        print(f"   Assets: {asset_count}")
        
        # Check if there's any data with custom_data
        cursor.execute("""
            SELECT COUNT(*) FROM financial_goal 
            WHERE custom_data IS NOT NULL AND custom_data != '{}'
        """)
        goal_custom_count = cursor.fetchone()[0]
        print(f"   Goals with custom_data: {goal_custom_count}")
        
        cursor.execute("""
            SELECT COUNT(*) FROM assets 
            WHERE custom_data IS NOT NULL AND custom_data != '{}'
        """)
        asset_custom_count = cursor.fetchone()[0]
        print(f"   Assets with custom_data: {asset_custom_count}")
        
    except Exception as e:
        print(f"❌ Schema check failed: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    check_schema()
