#!/usr/bin/env python3
"""
Check all goal-related tables in database
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

def check_goal_tables():
    """Check all goal-related tables"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Find all tables with 'goal' in the name
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%goal%'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        
        print("Tables with 'goal' in name:")
        for table in tables:
            print(f"  {table[0]}")
        
        print("\n" + "="*60)
        
        # Check each table
        for table in tables:
            table_name = table[0]
            print(f"\n📋 Table: {table_name}")
            
            # Get column info
            cursor.execute(f"""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = '{table_name}' 
                ORDER BY ordinal_position
            """)
            columns = cursor.fetchall()
            
            print("Columns:")
            for col in columns:
                nullable = "NULL" if col[2] == "YES" else "NOT NULL"
                print(f"  {col[0]} ({col[1]}) {nullable}")
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"Row count: {count}")
            
            # Show sample data
            if count > 0:
                cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
                rows = cursor.fetchall()
                print("Sample data:")
                for i, row in enumerate(rows):
                    print(f"  Row {i+1}: {row}")
            
            print("-" * 40)
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_goal_tables()
