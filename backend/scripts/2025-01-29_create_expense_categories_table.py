#!/usr/bin/env python3
"""
Migration script to create expense_categories table on Render.com
Date: 2025-01-29
Description: Creates expense_categories table for global and user-specific categories
"""

import os
import sys
from psycopg import connect
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
        return connect(os.getenv('DATABASE_URL'))
    else:
        return connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            dbname=os.getenv('DB_NAME', 'life_sheet'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'password')
        )

def main():
    """Main function to create expense_categories table"""
    try:
        print("Connecting to database...")
        conn = get_db_connection()
        cursor = conn.cursor()
        
        print("Creating expense_categories table...")
        
        # Create expense_categories table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS expense_categories (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL DEFAULT 0,
                category VARCHAR(255) NOT NULL,
                subcategory VARCHAR(255) NOT NULL,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, category, subcategory),
                CHECK (user_id >= 0)
            );
        """)
        print("  - Created expense_categories table")
        
        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id 
            ON expense_categories(user_id);
        """)
        print("  - Created index: idx_expense_categories_user_id")
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_expense_categories_category 
            ON expense_categories(category);
        """)
        print("  - Created index: idx_expense_categories_category")
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_expense_categories_display_order 
            ON expense_categories(display_order);
        """)
        print("  - Created index: idx_expense_categories_display_order")
        
        # Check if we need to insert default categories
        cursor.execute("""
            SELECT COUNT(*) FROM expense_categories WHERE user_id = 0;
        """)
        count = cursor.fetchone()[0]
        
        if count == 0:
            print("\nInserting default expense categories...")
            
            default_categories = [
                # Household
                (0, 'Household', 'Rent / Home Loan EMI', 1),
                (0, 'Household', 'Utilities (Electricity, Water, Gas)', 2),
                (0, 'Household', 'Home Maintenance & Repairs', 3),
                (0, 'Household', 'Domestic Help & Services', 4),
                (0, 'Household', 'Household Supplies', 5),
                # Food & Dining
                (0, 'Food & Dining', 'Groceries', 6),
                (0, 'Food & Dining', 'Restaurants & Takeout', 7),
                (0, 'Food & Dining', 'Coffee & Beverages', 8),
                # Transportation
                (0, 'Transportation', 'Car Loan / EMI', 9),
                (0, 'Transportation', 'Fuel / Gas', 10),
                (0, 'Transportation', 'Public Transport', 11),
                (0, 'Transportation', 'Car Maintenance', 12),
                (0, 'Transportation', 'Parking & Tolls', 13),
                # Healthcare
                (0, 'Healthcare', 'Health Insurance', 14),
                (0, 'Healthcare', 'Doctor Visits', 15),
                (0, 'Healthcare', 'Medications', 16),
                (0, 'Healthcare', 'Dental Care', 17),
                # Education
                (0, 'Education', 'School Fees', 18),
                (0, 'Education', 'Tuition & Classes', 19),
                (0, 'Education', 'Books & Supplies', 20),
                # Entertainment
                (0, 'Entertainment', 'Streaming Services', 21),
                (0, 'Entertainment', 'Movies & Events', 22),
                (0, 'Entertainment', 'Hobbies', 23),
                # Personal Care
                (0, 'Personal Care', 'Clothing', 24),
                (0, 'Personal Care', 'Personal Grooming', 25),
                (0, 'Personal Care', 'Fitness & Gym', 26),
                # Debt
                (0, 'Debt', 'Loan EMI', 27),
                (0, 'Debt', 'Credit Card Payment', 28),
                (0, 'Debt', 'Other Loans', 29),
                # Insurance
                (0, 'Insurance', 'Life Insurance', 30),
                (0, 'Insurance', 'Health Insurance', 31),
                (0, 'Insurance', 'Vehicle Insurance', 32),
                # Miscellaneous
                (0, 'Miscellaneous', 'Gifts & Donations', 33),
                (0, 'Miscellaneous', 'Subscriptions', 34),
                (0, 'Miscellaneous', 'Other', 35),
            ]
            
            for user_id, category, subcategory, display_order in default_categories:
                try:
                    cursor.execute("""
                        INSERT INTO expense_categories (user_id, category, subcategory, display_order)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (user_id, category, subcategory) DO NOTHING;
                    """, (user_id, category, subcategory, display_order))
                except Exception as e:
                    print(f"  - Warning: Could not insert {category}/{subcategory}: {e}")
            
            print(f"  - Inserted {len(default_categories)} default categories")
        else:
            print(f"  - Default categories already exist ({count} found)")
        
        # Verify table exists
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'expense_categories';
        """)
        table = cursor.fetchone()
        
        if table:
            print(f"\n[OK] Verification - expense_categories table created successfully!")
            print(f"  - Table: {table[0]}")
        else:
            print("\n[WARNING] Table verification failed")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("\n[SUCCESS] Migration completed successfully!")
        
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

