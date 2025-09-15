#!/usr/bin/env python3
"""
Test script to verify that custom_data is being saved and retrieved correctly
from the database for both goals and assets.
"""

import psycopg2
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_custom_data():
    """Test that custom_data is being saved and retrieved correctly"""
    
    # Database connection
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'life_sheet'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'admin')
    )
    
    try:
        with conn.cursor() as cur:
            print("🔍 Testing custom_data functionality...")
            
            # Test 1: Check if custom_data column exists in financial_goal table
            print("\n1. Checking financial_goal table structure...")
            cur.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'financial_goal' 
                AND column_name = 'custom_data'
            """)
            result = cur.fetchone()
            if result:
                print(f"✅ custom_data column exists: {result[0]} ({result[1]})")
            else:
                print("❌ custom_data column does NOT exist in financial_goal table")
                return
            
            # Test 2: Check if custom_data column exists in assets table
            print("\n2. Checking assets table structure...")
            cur.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'assets' 
                AND column_name = 'custom_data'
            """)
            result = cur.fetchone()
            if result:
                print(f"✅ custom_data column exists: {result[0]} ({result[1]})")
            else:
                print("❌ custom_data column does NOT exist in assets table")
                return
            
            # Test 3: Check existing goals with custom_data
            print("\n3. Checking existing goals with custom_data...")
            cur.execute("""
                SELECT id, name, custom_data 
                FROM financial_goal 
                WHERE custom_data IS NOT NULL 
                AND custom_data != '{}'::jsonb
                ORDER BY created_at DESC 
                LIMIT 5
            """)
            goals = cur.fetchall()
            if goals:
                print(f"✅ Found {len(goals)} goals with custom_data:")
                for goal in goals:
                    print(f"   - Goal {goal[0]}: {goal[1]} -> {goal[2]}")
            else:
                print("ℹ️  No goals found with custom_data")
            
            # Test 4: Check existing assets with custom_data
            print("\n4. Checking existing assets with custom_data...")
            cur.execute("""
                SELECT id, name, custom_data 
                FROM assets 
                WHERE custom_data IS NOT NULL 
                AND custom_data != '{}'::jsonb
                ORDER BY created_at DESC 
                LIMIT 5
            """)
            assets = cur.fetchall()
            if assets:
                print(f"✅ Found {len(assets)} assets with custom_data:")
                for asset in assets:
                    print(f"   - Asset {asset[0]}: {asset[1]} -> {asset[2]}")
            else:
                print("ℹ️  No assets found with custom_data")
            
            # Test 5: Test inserting a goal with custom_data
            print("\n5. Testing goal insertion with custom_data...")
            test_custom_data = {
                "linkedAssets": [
                    {"assetId": 1, "percentage": 50},
                    {"assetId": 2, "percentage": 30}
                ],
                "notes": "Test goal with custom data"
            }
            
            cur.execute("""
                INSERT INTO financial_goal (user_id, name, target_amount, custom_data)
                VALUES (1, 'Test Goal', 100000, %s)
                RETURNING id, custom_data
            """, (json.dumps(test_custom_data),))
            
            result = cur.fetchone()
            if result:
                print(f"✅ Goal inserted successfully: ID {result[0]}")
                print(f"   Custom data: {result[1]}")
                
                # Test retrieval
                cur.execute("SELECT custom_data FROM financial_goal WHERE id = %s", (result[0],))
                retrieved = cur.fetchone()
                if retrieved:
                    print(f"✅ Custom data retrieved: {retrieved[0]}")
                    
                    # Clean up test data
                    cur.execute("DELETE FROM financial_goal WHERE id = %s", (result[0],))
                    print("✅ Test data cleaned up")
                else:
                    print("❌ Failed to retrieve custom data")
            else:
                print("❌ Failed to insert goal with custom_data")
            
            print("\n🎉 Custom data functionality test completed!")
            
    except Exception as e:
        print(f"❌ Error during testing: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    test_custom_data()
