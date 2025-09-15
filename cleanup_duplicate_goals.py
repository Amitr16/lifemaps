#!/usr/bin/env python3
"""
Cleanup duplicate goals in the database
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

def connect_to_db():
    """Connect to the PostgreSQL database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        print("✅ Connected to PostgreSQL database")
        return conn
    except psycopg2.Error as e:
        print(f"❌ Error connecting to database: {e}")
        return None

def cleanup_duplicates():
    """Remove duplicate goals"""
    conn = connect_to_db()
    if not conn:
        return
    
    cursor = conn.cursor()
    
    try:
        # Find duplicates based on user_id, name, and target_amount
        cursor.execute("""
            SELECT user_id, name, target_amount, COUNT(*) as count
            FROM financial_goal 
            GROUP BY user_id, name, target_amount 
            HAVING COUNT(*) > 1
            ORDER BY user_id, name, target_amount
        """)
        
        duplicates = cursor.fetchall()
        
        if duplicates:
            print(f"Found {len(duplicates)} groups of duplicate goals:")
            for dup in duplicates:
                print(f"  User {dup[0]}: '{dup[1]}' - ${dup[2]} ({dup[3]} copies)")
            
            # Delete duplicates, keeping only the most recent one
            cursor.execute("""
                DELETE FROM financial_goal 
                WHERE id NOT IN (
                    SELECT DISTINCT ON (user_id, name, target_amount) id
                    FROM financial_goal 
                    ORDER BY user_id, name, target_amount, created_at DESC
                )
            """)
            
            deleted_count = cursor.rowcount
            print(f"✅ Deleted {deleted_count} duplicate goals")
        else:
            print("✅ No duplicate goals found")
            
        # Show current goals count
        cursor.execute("SELECT COUNT(*) FROM financial_goal")
        total_goals = cursor.fetchone()[0]
        print(f"📊 Total goals in database: {total_goals}")
        
    except Exception as e:
        print(f"❌ Error cleaning up duplicates: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    cleanup_duplicates()
