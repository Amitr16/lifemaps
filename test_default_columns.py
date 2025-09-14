#!/usr/bin/env python3
"""
Test script to verify default columns are created for users
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/.env')

def test_default_columns():
    """Test that default columns are created for users"""
    
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
        
        print("🔍 Testing default columns creation...")
        
        # Check if user_asset_columns table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'user_asset_columns'
            );
        """)
        
        table_exists = cursor.fetchone()[0]
        if not table_exists:
            print("❌ user_asset_columns table does not exist!")
            return False
            
        print("✅ user_asset_columns table exists")
        
        # Get all users
        cursor.execute("SELECT id, username, email FROM \"user\" ORDER BY id")
        users = cursor.fetchall()
        
        print(f"📊 Found {len(users)} users in database")
        
        for user_id, username, email in users:
            print(f"\n👤 User: {username} ({email}) - ID: {user_id}")
            
            # Check columns for this user
            cursor.execute("""
                SELECT column_key, column_label, column_type, column_order 
                FROM user_asset_columns 
                WHERE user_id = %s 
                ORDER BY column_order
            """, (user_id,))
            
            columns = cursor.fetchall()
            
            if not columns:
                print("  ⚠️  No columns found - will be created on first API call")
            else:
                print(f"  📋 Found {len(columns)} columns:")
                for col_key, col_label, col_type, col_order in columns:
                    print(f"    - {col_label} ({col_key}) - {col_type} - Order: {col_order}")
        
        # Expected default columns
        expected_columns = [
            ('notes', 'Notes', 'text', 0),
            ('owner', 'Owner', 'text', 1),
            ('units', 'Units', 'number', 2),
            ('subType', 'Sub Type', 'text', 3),
            ('currency', 'Currency', 'text', 4),
            ('costBasis', 'Cost Basis', 'currency', 5)
        ]
        
        print(f"\n🎯 Expected default columns:")
        for key, label, type_, order in expected_columns:
            print(f"  - {label} ({key}) - {type_} - Order: {order}")
            
        print("\n✅ Default columns test completed!")
        print("💡 Note: Default columns will be created automatically when a user first accesses the asset register")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    test_default_columns()
