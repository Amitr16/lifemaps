#!/usr/bin/env python3
"""
Find where the goal data is actually stored
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

def find_goal_data():
    """Find where goal data is stored"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("🔍 Searching for goal data in all tables...")
        
        # Get all tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)
        all_tables = cursor.fetchall()
        
        print(f"Checking {len(all_tables)} tables...")
        
        for table in all_tables:
            table_name = table[0]
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            
            if count > 0:
                print(f"\n📋 Table: {table_name} ({count} rows)")
                
                # Get column info
                cursor.execute(f"""
                    SELECT column_name, data_type
                    FROM information_schema.columns 
                    WHERE table_name = '{table_name}' 
                    ORDER BY ordinal_position
                """)
                columns = cursor.fetchall()
                
                # Check if this looks like a goals table
                column_names = [col[0] for col in columns]
                has_goal_indicators = any(keyword in ' '.join(column_names).lower() 
                                        for keyword in ['goal', 'target', 'amount', 'description'])
                
                if has_goal_indicators:
                    print("  🎯 This looks like a goals table!")
                    print("  Columns:")
                    for col in columns:
                        print(f"    {col[0]} ({col[1]})")
                    
                    # Show sample data
                    cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
                    rows = cursor.fetchall()
                    print("  Sample data:")
                    for i, row in enumerate(rows):
                        print(f"    Row {i+1}: {row}")
                else:
                    print(f"  (Not a goals table)")
        
        print("\n" + "="*60)
        print("✅ Search complete!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    find_goal_data()
