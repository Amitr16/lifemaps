#!/usr/bin/env python3
"""
Cleanup duplicate goal tables - keep only one
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Database connection parameters
DB_CONFIG = {
    'host': 'localhost',
    'database': 'lifemaps',
    'user': 'postgres',
    'password': 'admin',
    'port': 5432
}

def cleanup_duplicate_tables():
    """Clean up duplicate goal tables"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("🧹 Cleaning up duplicate goal tables...")
        
        # Check which tables exist
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('financial_goal', 'financial_goals')
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        
        print("Found tables:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Check data in each table
        for table in tables:
            table_name = table[0]
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"  {table_name}: {count} rows")
        
        print("\n" + "="*50)
        
        # Decide which table to keep
        # Check if financial_goal has data
        cursor.execute("SELECT COUNT(*) FROM financial_goal")
        goal_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM financial_goals")
        goals_count = cursor.fetchone()[0]
        
        if goal_count > 0:
            print("✅ financial_goal has data - keeping this table")
            table_to_keep = "financial_goal"
            table_to_drop = "financial_goals"
        elif goals_count > 0:
            print("✅ financial_goals has data - keeping this table")
            table_to_keep = "financial_goals"
            table_to_drop = "financial_goal"
        else:
            print("ℹ️  Both tables are empty - keeping financial_goal (singular)")
            table_to_keep = "financial_goal"
            table_to_drop = "financial_goals"
        
        # Drop the duplicate table
        print(f"\n🗑️  Dropping table: {table_to_drop}")
        cursor.execute(f"DROP TABLE IF EXISTS {table_to_drop} CASCADE")
        print(f"✅ Dropped {table_to_drop}")
        
        # Verify the remaining table
        print(f"\n📋 Verifying remaining table: {table_to_keep}")
        cursor.execute(f"SELECT COUNT(*) FROM {table_to_keep}")
        final_count = cursor.fetchone()[0]
        print(f"Final row count: {final_count}")
        
        if final_count > 0:
            cursor.execute(f"SELECT * FROM {table_to_keep} LIMIT 3")
            rows = cursor.fetchall()
            print("Sample data:")
            for i, row in enumerate(rows):
                print(f"  Row {i+1}: {row}")
        
        print("\n🎉 Cleanup complete!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    cleanup_duplicate_tables()
