#!/usr/bin/env python3
"""
Migration script to backfill expense entries for existing insurance policies
Date: 2025-01-30
Description: Creates expense entries for insurance policies that don't have them yet

Usage:
    python backend/scripts/2025-01-30_backfill_insurance_premium_expenses.py

Environment Variables:
    DATABASE_URL - Full connection string to database
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join('backend', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

def get_db_connection():
    """Get database connection from environment variables"""
    if os.getenv('DATABASE_URL'):
        return psycopg2.connect(os.getenv('DATABASE_URL'))
    else:
        return psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            database=os.getenv('DB_NAME', 'life_sheet'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'password')
        )

def backfill_insurance_expenses(cursor):
    """Create expense entries for insurance policies that don't have them"""
    print('[INFO] Backfilling expense entries for insurance policies...')
    
    try:
        # Find all insurance policies that don't have associated expenses
        cursor.execute("""
            SELECT i.id, i.user_id, i.profile_id, i.policy_type, i.premium, i.frequency, i.end_date
            FROM financial_insurance i
            LEFT JOIN financial_expense e ON e.insurance_id = i.id
            WHERE e.id IS NULL
            AND i.premium > 0;
        """)
        
        insurance_policies = cursor.fetchall()
        print(f'  [INFO] Found {len(insurance_policies)} insurance policies without expense entries')
        
        if len(insurance_policies) == 0:
            print('  [SKIP] All insurance policies already have expense entries')
            return
        
        created_count = 0
        for policy in insurance_policies:
            insurance_id, user_id, profile_id, policy_type, premium, frequency, end_date = policy
            
            # Convert premium to monthly if needed
            monthly_premium = float(premium)
            if frequency == 'Yearly':
                monthly_premium = float(premium) / 12
            elif frequency == 'Quarterly':
                monthly_premium = float(premium) / 3
            
            # Get profile_id if not set
            if not profile_id:
                cursor.execute("""
                    SELECT id FROM financial_profile 
                    WHERE user_id = %s 
                    ORDER BY created_at DESC 
                    LIMIT 1
                """, (user_id,))
                profile_result = cursor.fetchone()
                profile_id = profile_result[0] if profile_result else None
            
            if profile_id:
                # Create expense entry
                cursor.execute("""
                    INSERT INTO financial_expense 
                    (user_id, profile_id, insurance_id, description, amount, frequency, expiry, category, subcategory) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    user_id,
                    profile_id,
                    insurance_id,
                    f'Insurance Premium - {policy_type or "Insurance"}',
                    monthly_premium,
                    'Monthly',
                    end_date,
                    'Insurance',
                    'Premium'
                ))
                created_count += 1
                print(f'  [OK] Created expense for insurance {insurance_id} (premium: {monthly_premium:.2f}/month)')
            else:
                print(f'  [WARN] No profile found for user {user_id}, skipping insurance {insurance_id}')
        
        print(f'\n  [SUCCESS] Created {created_count} expense entries for insurance policies')
        
    except psycopg2.Error as e:
        print(f'  [ERROR] Error backfilling insurance expenses: {e}')
        raise

def main():
    """Main migration function"""
    print('[START] Backfilling expense entries for insurance policies...\n')
    
    # Check which database we're connecting to
    db_url = os.getenv('DATABASE_URL', '')
    if db_url:
        if 'render.com' in db_url or 'oregon-postgres.render.com' in db_url:
            print('[INFO] Connecting to Render.com database...')
        else:
            print('[INFO] Connecting to database using DATABASE_URL...')
    else:
        print('[INFO] Connecting to local database...')
    
    print()
    
    conn = None
    try:
        conn = get_db_connection()
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        backfill_insurance_expenses(cursor)
        
        print('\n[SUCCESS] Backfill completed successfully!')
        
    except Exception as e:
        print(f'\n[ERROR] Backfill failed: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    main()

