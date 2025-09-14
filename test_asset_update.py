#!/usr/bin/env python3
"""
Test asset update with custom tag
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/.env')

def test_asset_update():
    """Test updating an asset with a custom tag"""
    
    # Database connection
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'life_sheet'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'admin')
    )
    
    try:
        cursor = conn.cursor()
        
        print("🔍 Testing asset update with custom tag...")
        
        # Check if assets table exists and has data
        cursor.execute("SELECT COUNT(*) FROM assets")
        count = cursor.fetchone()[0]
        print(f"📊 Total assets in database: {count}")
        
        if count > 0:
            # Get a sample asset
            cursor.execute("SELECT id, name, tag FROM assets LIMIT 1")
            asset = cursor.fetchone()
            print(f"📋 Sample asset: ID={asset[0]}, Name={asset[1]}, Tag={asset[2]}")
            
            # Test updating with a custom tag
            test_tag = "CustomTestTag"
            cursor.execute("""
                UPDATE assets 
                SET tag = %s, updated_at = NOW() 
                WHERE id = %s 
                RETURNING id, name, tag
            """, (test_tag, asset[0]))
            
            result = cursor.fetchone()
            if result:
                print(f"✅ Successfully updated asset to custom tag: {result[2]}")
                
                # Revert back to original tag
                cursor.execute("""
                    UPDATE assets 
                    SET tag = %s, updated_at = NOW() 
                    WHERE id = %s
                """, (asset[2], asset[0]))
                print(f"🔄 Reverted back to original tag: {asset[2]}")
            else:
                print("❌ Failed to update asset")
        else:
            print("⚠️  No assets found in database")
        
        conn.commit()
        print("🎉 Test completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    test_asset_update()
