#!/usr/bin/env python3
"""
Test the asset API to see what columns are being returned
"""

import psycopg2
import os
import json
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

def test_asset_api():
    """Test what the asset API would return"""
    print("🧪 Testing Asset API Response")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv()
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        with conn.cursor() as cur:
            # Get user 4's assets (the one with data)
            user_id = 4
            
            print(f"📝 Fetching assets for user {user_id}...")
            
            # Query assets with all columns
            cur.execute("""
                SELECT 
                    id, user_id, profile_id, name, tag, current_value,
                    holding_type, amount_per_month, start_date, end_date,
                    owner, liquidity, expected_return, custom_data,
                    created_at, updated_at
                FROM assets 
                WHERE user_id = %s
                ORDER BY id
            """, (user_id,))
            
            assets = cur.fetchall()
            print(f"✅ Found {len(assets)} assets")
            
            if assets:
                # Show the first asset with all its data
                asset = assets[0]
                print(f"\n📊 Sample asset data:")
                print(f"   ID: {asset[0]}")
                print(f"   Name: {asset[3]}")
                print(f"   Tag: {asset[4]}")
                print(f"   Current Value: {asset[5]}")
                print(f"   Holding Type: {asset[6]}")
                print(f"   Amount Per Month: {asset[7]}")
                print(f"   Start Date: {asset[8]}")
                print(f"   End Date: {asset[9]}")
                print(f"   Owner: {asset[10]}")
                print(f"   Liquidity: {asset[11]}")
                print(f"   Expected Return: {asset[12]}")
                print(f"   Custom Data: {asset[13]}")
                print(f"   Created: {asset[14]}")
                print(f"   Updated: {asset[15]}")
            
            # Get custom columns for this user
            print(f"\n📊 Custom columns for user {user_id}:")
            cur.execute("""
                SELECT column_key, column_label, column_type, column_order
                FROM user_asset_columns 
                WHERE user_id = %s 
                ORDER BY column_order, created_at
            """, (user_id,))
            
            custom_columns = cur.fetchall()
            print(f"✅ Found {len(custom_columns)} custom columns")
            
            for col in custom_columns:
                print(f"   - {col[0]} ({col[1]}) - {col[2]} (order: {col[3]})")
            
            # Test earmarking data
            print(f"\n🎯 Testing earmarking data...")
            for asset in assets:
                custom_data = asset[13]  # custom_data column
                if custom_data and 'goalEarmarks' in custom_data:
                    earmarks = custom_data['goalEarmarks']
                    print(f"   Asset {asset[0]} ({asset[3]}): {len(earmarks)} earmarks")
                    for earmark in earmarks:
                        print(f"     - {earmark.get('percent', 0)}% to Goal {earmark.get('goalId', 'unknown')}")
                else:
                    print(f"   Asset {asset[0]} ({asset[3]}): No earmarks")
    
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    test_asset_api()
