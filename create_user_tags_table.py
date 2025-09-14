#!/usr/bin/env python3
"""
Create user_tags table and populate with default tags
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/.env')

def create_user_tags_table():
    """Create user_tags table and populate with default tags"""
    
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
        
        print("🔍 Creating user_tags table...")
        
        # Create user_tags table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_tags (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                tag_name VARCHAR(100) NOT NULL,
                tag_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, tag_name)
            );
        """)
        
        print("✅ user_tags table created")
        
        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON user_tags(user_id);
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_tags_user_id_order ON user_tags(user_id, tag_order);
        """)
        
        print("✅ Indexes created")
        
        # Insert default tags for existing users
        cursor.execute("""
            INSERT INTO user_tags (user_id, tag_name, tag_order)
            SELECT 
                u.id,
                tag_name,
                tag_order
            FROM "user" u
            CROSS JOIN (
                VALUES 
                    ('Investment', 0),
                    ('Personal', 1),
                    ('Emergency', 2),
                    ('Retirement', 3)
            ) AS default_tags(tag_name, tag_order)
            WHERE NOT EXISTS (
                SELECT 1 FROM user_tags ut 
                WHERE ut.user_id = u.id AND ut.tag_name = default_tags.tag_name
            );
        """)
        
        print("✅ Default tags inserted for existing users")
        
        # Commit changes
        conn.commit()
        
        # Verify the table
        cursor.execute("SELECT COUNT(*) FROM user_tags")
        tag_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM \"user\"")
        user_count = cursor.fetchone()[0]
        
        print(f"📊 Results:")
        print(f"  - Users: {user_count}")
        print(f"  - Total tags: {tag_count}")
        print(f"  - Tags per user: {tag_count // user_count if user_count > 0 else 0}")
        
        # Show sample data
        cursor.execute("""
            SELECT u.username, ut.tag_name, ut.tag_order 
            FROM user_tags ut 
            JOIN "user" u ON ut.user_id = u.id 
            ORDER BY u.id, ut.tag_order
        """)
        
        print("\n📋 Sample user tags:")
        for username, tag_name, tag_order in cursor.fetchall():
            print(f"  - {username}: {tag_name} (order: {tag_order})")
        
        print("\n🎉 User tags table setup completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()
    
    return True

if __name__ == "__main__":
    create_user_tags_table()
