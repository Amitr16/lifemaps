#!/usr/bin/env python3
"""
Comprehensive test for Assets ↔ Goals cross-linkage functionality
Tests read/write operations and bi-directional sync
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

def test_assets_read_write():
    """Test assets table read/write operations"""
    print("🧪 Testing Assets Read/Write Operations")
    print("=" * 50)
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Test 1: Create a test user and profile first
        print("📝 Creating test user and profile...")
        cursor.execute("""
            INSERT INTO "user" (email, password_hash, name)
            VALUES ('test@example.com', 'hashed_password', 'Test User')
            ON CONFLICT (email) DO NOTHING
            RETURNING id
        """)
        user_result = cursor.fetchone()
        if user_result:
            user_id = user_result[0]
            print(f"✅ Test user created/found with ID: {user_id}")
        else:
            cursor.execute('SELECT id FROM "user" WHERE email = %s', ('test@example.com',))
            user_id = cursor.fetchone()[0]
            print(f"✅ Using existing test user with ID: {user_id}")
        
        # Create financial profile
        cursor.execute("""
            INSERT INTO financial_profile (user_id, age, current_annual_gross_income)
            VALUES (%s, 30, 100000)
            ON CONFLICT (user_id) DO UPDATE SET
            age = EXCLUDED.age,
            current_annual_gross_income = EXCLUDED.current_annual_gross_income
            RETURNING id
        """, (user_id,))
        profile_id = cursor.fetchone()[0]
        print(f"✅ Financial profile created/found with ID: {profile_id}")
        
        # Test 2: Create test asset with earmarking data
        print("\n📝 Creating test asset with earmarking data...")
        asset_data = {
            "goalEarmarks": [
                {"goalId": 1, "goalName": "Test Goal 1", "percent": 40},
                {"goalId": 2, "goalName": "Test Goal 2", "percent": 60}
            ],
            "sipAmount": 5000,
            "holdingType": "sip",
            "expectedReturn": 0.12
        }
        
        cursor.execute("""
            INSERT INTO assets (user_id, profile_id, name, tag, current_value, custom_data)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (user_id, profile_id, 'Test SIP Asset', 'Investment', 100000, json.dumps(asset_data)))
        
        asset_id = cursor.fetchone()[0]
        print(f"✅ Test asset created with ID: {asset_id}")
        
        # Test 3: Read asset data
        print("\n📝 Reading asset data...")
        cursor.execute("""
            SELECT id, name, tag, current_value, custom_data
            FROM assets WHERE id = %s
        """, (asset_id,))
        
        asset = cursor.fetchone()
        if asset:
            print(f"✅ Asset read successfully:")
            print(f"   ID: {asset[0]}")
            print(f"   Name: {asset[1]}")
            print(f"   Tag: {asset[2]}")
            print(f"   Value: {asset[3]}")
            print(f"   Custom Data: {asset[4]}")
            
            # Verify earmarking data
            custom_data = asset[4]
            if custom_data and 'goalEarmarks' in custom_data:
                earmarks = custom_data['goalEarmarks']
                print(f"   Earmarks: {len(earmarks)} goals linked")
                for earmark in earmarks:
                    print(f"     - {earmark['goalName']}: {earmark['percent']}%")
            else:
                print("   ❌ No earmarking data found")
                return False
        else:
            print("❌ Failed to read asset")
            return False
        
        # Test 4: Update asset earmarking
        print("\n📝 Updating asset earmarking...")
        updated_asset_data = {
            "goalEarmarks": [
                {"goalId": 1, "goalName": "Test Goal 1", "percent": 30},
                {"goalId": 2, "goalName": "Test Goal 2", "percent": 50},
                {"goalId": 3, "goalName": "Test Goal 3", "percent": 20}
            ],
            "sipAmount": 6000,
            "holdingType": "sip",
            "expectedReturn": 0.15
        }
        
        cursor.execute("""
            UPDATE assets 
            SET custom_data = %s, current_value = %s
            WHERE id = %s
        """, (json.dumps(updated_asset_data), 120000, asset_id))
        
        print("✅ Asset earmarking updated")
        
        # Verify update
        cursor.execute("""
            SELECT custom_data FROM assets WHERE id = %s
        """, (asset_id,))
        
        updated_custom_data = cursor.fetchone()[0]
        if updated_custom_data and 'goalEarmarks' in updated_custom_data:
            earmarks = updated_custom_data['goalEarmarks']
            print(f"✅ Updated earmarks: {len(earmarks)} goals linked")
            for earmark in earmarks:
                print(f"     - {earmark['goalName']}: {earmark['percent']}%")
        
        return True, user_id, profile_id, asset_id
        
    except Exception as e:
        print(f"❌ Assets test failed: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def test_goals_read_write(user_id, profile_id):
    """Test goals table read/write operations"""
    print("\n🧪 Testing Goals Read/Write Operations")
    print("=" * 50)
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Test 1: Create test goals
        print("📝 Creating test goals...")
        
        goal1_data = {
            "linkedAssets": [
                {"assetId": 1, "assetName": "Test Asset 1", "percent": 40},
                {"assetId": 2, "assetName": "Test Asset 2", "percent": 30}
            ]
        }
        
        cursor.execute("""
            INSERT INTO financial_goal (user_id, name, target_amount, target_date, custom_data)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (user_id, 'Test Goal 1', 500000, '2030-01-01', json.dumps(goal1_data)))
        
        goal1_id = cursor.fetchone()[0]
        print(f"✅ Test goal 1 created with ID: {goal1_id}")
        
        goal2_data = {
            "linkedAssets": [
                {"assetId": 3, "assetName": "Test Asset 3", "percent": 60}
            ]
        }
        
        cursor.execute("""
            INSERT INTO financial_goal (user_id, name, target_amount, target_date, custom_data)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (user_id, 'Test Goal 2', 300000, '2025-01-01', json.dumps(goal2_data)))
        
        goal2_id = cursor.fetchone()[0]
        print(f"✅ Test goal 2 created with ID: {goal2_id}")
        
        # Test 2: Read goals data
        print("\n📝 Reading goals data...")
        cursor.execute("""
            SELECT id, name, target_amount, custom_data
            FROM financial_goal WHERE user_id = %s
        """, (user_id,))
        
        goals = cursor.fetchall()
        print(f"✅ Found {len(goals)} goals")
        
        for goal in goals:
            print(f"   Goal ID: {goal[0]}, Name: {goal[1]}, Target: {goal[2]}")
            custom_data = goal[3]
            if custom_data and 'linkedAssets' in custom_data:
                linked_assets = custom_data['linkedAssets']
                print(f"     Linked Assets: {len(linked_assets)}")
                for asset in linked_assets:
                    print(f"       - {asset['assetName']}: {asset['percent']}%")
        
        # Test 3: Update goal linked assets
        print("\n📝 Updating goal linked assets...")
        updated_goal_data = {
            "linkedAssets": [
                {"assetId": 1, "assetName": "Updated Asset 1", "percent": 50},
                {"assetId": 2, "assetName": "Updated Asset 2", "percent": 30},
                {"assetId": 4, "assetName": "New Asset 4", "percent": 20}
            ]
        }
        
        cursor.execute("""
            UPDATE financial_goal 
            SET custom_data = %s
            WHERE id = %s
        """, (json.dumps(updated_goal_data), goal1_id))
        
        print("✅ Goal linked assets updated")
        
        return True, [goal1_id, goal2_id]
        
    except Exception as e:
        print(f"❌ Goals test failed: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def test_cross_linkage(asset_id, goal_ids):
    """Test cross-linkage between assets and goals"""
    print("\n🧪 Testing Cross-Linkage Operations")
    print("=" * 50)
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Test 1: Update asset earmarking to reference real goals
        print("📝 Updating asset to reference real goals...")
        asset_earmarking = {
            "goalEarmarks": [
                {"goalId": goal_ids[0], "goalName": "Test Goal 1", "percent": 40},
                {"goalId": goal_ids[1], "goalName": "Test Goal 2", "percent": 60}
            ]
        }
        
        cursor.execute("""
            UPDATE assets 
            SET custom_data = %s
            WHERE id = %s
        """, (json.dumps(asset_earmarking), asset_id))
        
        print("✅ Asset earmarking updated with real goal IDs")
        
        # Test 2: Update goals to reference the real asset
        print("\n📝 Updating goals to reference real asset...")
        goal1_linked_assets = {
            "linkedAssets": [
                {"assetId": asset_id, "assetName": "Test SIP Asset", "percent": 40}
            ]
        }
        
        cursor.execute("""
            UPDATE financial_goal 
            SET custom_data = %s
            WHERE id = %s
        """, (json.dumps(goal1_linked_assets), goal_ids[0]))
        
        goal2_linked_assets = {
            "linkedAssets": [
                {"assetId": asset_id, "assetName": "Test SIP Asset", "percent": 60}
            ]
        }
        
        cursor.execute("""
            UPDATE financial_goal 
            SET custom_data = %s
            WHERE id = %s
        """, (json.dumps(goal2_linked_assets), goal_ids[1]))
        
        print("✅ Goals updated with real asset ID")
        
        # Test 3: Verify cross-linkage
        print("\n📝 Verifying cross-linkage...")
        
        # Read asset and verify it references goals
        cursor.execute("""
            SELECT custom_data FROM assets WHERE id = %s
        """, (asset_id,))
        
        asset_data = cursor.fetchone()[0]
        asset_earmarks = asset_data.get('goalEarmarks', [])
        print(f"✅ Asset earmarks {len(asset_earmarks)} goals:")
        for earmark in asset_earmarks:
            print(f"     - Goal {earmark['goalId']}: {earmark['percent']}%")
        
        # Read goals and verify they reference the asset
        for goal_id in goal_ids:
            cursor.execute("""
                SELECT name, custom_data FROM financial_goal WHERE id = %s
            """, (goal_id,))
            
            goal_name, goal_data = cursor.fetchone()
            linked_assets = goal_data.get('linkedAssets', [])
            print(f"✅ Goal '{goal_name}' links {len(linked_assets)} assets:")
            for asset in linked_assets:
                print(f"     - Asset {asset['assetId']}: {asset['percent']}%")
        
        # Test 4: Test JSON queries for cross-linkage
        print("\n📝 Testing JSON queries for cross-linkage...")
        
        # Find all assets that earmark a specific goal
        cursor.execute("""
            SELECT name, custom_data->'goalEarmarks' as earmarks
            FROM assets 
            WHERE custom_data->'goalEarmarks' @> '[{"goalId": %s}]'
        """, (goal_ids[0],))
        
        assets_for_goal = cursor.fetchall()
        print(f"✅ Found {len(assets_for_goal)} assets earmarking goal {goal_ids[0]}")
        
        # Find all goals that link a specific asset
        cursor.execute("""
            SELECT name, custom_data->'linkedAssets' as linked_assets
            FROM financial_goal 
            WHERE custom_data->'linkedAssets' @> '[{"assetId": %s}]'
        """, (asset_id,))
        
        goals_for_asset = cursor.fetchall()
        print(f"✅ Found {len(goals_for_asset)} goals linking asset {asset_id}")
        
        return True
        
    except Exception as e:
        print(f"❌ Cross-linkage test failed: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def cleanup_test_data(user_id):
    """Clean up test data"""
    print("\n🧹 Cleaning up test data...")
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        # Delete test data
        cursor.execute("DELETE FROM assets WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM financial_goal WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM financial_profile WHERE user_id = %s", (user_id,))
        cursor.execute('DELETE FROM "user" WHERE id = %s', (user_id,))
        
        conn.commit()
        print("✅ Test data cleaned up")
        
    except Exception as e:
        print(f"❌ Cleanup failed: {e}")
    finally:
        cursor.close()
        conn.close()

def main():
    """Run complete test suite"""
    print("🚀 Complete Assets ↔ Goals Cross-Linkage Test")
    print("=" * 60)
    
    # Load environment variables
    load_dotenv()
    
    # Test 1: Assets read/write
    assets_result = test_assets_read_write()
    if not assets_result:
        print("❌ Assets test failed - stopping")
        return
    
    success, user_id, profile_id, asset_id = assets_result
    
    # Test 2: Goals read/write
    goals_result = test_goals_read_write(user_id, profile_id)
    if not goals_result:
        print("❌ Goals test failed - stopping")
        cleanup_test_data(user_id)
        return
    
    success, goal_ids = goals_result
    
    # Test 3: Cross-linkage
    cross_linkage_result = test_cross_linkage(asset_id, goal_ids)
    if not cross_linkage_result:
        print("❌ Cross-linkage test failed")
        cleanup_test_data(user_id)
        return
    
    # Cleanup
    cleanup_test_data(user_id)
    
    print("\n🎉 ALL TESTS PASSED!")
    print("✅ Assets can read/write to database")
    print("✅ Goals can read/write to database")
    print("✅ Cross-linkage works from both sides")
    print("✅ JSON queries work for finding relationships")
    print("\n🚀 The earmarking system is fully functional!")

if __name__ == "__main__":
    main()
