#!/usr/bin/env python3
"""
Check financial_goal table specifically
"""

import psycopg2

# Database connection parameters
DB_CONFIG = {
    'host': 'localhost',
    'database': 'lifemaps',
    'user': 'postgres',
    'password': 'admin',
    'port': 5432
}

def check_financial_goal():
    """Check financial_goal table"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Check financial_goal table
        print("📋 Checking financial_goal table:")
        
        # Get column info
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'financial_goal' 
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        
        print("Columns:")
        for col in columns:
            nullable = "NULL" if col[2] == "YES" else "NOT NULL"
            print(f"  {col[0]} ({col[1]}) {nullable}")
        
        # Get row count
        cursor.execute("SELECT COUNT(*) FROM financial_goal")
        count = cursor.fetchone()[0]
        print(f"\nRow count: {count}")
        
        # Show all data
        if count > 0:
            cursor.execute("SELECT * FROM financial_goal ORDER BY created_at DESC")
            rows = cursor.fetchall()
            print("\nAll data:")
            for i, row in enumerate(rows):
                print(f"  Row {i+1}: {row}")
        else:
            print("No data found in financial_goal table")
        
        # Also check if there's data in financial_goals (plural)
        print("\n" + "="*50)
        print("📋 Checking financial_goals table (plural):")
        
        cursor.execute("SELECT COUNT(*) FROM financial_goals")
        count_plural = cursor.fetchone()[0]
        print(f"Row count: {count_plural}")
        
        if count_plural > 0:
            cursor.execute("SELECT * FROM financial_goals ORDER BY created_at DESC")
            rows = cursor.fetchall()
            print("\nAll data:")
            for i, row in enumerate(rows):
                print(f"  Row {i+1}: {row}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_financial_goal()
