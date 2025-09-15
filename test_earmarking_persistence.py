#!/usr/bin/env python3
"""
Test script to verify earmarking changes are persisted to database
"""

import psycopg2
import json
from datetime import datetime

def test_earmarking_persistence():
    """Test if earmarking changes are properly saved to database"""
    
    # Database connection
    conn = psycopg2.connect(
        host="localhost",
        port="5432",
        database="life_sheet",
        user="postgres",
        password="admin"
    )
    
    try:
        cursor = conn.cursor()
        
        print("🔍 Testing earmarking persistence...")
        
        # Get all assets with custom_data
        cursor.execute("""
            SELECT id, name, custom_data, updated_at 
            FROM assets 
            WHERE custom_data IS NOT NULL 
            ORDER BY updated_at DESC
        """)
        
        assets = cursor.fetchall()
        print(f"📊 Found {len(assets)} assets with custom_data")
        
        for asset in assets:
            asset_id, name, custom_data, updated_at = asset
            print(f"\n📋 Asset ID: {asset_id}")
            print(f"   Name: {name}")
            print(f"   Updated: {updated_at}")
            print(f"   Custom Data: {json.dumps(custom_data, indent=2)}")
            
            # Check if goalEarmarks exists
            if custom_data and 'goalEarmarks' in custom_data:
                earmarks = custom_data['goalEarmarks']
                print(f"   Goal Earmarks: {len(earmarks)} items")
                for i, earmark in enumerate(earmarks):
                    print(f"     {i+1}. Goal {earmark.get('goalId')}: {earmark.get('percent')}%")
            else:
                print("   No goal earmarks found")
        
        # Check if there are any recent updates (last 5 minutes)
        cursor.execute("""
            SELECT id, name, custom_data, updated_at 
            FROM assets 
            WHERE updated_at > NOW() - INTERVAL '5 minutes'
            ORDER BY updated_at DESC
        """)
        
        recent_assets = cursor.fetchall()
        print(f"\n🕒 Recent updates (last 5 minutes): {len(recent_assets)} assets")
        
        for asset in recent_assets:
            asset_id, name, custom_data, updated_at = asset
            print(f"   {name} (ID: {asset_id}) - {updated_at}")
            if custom_data and 'goalEarmarks' in custom_data:
                earmarks = custom_data['goalEarmarks']
                print(f"     Earmarks: {len(earmarks)} items")
        
    except Exception as error:
        print(f"❌ Error: {error}")
    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    test_earmarking_persistence()
