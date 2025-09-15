#!/usr/bin/env python3
"""
Add core asset columns to the assets table schema
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

def add_core_asset_columns():
    """Add core asset columns to the assets table"""
    print("🔧 Adding Core Asset Columns to Database Schema")
    print("=" * 60)
    
    # Load environment variables
    load_dotenv()
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        with conn.cursor() as cur:
            # Check current assets table structure
            print("📝 Current assets table structure:")
            cur.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'assets' 
                ORDER BY ordinal_position
            """)
            current_columns = cur.fetchall()
            
            for col in current_columns:
                print(f"   - {col[0]}: {col[1]} ({'NULL' if col[2] == 'YES' else 'NOT NULL'})")
            
            # Define core columns to add
            core_columns = [
                {
                    'name': 'holding_type',
                    'definition': 'VARCHAR(50) DEFAULT \'one_time\'',
                    'comment': 'Type of holding: one_time, sip, recurring_inflow'
                },
                {
                    'name': 'amount_per_month',
                    'definition': 'DECIMAL(15,2) DEFAULT 0',
                    'comment': 'Monthly amount for SIP or recurring inflow'
                },
                {
                    'name': 'start_date',
                    'definition': 'DATE',
                    'comment': 'Start date of asset or SIP'
                },
                {
                    'name': 'end_date',
                    'definition': 'DATE',
                    'comment': 'End date of asset or SIP maturity'
                },
                {
                    'name': 'owner',
                    'definition': 'VARCHAR(100)',
                    'comment': 'Owner of the asset: self, spouse, dependent, joint'
                },
                {
                    'name': 'liquidity',
                    'definition': 'VARCHAR(50)',
                    'comment': 'Liquidity level: liquid, semi-liquid, illiquid'
                },
                {
                    'name': 'expected_return',
                    'definition': 'DECIMAL(5,2)',
                    'comment': 'Expected annual return percentage'
                }
            ]
            
            print(f"\n🔧 Adding core columns...")
            
            for col in core_columns:
                try:
                    # Check if column already exists
                    cur.execute("""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = 'assets' AND column_name = %s
                    """, (col['name'],))
                    
                    if cur.fetchone():
                        print(f"   ⏭️  Column {col['name']} already exists")
                    else:
                        # Add the column
                        cur.execute(f"""
                            ALTER TABLE assets 
                            ADD COLUMN {col['name']} {col['definition']}
                        """)
                        
                        # Add comment
                        cur.execute(f"""
                            COMMENT ON COLUMN assets.{col['name']} IS %s
                        """, (col['comment'],))
                        
                        print(f"   ✅ Added: {col['name']} - {col['comment']}")
                        
                except Exception as e:
                    print(f"   ❌ Failed to add {col['name']}: {e}")
            
            # Add constraints
            print(f"\n🔧 Adding constraints...")
            
            # Add check constraint for holding_type
            try:
                cur.execute("""
                    ALTER TABLE assets 
                    ADD CONSTRAINT check_holding_type 
                    CHECK (holding_type IN ('one_time', 'sip', 'recurring_inflow'))
                """)
                print("   ✅ Added holding_type constraint")
            except Exception as e:
                print(f"   ⏭️  holding_type constraint already exists or failed: {e}")
            
            # Add check constraint for liquidity
            try:
                cur.execute("""
                    ALTER TABLE assets 
                    ADD CONSTRAINT check_liquidity 
                    CHECK (liquidity IN ('liquid', 'semi-liquid', 'illiquid'))
                """)
                print("   ✅ Added liquidity constraint")
            except Exception as e:
                print(f"   ⏭️  liquidity constraint already exists or failed: {e}")
            
            # Add check constraint for expected_return
            try:
                cur.execute("""
                    ALTER TABLE assets 
                    ADD CONSTRAINT check_expected_return 
                    CHECK (expected_return >= 0 AND expected_return <= 100)
                """)
                print("   ✅ Added expected_return constraint")
            except Exception as e:
                print(f"   ⏭️  expected_return constraint already exists or failed: {e}")
            
            # Commit all changes
            conn.commit()
            print(f"\n✅ Successfully added core asset columns!")
            
            # Show final structure
            print(f"\n📋 Final assets table structure:")
            cur.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'assets' 
                ORDER BY ordinal_position
            """)
            final_columns = cur.fetchall()
            
            for col in final_columns:
                print(f"   - {col[0]}: {col[1]} ({'NULL' if col[2] == 'YES' else 'NOT NULL'})")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_core_asset_columns()
