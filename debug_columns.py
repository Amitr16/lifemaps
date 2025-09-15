#!/usr/bin/env python3
"""
Debug what columns exist for a user
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

def debug_columns():
    """Debug what columns exist for users"""
    print("🔍 Debugging Asset Columns")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv()
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        with conn.cursor() as cur:
            # Check all users and their columns
            print("📝 Checking all users...")
            cur.execute("SELECT id, username, email FROM \"user\" ORDER BY id")
            users = cur.fetchall()
            
            for user in users:
                user_id, username, email = user
                print(f"\n👤 User {user_id}: {username} ({email})")
                
                # Check asset columns for this user
                cur.execute("""
                    SELECT column_key, column_label, column_type, column_order
                    FROM user_asset_columns 
                    WHERE user_id = %s 
                    ORDER BY column_order, created_at
                """, (user_id,))
                columns = cur.fetchall()
                
                if columns:
                    print(f"   📊 Asset columns ({len(columns)}):")
                    for col in columns:
                        print(f"      - {col[0]} ({col[1]}) - {col[2]} (order: {col[3]})")
                else:
                    print("   📊 No asset columns found")
                
                # Check if user has assets
                cur.execute("SELECT COUNT(*) FROM assets WHERE user_id = %s", (user_id,))
                asset_count = cur.fetchone()[0]
                print(f"   💰 Assets: {asset_count}")
                
                # Check if user has goals
                cur.execute("SELECT COUNT(*) FROM financial_goal WHERE user_id = %s", (user_id,))
                goal_count = cur.fetchone()[0]
                print(f"   🎯 Goals: {goal_count}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    debug_columns()
