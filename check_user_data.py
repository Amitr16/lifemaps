#!/usr/bin/env python3
"""
Check which user table has data
"""

import psycopg2
import os
from dotenv import load_dotenv

def main():
    # Load environment variables
    load_dotenv('backend/.env')
    
    # Connect to database
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'life_sheet'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'admin')
    )
    
    cur = conn.cursor()
    
    try:
        print("🔍 Checking user data in both tables...")
        
        # Check 'user' table
        try:
            cur.execute('SELECT COUNT(*) FROM "user"')
            user_count = cur.fetchone()[0]
            print(f"📊 'user' table: {user_count} records")
            
            if user_count > 0:
                cur.execute('SELECT id, email, name, created_at FROM "user" ORDER BY created_at DESC LIMIT 5')
                user_data = cur.fetchall()
                print("   Recent users:")
                for row in user_data:
                    print(f"     ID: {row[0]}, Email: {row[1]}, Name: {row[2]}, Created: {row[3]}")
        except Exception as e:
            print(f"❌ Error checking 'user' table: {e}")
        
        # Check 'users' table
        try:
            cur.execute('SELECT COUNT(*) FROM "users"')
            users_count = cur.fetchone()[0]
            print(f"📊 'users' table: {users_count} records")
            
            if users_count > 0:
                cur.execute('SELECT id, email, name, created_at FROM "users" ORDER BY created_at DESC LIMIT 5')
                users_data = cur.fetchall()
                print("   Recent users:")
                for row in users_data:
                    print(f"     ID: {row[0]}, Email: {row[1]}, Name: {row[2]}, Created: {row[3]}")
        except Exception as e:
            print(f"❌ Error checking 'users' table: {e}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
