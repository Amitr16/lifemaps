#!/usr/bin/env python3
"""
Add ALL the required columns from the comprehensive Life Sheet App Stage 2 specification
"""

import psycopg2
import os
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

def add_all_required_columns():
    """Add ALL required columns from the comprehensive specification"""
    print("🔧 Adding ALL Required Asset Columns")
    print("=" * 60)
    
    # Load environment variables
    load_dotenv()
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        with conn.cursor() as cur:
            # Get all users who have assets
            cur.execute("""
                SELECT DISTINCT u.id, u.username 
                FROM "user" u 
                INNER JOIN assets a ON u.id = a.user_id
                ORDER BY u.id
            """)
            users_with_assets = cur.fetchall()
            
            if not users_with_assets:
                print("❌ No users with assets found")
                return
            
            print(f"📝 Found {len(users_with_assets)} users with assets")
            
            # ALL REQUIRED COLUMNS from the comprehensive specification
            required_columns = [
                # Basic Asset Information
                { 'key': 'assetType', 'label': 'Asset Type', 'type': 'text', 'order': 1 },
                { 'key': 'startDate', 'label': 'Start Date', 'type': 'date', 'order': 2 },
                { 'key': 'endDate', 'label': 'Expected End Date', 'type': 'date', 'order': 3 },
                
                # SIP Information
                { 'key': 'sipAmount', 'label': 'SIP Amount', 'type': 'currency', 'order': 4 },
                { 'key': 'sipFrequency', 'label': 'SIP Frequency', 'type': 'text', 'order': 5 },
                { 'key': 'sipStartDate', 'label': 'SIP Start Date', 'type': 'date', 'order': 6 },
                { 'key': 'sipEndDate', 'label': 'SIP End Date', 'type': 'date', 'order': 7 },
                
                # Financial Information
                { 'key': 'expectedReturn', 'label': 'Expected Return %', 'type': 'number', 'order': 8 },
                { 'key': 'riskLevel', 'label': 'Risk Level', 'type': 'text', 'order': 9 },
                { 'key': 'liquidity', 'label': 'Liquidity', 'type': 'text', 'order': 10 },
                
                # Ownership and Management
                { 'key': 'owner', 'label': 'Owner', 'type': 'text', 'order': 11 },
                { 'key': 'manager', 'label': 'Manager/Provider', 'type': 'text', 'order': 12 },
                { 'key': 'accountNumber', 'label': 'Account Number', 'type': 'text', 'order': 13 },
                
                # Physical Assets
                { 'key': 'location', 'label': 'Location', 'type': 'text', 'order': 14 },
                { 'key': 'condition', 'label': 'Condition', 'type': 'text', 'order': 15 },
                { 'key': 'purchaseDate', 'label': 'Purchase Date', 'type': 'date', 'order': 16 },
                { 'key': 'purchasePrice', 'label': 'Purchase Price', 'type': 'currency', 'order': 17 },
                
                # Investment Specific
                { 'key': 'units', 'label': 'Units/Shares', 'type': 'number', 'order': 18 },
                { 'key': 'costBasis', 'label': 'Cost Basis', 'type': 'currency', 'order': 19 },
                { 'key': 'currentPrice', 'label': 'Current Price per Unit', 'type': 'currency', 'order': 20 },
                { 'key': 'dividendYield', 'label': 'Dividend Yield %', 'type': 'number', 'order': 21 },
                
                # Goal Linking (Earmarking)
                { 'key': 'goalEarmarks', 'label': 'Linked Goals', 'type': 'text', 'order': 22 },
                
                # Additional Information
                { 'key': 'subType', 'label': 'Sub Type', 'type': 'text', 'order': 23 },
                { 'key': 'currency', 'label': 'Currency', 'type': 'text', 'order': 24 },
                { 'key': 'taxStatus', 'label': 'Tax Status', 'type': 'text', 'order': 25 },
                { 'key': 'notes', 'label': 'Notes', 'type': 'text', 'order': 26 },
                
                # Performance Tracking
                { 'key': 'ytdReturn', 'label': 'YTD Return %', 'type': 'number', 'order': 27 },
                { 'key': 'totalReturn', 'label': 'Total Return %', 'type': 'number', 'order': 28 },
                { 'key': 'lastUpdated', 'label': 'Last Updated', 'type': 'date', 'order': 29 }
            ]
            
            for user_id, username in users_with_assets:
                print(f"\n👤 Processing user {user_id} ({username})...")
                
                # Get existing columns for this user
                cur.execute("""
                    SELECT column_key FROM user_asset_columns 
                    WHERE user_id = %s
                """, (user_id,))
                existing_keys = [row[0] for row in cur.fetchall()]
                
                # Add missing columns
                added_count = 0
                skipped_count = 0
                
                for col in required_columns:
                    if col['key'] not in existing_keys:
                        try:
                            cur.execute("""
                                INSERT INTO user_asset_columns 
                                (user_id, column_key, column_label, column_type, column_order)
                                VALUES (%s, %s, %s, %s, %s)
                            """, (user_id, col['key'], col['label'], col['type'], col['order']))
                            print(f"   ✅ Added: {col['label']} ({col['key']})")
                            added_count += 1
                        except Exception as e:
                            print(f"   ❌ Failed to add {col['label']}: {e}")
                    else:
                        print(f"   ⏭️  Already exists: {col['label']} ({col['key']})")
                        skipped_count += 1
                
                print(f"   📊 Added {added_count} new columns, skipped {skipped_count} existing")
            
            # Commit all changes
            conn.commit()
            print(f"\n✅ Successfully updated columns for all users!")
            
            # Show final state
            print(f"\n📋 Final column state:")
            for user_id, username in users_with_assets:
                cur.execute("""
                    SELECT column_key, column_label, column_type, column_order
                    FROM user_asset_columns 
                    WHERE user_id = %s 
                    ORDER BY column_order, created_at
                """, (user_id,))
                columns = cur.fetchall()
                
                print(f"\n👤 User {user_id} ({username}) - {len(columns)} columns:")
                for col in columns:
                    print(f"   - {col[0]} ({col[1]}) - {col[2]} (order: {col[3]})")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_all_required_columns()
