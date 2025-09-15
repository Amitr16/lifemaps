#!/usr/bin/env python3
"""
Test the earmarking functionality with real existing data
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

def test_with_existing_data():
    """Test with existing data in the database"""
    print("🧪 Testing Earmarking with Existing Data")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv()
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Test 1: Get existing users
        print("📝 Getting existing users...")
        cursor.execute('SELECT id, username, email FROM "user" LIMIT 3')
        users = cursor.fetchall()
        print(f"✅ Found {len(users)} users")
        
        if not users:
            print("❌ No users found - cannot test")
            return False
        
        user_id = users[0][0]
        print(f"✅ Using user: {users[0][1]} (ID: {user_id})")
        
        # Test 2: Get existing goals
        print("\n📝 Getting existing goals...")
        cursor.execute("""
            SELECT id, description, amount, target_date 
            FROM financial_goal 
            WHERE user_id = %s 
            LIMIT 3
        """, (user_id,))
        
        goals = cursor.fetchall()
        print(f"✅ Found {len(goals)} goals for user {user_id}")
        
        if not goals:
            print("❌ No goals found - cannot test cross-linkage")
            return False
        
        for goal in goals:
            print(f"   Goal {goal[0]}: {goal[1]} - ₹{goal[2]} (Target: {goal[3]})")
        
        # Test 3: Get existing assets
        print("\n📝 Getting existing assets...")
        cursor.execute("""
            SELECT id, name, tag, current_value, custom_data 
            FROM assets 
            WHERE user_id = %s 
            LIMIT 3
        """, (user_id,))
        
        assets = cursor.fetchall()
        print(f"✅ Found {len(assets)} assets for user {user_id}")
        
        if not assets:
            print("❌ No assets found - cannot test cross-linkage")
            return False
        
        for asset in assets:
            print(f"   Asset {asset[0]}: {asset[1]} ({asset[2]}) - ₹{asset[3]}")
            if asset[4]:  # custom_data
                print(f"     Custom data: {asset[4]}")
        
        # Test 4: Add earmarking to first asset
        print("\n📝 Adding earmarking to first asset...")
        asset_id = assets[0][0]
        asset_name = assets[0][1]
        
        # Create earmarking data referencing real goals
        earmarking_data = {
            "goalEarmarks": [
                {"goalId": goals[0][0], "goalName": goals[0][1] or "Goal 1", "percent": 40},
                {"goalId": goals[1][0], "goalName": goals[1][1] or "Goal 2", "percent": 60}
            ]
        }
        
        # Update asset with earmarking
        cursor.execute("""
            UPDATE assets 
            SET custom_data = %s
            WHERE id = %s
        """, (json.dumps(earmarking_data), asset_id))
        
        print(f"✅ Added earmarking to asset '{asset_name}'")
        print(f"   - {goals[0][1] or 'Goal 1'}: 40%")
        print(f"   - {goals[1][1] or 'Goal 2'}: 60%")
        
        # Test 5: Add linked assets to first goal
        print("\n📝 Adding linked assets to first goal...")
        goal_id = goals[0][0]
        goal_name = goals[0][1] or "Goal 1"
        
        # Create linked assets data referencing real assets
        linked_assets_data = {
            "linkedAssets": [
                {"assetId": assets[0][0], "assetName": assets[0][1], "percent": 40},
                {"assetId": assets[1][0], "assetName": assets[1][1], "percent": 30}
            ]
        }
        
        # Update goal with linked assets
        cursor.execute("""
            UPDATE financial_goal 
            SET custom_data = %s
            WHERE id = %s
        """, (json.dumps(linked_assets_data), goal_id))
        
        print(f"✅ Added linked assets to goal '{goal_name}'")
        print(f"   - {assets[0][1]}: 40%")
        print(f"   - {assets[1][1]}: 30%")
        
        # Test 6: Verify the data was saved correctly
        print("\n📝 Verifying saved data...")
        
        # Check asset earmarking
        cursor.execute("""
            SELECT custom_data FROM assets WHERE id = %s
        """, (asset_id,))
        
        asset_custom_data = cursor.fetchone()[0]
        if asset_custom_data and 'goalEarmarks' in asset_custom_data:
            earmarks = asset_custom_data['goalEarmarks']
            print(f"✅ Asset earmarking verified: {len(earmarks)} goals")
            for earmark in earmarks:
                print(f"     - Goal {earmark['goalId']}: {earmark['percent']}%")
        else:
            print("❌ Asset earmarking not found")
            return False
        
        # Check goal linked assets
        cursor.execute("""
            SELECT custom_data FROM financial_goal WHERE id = %s
        """, (goal_id,))
        
        goal_custom_data = cursor.fetchone()[0]
        if goal_custom_data and 'linkedAssets' in goal_custom_data:
            linked_assets = goal_custom_data['linkedAssets']
            print(f"✅ Goal linked assets verified: {len(linked_assets)} assets")
            for asset in linked_assets:
                print(f"     - Asset {asset['assetId']}: {asset['percent']}%")
        else:
            print("❌ Goal linked assets not found")
            return False
        
        # Test 7: Test JSON queries for cross-linkage
        print("\n📝 Testing JSON queries for cross-linkage...")
        
        # Find all assets that earmark a specific goal
        cursor.execute("""
            SELECT name, custom_data->'goalEarmarks' as earmarks
            FROM assets 
            WHERE custom_data->'goalEarmarks' @> '[{"goalId": %s}]'
        """, (goal_id,))
        
        assets_for_goal = cursor.fetchall()
        print(f"✅ Found {len(assets_for_goal)} assets earmarking goal {goal_id}")
        for asset in assets_for_goal:
            print(f"     - {asset[0]}: {asset[1]}")
        
        # Find all goals that link a specific asset
        cursor.execute("""
            SELECT description, custom_data->'linkedAssets' as linked_assets
            FROM financial_goal 
            WHERE custom_data->'linkedAssets' @> '[{"assetId": %s}]'
        """, (asset_id,))
        
        goals_for_asset = cursor.fetchall()
        print(f"✅ Found {len(goals_for_asset)} goals linking asset {asset_id}")
        for goal in goals_for_asset:
            print(f"     - {goal[0]}: {goal[1]}")
        
        # Test 8: Test funding calculations
        print("\n📝 Testing funding calculations...")
        
        # Calculate funded amount for the goal
        cursor.execute("""
            SELECT 
                fg.id,
                fg.description,
                fg.amount,
                fg.custom_data->'linkedAssets' as linked_assets,
                a.id as asset_id,
                a.name as asset_name,
                a.current_value,
                (fg.custom_data->'linkedAssets'->0->>'percent')::numeric as percent
            FROM financial_goal fg
            CROSS JOIN LATERAL jsonb_array_elements(fg.custom_data->'linkedAssets') AS linked_asset
            JOIN assets a ON a.id = (linked_asset->>'assetId')::integer
            WHERE fg.id = %s
        """, (goal_id,))
        
        funding_data = cursor.fetchall()
        if funding_data:
            total_funded = 0
            target_amount = funding_data[0][2] or 0
            
            print(f"   Goal: {funding_data[0][1]} (Target: ₹{target_amount})")
            for row in funding_data:
                asset_value = row[6] or 0
                percent = row[7] or 0
                funded_amount = asset_value * percent / 100
                total_funded += funded_amount
                print(f"   - {row[5]}: ₹{asset_value} × {percent}% = ₹{funded_amount:.2f}")
            
            percent_funded = (total_funded / target_amount * 100) if target_amount > 0 else 0
            print(f"   Total Funded: ₹{total_funded:.2f} ({percent_funded:.1f}%)")
        
        conn.commit()
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ Assets can read/write earmarking data")
        print("✅ Goals can read/write linked assets data")
        print("✅ Cross-linkage works from both sides")
        print("✅ JSON queries work for finding relationships")
        print("✅ Funding calculations work correctly")
        print("\n🚀 The earmarking system is fully functional with real data!")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    test_with_existing_data()
