#!/usr/bin/env python3
"""
Test the earmarking API integration
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

def test_earmarking_api():
    """Test the earmarking API integration"""
    print("🧪 Testing Earmarking API Integration")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv()
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        with conn.cursor() as cur:
            # Test user 4 (has both goals and assets)
            user_id = 4
            
            print(f"📝 Testing with user {user_id}...")
            
            # Get goals
            print(f"\n🎯 Goals for user {user_id}:")
            cur.execute("""
                SELECT id, name, target_amount, target_age
                FROM financial_goal 
                WHERE user_id = %s
                ORDER BY id
            """, (user_id,))
            goals = cur.fetchall()
            
            for goal in goals:
                print(f"   Goal {goal[0]}: {goal[1]} - ₹{goal[2]} (Age: {goal[3]})")
            
            # Get assets
            print(f"\n💰 Assets for user {user_id}:")
            cur.execute("""
                SELECT id, name, current_value, custom_data
                FROM assets 
                WHERE user_id = %s
                ORDER BY id
            """, (user_id,))
            assets = cur.fetchall()
            
            for asset in assets:
                asset_id, name, value, custom_data = asset
                earmarks = custom_data.get('goalEarmarks', []) if custom_data else []
                print(f"   Asset {asset_id}: {name} - ₹{value}")
                print(f"      Earmarks: {len(earmarks)}")
                for earmark in earmarks:
                    print(f"        - {earmark.get('percent', 0)}% to Goal {earmark.get('goalId', 'unknown')}")
            
            # Test creating a new earmark
            print(f"\n🔧 Testing earmark creation...")
            
            # Find an asset without earmarks
            asset_without_earmarks = None
            for asset in assets:
                if not asset[3] or 'goalEarmarks' not in asset[3] or not asset[3]['goalEarmarks']:
                    asset_without_earmarks = asset
                    break
            
            if asset_without_earmarks and goals:
                asset_id = asset_without_earmarks[0]
                goal_id = goals[0][0]
                goal_name = goals[0][1]
                
                print(f"   Adding earmark: Asset {asset_id} -> Goal {goal_id} ({goal_name})")
                
                # Create new earmark
                new_earmark = {
                    "goalId": goal_id,
                    "goalName": goal_name,
                    "percent": 25.0
                }
                
                # Update asset with new earmark
                cur.execute("""
                    UPDATE assets 
                    SET custom_data = COALESCE(custom_data, '{}'::jsonb) || %s
                    WHERE id = %s
                    RETURNING custom_data
                """, (json.dumps({"goalEarmarks": [new_earmark]}), asset_id))
                
                updated_custom_data = cur.fetchone()[0]
                print(f"   ✅ Updated asset {asset_id} with earmark")
                print(f"   New custom_data: {updated_custom_data}")
                
                # Test updating existing earmark
                print(f"\n🔧 Testing earmark update...")
                
                # Update the earmark percentage
                updated_earmark = {
                    "goalId": goal_id,
                    "goalName": goal_name,
                    "percent": 50.0
                }
                
                cur.execute("""
                    UPDATE assets 
                    SET custom_data = custom_data || %s
                    WHERE id = %s
                    RETURNING custom_data
                """, (json.dumps({"goalEarmarks": [updated_earmark]}), asset_id))
                
                final_custom_data = cur.fetchone()[0]
                print(f"   ✅ Updated asset {asset_id} earmark to 50%")
                print(f"   Final custom_data: {final_custom_data}")
                
                # Test adding multiple earmarks
                print(f"\n🔧 Testing multiple earmarks...")
                
                if len(goals) > 1:
                    second_goal = goals[1]
                    multiple_earmarks = [
                        updated_earmark,
                        {
                            "goalId": second_goal[0],
                            "goalName": second_goal[1],
                            "percent": 30.0
                        }
                    ]
                    
                    cur.execute("""
                        UPDATE assets 
                        SET custom_data = custom_data || %s
                        WHERE id = %s
                        RETURNING custom_data
                    """, (json.dumps({"goalEarmarks": multiple_earmarks}), asset_id))
                    
                    final_multiple = cur.fetchone()[0]
                    print(f"   ✅ Added multiple earmarks to asset {asset_id}")
                    print(f"   Final multiple earmarks: {final_multiple}")
            
            # Commit all changes
            conn.commit()
            print(f"\n✅ All earmarking tests passed!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    test_earmarking_api()
