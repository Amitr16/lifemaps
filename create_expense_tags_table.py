#!/usr/bin/env python3
"""
Migration script to create expense_tags table
Creates table for user-defined expense tags (For, Lifestyle Level, Payment From)
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
        # Production (Render/Railway) - use DATABASE_URL
        return psycopg2.connect(os.getenv('DATABASE_URL'))
    else:
        # Development - use individual environment variables
        return psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            database=os.getenv('DB_NAME', 'life_sheet'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'password')
        )

def main():
    """Main function to create expense_tags table"""
    try:
        print("Connecting to database...")
        conn = get_db_connection()
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
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
        
        # Create indexes for faster lookups
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_expense_tags_user_id 
            ON expense_tags(user_id);
        """)
        print("  - Created index on user_id")
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_expense_tags_tag_label 
            ON expense_tags(tag_label);
        """)
        print("  - Created index on tag_label")
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_expense_tags_user_label 
            ON expense_tags(user_id, tag_label);
        """)
        print("  - Created index on (user_id, tag_label)")
        
        # Add comments for documentation
        try:
            cursor.execute("""
                COMMENT ON TABLE expense_tags IS 'User-defined expense tags for tag_for, lifestyle_level, and payment_from fields';
            """)
            cursor.execute("""
                COMMENT ON COLUMN expense_tags.tag_label IS 'Tag category: For, Lifestyle Level, or Payment From';
            """)
            cursor.execute("""
                COMMENT ON COLUMN expense_tags.tag_name IS 'User-defined tag value';
            """)
            print("  - Added table and column comments")
        except Exception as e:
            print(f"  - Warning: Could not add comments: {e}")
        
        # Verify table exists
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'expense_tags';
        """)
        table_exists = cursor.fetchone()
        
        if table_exists:
            print(f"\n[OK] Verification - expense_tags table created successfully!")
            
            # Check columns
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'expense_tags'
                ORDER BY ordinal_position;
            """)
            columns = cursor.fetchall()
            
            print(f"\nTable columns ({len(columns)}):")
            for col_name, col_type in columns:
                print(f"  - {col_name}: {col_type}")
        else:
            print("\n[WARNING] Table verification failed")
        
        cursor.close()
        conn.close()
        
        print("\n[SUCCESS] Migration completed successfully!")
        
    except psycopg2.Error as e:
        print(f"[ERROR] Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

