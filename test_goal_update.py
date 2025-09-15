#!/usr/bin/env python3
"""
Test script to verify goal update with custom_data
"""
import psycopg2
import json

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port="5432",
    database="life_sheet",
    user="postgres",
    password="admin"
)

def test_goal_update():
    cursor = conn.cursor()
    
    try:
        # First, let's see what goals exist
        print("🔍 Current goals in database:")
        cursor.execute("SELECT id, name, custom_data FROM financial_goal ORDER BY created_at DESC LIMIT 5")
        goals = cursor.fetchall()
        
        for goal in goals:
            print(f"  Goal ID: {goal[0]}, Name: {goal[1]}, Custom Data: {goal[2]}")
        
        if not goals:
            print("❌ No goals found in database")
            return
        
        # Test updating a goal with custom_data
        goal_id = goals[0][0]
        print(f"\n🧪 Testing update for goal ID: {goal_id}")
        
        # Create test custom_data
        test_custom_data = {
            "linkedAssets": [
                {
                    "assetId": 1,
                    "assetName": "Test Asset",
                    "percentage": 50.0,
                    "goalId": goal_id,
                    "goalName": "Test Goal"
                }
            ]
        }
        
        # Update the goal
        cursor.execute(
            "UPDATE financial_goal SET custom_data = %s, updated_at = NOW() WHERE id = %s RETURNING id, name, custom_data",
            [json.dumps(test_custom_data), goal_id]
        )
        
        result = cursor.fetchone()
        if result:
            print(f"✅ Goal updated successfully!")
            print(f"  Goal ID: {result[0]}")
            print(f"  Goal Name: {result[1]}")
            print(f"  Custom Data: {result[2]}")
        else:
            print("❌ Goal update failed")
        
        # Commit the changes
        conn.commit()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        cursor.close()

if __name__ == "__main__":
    test_goal_update()
    conn.close()
