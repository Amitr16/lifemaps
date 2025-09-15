#!/usr/bin/env python3
"""
Check goals in database
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

def check_goals():
    """Check goals in database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Get column names
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'financial_goal' 
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        print("Financial Goal Table Columns:")
        for col in columns:
            print(f"  {col[0]} ({col[1]})")
        
        print("\n" + "="*50)
        
        # Get goals data
        cursor.execute("SELECT * FROM financial_goal ORDER BY created_at DESC LIMIT 5")
        goals = cursor.fetchall()
        
        print(f"Found {len(goals)} goals in database:")
        for i, goal in enumerate(goals):
            print(f"\nGoal {i+1}:")
            for j, col in enumerate(columns):
                print(f"  {col[0]}: {goal[j]}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_goals()
