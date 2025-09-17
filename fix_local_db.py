import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    port=os.getenv('DB_PORT', '5432'),
    database=os.getenv('DB_NAME', 'life_sheet'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'admin')
)

cur = conn.cursor()

try:
    print("🔧 Fixing local database schema...")
    
    # Drop existing user table and recreate with correct schema
    print("🗑️ Dropping existing user table...")
    cur.execute('DROP TABLE IF EXISTS "user" CASCADE;')
    
    # Create new user table with correct schema
    print("📋 Creating new user table...")
    cur.execute('''
        CREATE TABLE "user" (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    ''')
    
    # Commit changes
    conn.commit()
    print("✅ User table recreated successfully!")
    
    # Verify the table structure
    print("🔍 Verifying table structure...")
    cur.execute('''
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'user' 
        ORDER BY ordinal_position;
    ''')
    
    columns = cur.fetchall()
    print("📊 User table columns:")
    for col in columns:
        print(f"   - {col[0]}: {col[1]}")
    
    print("🎉 Local database schema fixed successfully!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    conn.rollback()
    
finally:
    cur.close()
    conn.close()
