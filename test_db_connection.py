#!/usr/bin/env python3
"""
PostgreSQL Connection Test Script
Tests various connection parameters to identify the correct database settings
"""

import psycopg2
import sys
from psycopg2 import sql

def test_connection(host, port, database, user, password):
    """Test PostgreSQL connection with given parameters"""
    try:
        print(f"🔍 Testing connection: {user}@{host}:{port}/{database}")
        
        # Create connection
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password
        )
        
        # Test query
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        
        print(f"✅ Connection successful!")
        print(f"📊 PostgreSQL version: {version[0]}")
        
        # Check if life_sheet database exists and has tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'financial_%'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        
        if tables:
            print(f"📋 Found {len(tables)} financial tables:")
            for table in tables:
                print(f"   - {table[0]}")
        else:
            print("⚠️  No financial tables found (database might be empty)")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Connection failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    print("🚀 PostgreSQL Connection Test")
    print("=" * 50)
    
    # Test configurations to try
    test_configs = [
        # (host, port, database, user, password)
        ("localhost", 5432, "life_sheet", "postgres", "admin"),
        ("localhost", 5432, "life_sheet", "postgres", "password"),
        ("localhost", 5432, "life_sheet", "postgres", "postgres"),
        ("localhost", 5432, "life_sheet", "postgres", ""),
        ("localhost", 5433, "life_sheet", "postgres", "admin"),
        ("127.0.0.1", 5432, "life_sheet", "postgres", "admin"),
        ("localhost", 5432, "postgres", "postgres", "admin"),  # Try default postgres database
    ]
    
    success_count = 0
    
    for config in test_configs:
        host, port, database, user, password = config
        print(f"\n{'='*60}")
        if test_connection(host, port, database, user, password):
            success_count += 1
            print(f"🎉 SUCCESS with: {user}@{host}:{port}/{database}")
            break  # Stop on first success
    
    print(f"\n{'='*60}")
    print(f"📊 Results: {success_count} successful connection(s) out of {len(test_configs)} attempts")
    
    if success_count == 0:
        print("\n❌ No successful connections found.")
        print("💡 Suggestions:")
        print("   1. Make sure PostgreSQL is running")
        print("   2. Check if the password is correct")
        print("   3. Verify the database 'life_sheet' exists")
        print("   4. Check if PostgreSQL is running on a different port")
        print("   5. Try connecting with your database management tool first")
    else:
        print("\n✅ At least one connection worked! Use those settings in your .env file.")

if __name__ == "__main__":
    main()
