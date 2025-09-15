#!/usr/bin/env python3
"""
Test script to verify earmarking functionality
"""

import psycopg2
import os
import json
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

def test_earmarking_functionality():
    """Test the earmarking functionality"""
    print("🧪 Testing Earmarking Functionality")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv()
    
    # Get database connection
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        # Test 1: Check if custom_data column exists in financial_goal
        print("📝 Test 1: Checking custom_data column in financial_goal...")
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'financial_goal' 
            AND column_name = 'custom_data'
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"✅ custom_data column exists: {result[0]} ({result[1]})")
        else:
            print("❌ custom_data column not found")
            return
        
        # Test 2: Check if assets table has custom_data
        print("\n📝 Test 2: Checking custom_data column in assets...")
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'assets' 
            AND column_name = 'custom_data'
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"✅ custom_data column exists: {result[0]} ({result[1]})")
        else:
            print("❌ custom_data column not found")
        
        # Test 3: Test JSON operations
        print("\n📝 Test 3: Testing JSON operations...")
        
        # Insert test data
        test_goal_data = {
            "linkedAssets": [
                {"assetId": 1, "assetName": "Test Asset 1", "percent": 50},
                {"assetId": 2, "assetName": "Test Asset 2", "percent": 30}
            ]
        }
        
        test_asset_data = {
            "goalEarmarks": [
                {"goalId": 1, "goalName": "Test Goal 1", "percent": 40},
                {"goalId": 2, "goalName": "Test Goal 2", "percent": 60}
            ]
        }
        
        # Test JSON insertion
        cursor.execute("""
            INSERT INTO financial_goal (user_id, name, target_amount, custom_data)
            VALUES (1, 'Test Goal', 100000, %s)
            RETURNING id
        """, (json.dumps(test_goal_data),))
        
        goal_id = cursor.fetchone()[0]
        print(f"✅ Test goal created with ID: {goal_id}")
        
        cursor.execute("""
            INSERT INTO assets (user_id, profile_id, name, tag, current_value, custom_data)
            VALUES (1, 1, 'Test Asset', 'Investment', 50000, %s)
            RETURNING id
        """, (json.dumps(test_asset_data),))
        
        asset_id = cursor.fetchone()[0]
        print(f"✅ Test asset created with ID: {asset_id}")
        
        # Test JSON querying
        cursor.execute("""
            SELECT custom_data->'linkedAssets' as linked_assets
            FROM financial_goal 
            WHERE id = %s
        """, (goal_id,))
        
        result = cursor.fetchone()
        if result:
            linked_assets = result[0]
            print(f"✅ Goal linked assets: {linked_assets}")
        
        cursor.execute("""
            SELECT custom_data->'goalEarmarks' as goal_earmarks
            FROM assets 
            WHERE id = %s
        """, (asset_id,))
        
        result = cursor.fetchone()
        if result:
            goal_earmarks = result[0]
            print(f"✅ Asset goal earmarks: {goal_earmarks}")
        
        # Test JSON path queries
        cursor.execute("""
            SELECT custom_data->'linkedAssets'->0->>'assetName' as first_asset_name
            FROM financial_goal 
            WHERE id = %s
        """, (goal_id,))
        
        result = cursor.fetchone()
        if result:
            print(f"✅ First linked asset name: {result[0]}")
        
        # Clean up test data
        cursor.execute("DELETE FROM financial_goal WHERE id = %s", (goal_id,))
        cursor.execute("DELETE FROM assets WHERE id = %s", (asset_id,))
        print("✅ Test data cleaned up")
        
        print("\n🎉 All tests passed! Earmarking functionality is working correctly.")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    test_earmarking_functionality()
