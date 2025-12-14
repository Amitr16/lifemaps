#!/usr/bin/env python3
"""
Migration script to create expense_tags table on Render.com
Date: 2025-01-29
Description: Creates expense_tags table for user-defined expense tags
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
    """Main function to create expense_tags table"""
    try:
        print("Connecting to database...")
        conn = get_db_connection()
        cursor = conn.cursor()
        
        print("Creating expense_tags table...")
        
        # Create expense_tags table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS expense_tags (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                tag_label VARCHAR(50) NOT NULL CHECK (tag_label IN ('For', 'Lifestyle Level', 'Payment From')),
                tag_name VARCHAR(255) NOT NULL,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, tag_label, tag_name),
                FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
            );
        """)
        print("  - Created expense_tags table")
        
        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_expense_tags_user_id 
            ON expense_tags(user_id);
        """)
        print("  - Created index: idx_expense_tags_user_id")
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_expense_tags_tag_label 
            ON expense_tags(tag_label);
        """)
        print("  - Created index: idx_expense_tags_tag_label")
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_expense_tags_user_label 
            ON expense_tags(user_id, tag_label);
        """)
        print("  - Created index: idx_expense_tags_user_label")
        
        # Add comments
        try:
            cursor.execute("""
                COMMENT ON TABLE expense_tags IS 'User-defined expense tags for tag_for, lifestyle_level, and payment_from fields';
            """)
            print("  - Added table comment")
        except Exception as e:
            print(f"  - Warning: Could not add table comment: {e}")
        
        try:
            cursor.execute("""
                COMMENT ON COLUMN expense_tags.tag_label IS 'Tag category: For, Lifestyle Level, or Payment From';
            """)
            print("  - Added column comment for tag_label")
        except Exception as e:
            print(f"  - Warning: Could not add column comment: {e}")
        
        try:
            cursor.execute("""
                COMMENT ON COLUMN expense_tags.tag_name IS 'User-defined tag value';
            """)
            print("  - Added column comment for tag_name")
        except Exception as e:
            print(f"  - Warning: Could not add column comment: {e}")
        
        # Verify table exists
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'expense_tags';
        """)
        table = cursor.fetchone()
        
        if table:
            print(f"\n[OK] Verification - expense_tags table created successfully!")
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

