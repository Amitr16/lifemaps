#!/usr/bin/env python3
"""
Find a user that has both goals and assets for testing
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

def find_user_with_data():
    """Find a user that has both goals and assets"""
    print("🔍 Finding User with Both Goals and Assets")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv()
    
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor()
        
        # Find users with both goals and assets
        cursor.execute("""
            SELECT 
                u.id,
                u.username,
                u.email,
                COUNT(DISTINCT fg.id) as goal_count,
                COUNT(DISTINCT a.id) as asset_count
            FROM "user" u
            LEFT JOIN financial_goal fg ON u.id = fg.user_id
            LEFT JOIN assets a ON u.id = a.user_id
            GROUP BY u.id, u.username, u.email
            HAVING COUNT(DISTINCT fg.id) > 0 AND COUNT(DISTINCT a.id) > 0
            ORDER BY COUNT(DISTINCT fg.id) + COUNT(DISTINCT a.id) DESC
        """)
        
        users_with_data = cursor.fetchall()
        
        if not users_with_data:
            print("❌ No users found with both goals and assets")
            
            # Let's check what data exists
            print("\n📝 Checking data distribution...")
            
            cursor.execute("""
                SELECT 
                    u.id,
                    u.username,
                    COUNT(DISTINCT fg.id) as goal_count,
                    COUNT(DISTINCT a.id) as asset_count
                FROM "user" u
                LEFT JOIN financial_goal fg ON u.id = fg.user_id
                LEFT JOIN assets a ON u.id = a.user_id
                GROUP BY u.id, u.username
                ORDER BY u.id
            """)
            
            all_users = cursor.fetchall()
            for user in all_users:
                print(f"   User {user[0]} ({user[1]}): {user[2]} goals, {user[3]} assets")
            
            return None
        
        print(f"✅ Found {len(users_with_data)} users with both goals and assets:")
        
        for user in users_with_data:
            print(f"   User {user[0]} ({user[1]}): {user[2]} goals, {user[3]} assets")
        
        # Use the first user with data
        selected_user = users_with_data[0]
        user_id = selected_user[0]
        username = selected_user[1]
        
        print(f"\n✅ Selected user: {username} (ID: {user_id})")
        
        # Get details of goals and assets for this user
        print(f"\n📝 Goals for user {username}:")
        cursor.execute("""
            SELECT id, description, amount, target_date 
            FROM financial_goal 
            WHERE user_id = %s
        """, (user_id,))
        
        goals = cursor.fetchall()
        for goal in goals:
            print(f"   Goal {goal[0]}: {goal[1]} - ₹{goal[2]} (Target: {goal[3]})")
        
        print(f"\n📝 Assets for user {username}:")
        cursor.execute("""
            SELECT id, name, tag, current_value 
            FROM assets 
            WHERE user_id = %s
        """, (user_id,))
        
        assets = cursor.fetchall()
        for asset in assets:
            print(f"   Asset {asset[0]}: {asset[1]} ({asset[2]}) - ₹{asset[3]}")
        
        return user_id, username, goals, assets
        
    except Exception as e:
        print(f"❌ Error finding user data: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    result = find_user_with_data()
    if result:
        user_id, username, goals, assets = result
        print(f"\n🎯 Ready to test with user {username} (ID: {user_id})")
        print(f"   - {len(goals)} goals")
        print(f"   - {len(assets)} assets")
    else:
        print("\n❌ No suitable user found for testing")
