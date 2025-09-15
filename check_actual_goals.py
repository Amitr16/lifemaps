#!/usr/bin/env python3
"""
Check the actual goals table with data
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

def check_actual_goals():
    """Check the actual goals table with data"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Check all tables to find the one with goal data
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)
        all_tables = cursor.fetchall()
        
        print("All tables in database:")
        for table in all_tables:
            print(f"  {table[0]}")
        
        print("\n" + "="*60)
        
        # Check each table for goal-like data
        for table in all_tables:
            table_name = table[0]
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            
            if count > 0:
                print(f"\n📋 Table: {table_name} (has {count} rows)")
                
                # Get column info
                cursor.execute(f"""
                    SELECT column_name, data_type
                    FROM information_schema.columns 
                    WHERE table_name = '{table_name}' 
                    ORDER BY ordinal_position
                """)
                columns = cursor.fetchall()
                
                print("Columns:")
                for col in columns:
                    print(f"  {col[0]} ({col[1]})")
                
                # Show sample data
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
    check_actual_goals()
