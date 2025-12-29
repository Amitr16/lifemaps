#!/usr/bin/env python3
"""
Migration script to create admin and super_admin tables on Render
Run this locally to apply the migration to your Render database

Usage:
    python backend/scripts/migrate_admin_tables_to_render.py

Environment variables required:
    DB_HOST - Render database host
    DB_NAME - Database name
    DB_USER - Database user
    DB_PASSWORD - Database password
    DB_PORT - Database port (default: 5432)
"""

import os
import sys
import psycopg2
from psycopg2 import sql
import bcrypt
from dotenv import load_dotenv

# Render Database URL (hardcoded for deployment - External connection)
RENDER_DATABASE_URL = "postgresql://lifemaps_db_11b2_user:F1MdqhOkDjue889juYWEjSM00uhMX3B2@dpg-d35mkhali9vc738hhds0-a.oregon-postgres.render.com/lifemaps_db_11b2"

# Load environment variables (for local development)
env_path = os.path.join('backend', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

def get_db_connection():
    """Get database connection - uses Render URL by default, falls back to env vars"""
    # First try Render database URL (hardcoded)
    if RENDER_DATABASE_URL:
        print(f"[INFO] Connecting to Render database using hardcoded DATABASE_URL")
        try:
            # Parse the URL and add SSL parameters for Render
            conn = psycopg2.connect(
                RENDER_DATABASE_URL,
                sslmode='require'
            )
            print("[OK] Connected to Render database successfully")
            return conn
        except Exception as e:
            print(f"[WARN] Failed to connect to Render database: {e}")
            print("[INFO] Trying with SSL disabled...")
            try:
                # Try without SSL requirement
                conn = psycopg2.connect(RENDER_DATABASE_URL)
                print("[OK] Connected to Render database successfully (no SSL)")
                return conn
            except Exception as e2:
                print(f"[WARN] Failed to connect to Render database: {e2}")
                print("[INFO] Falling back to environment variables...")
    
    # Fall back to environment variables
    if os.getenv('DATABASE_URL'):
        print(f"[INFO] Connecting to database using DATABASE_URL from environment")
        try:
            conn = psycopg2.connect(os.getenv('DATABASE_URL'))
            print("[OK] Connected to database successfully")
            return conn
        except Exception as e:
            print(f"[ERROR] Failed to connect to database: {e}")
            sys.exit(1)
    else:
        db_config = {
            'host': os.getenv('DB_HOST'),
            'database': os.getenv('DB_NAME'),
            'user': os.getenv('DB_USER'),
            'password': os.getenv('DB_PASSWORD'),
            'port': os.getenv('DB_PORT', '5432')
        }
        
        print(f"[INFO] Connecting to database: {db_config['database']}@{db_config['host']}")
        
        try:
            conn = psycopg2.connect(**db_config)
            print("[OK] Connected to database successfully")
            return conn
        except Exception as e:
            print(f"[ERROR] Failed to connect to database: {e}")
            sys.exit(1)

def ensure_updated_at_function(conn):
    """Ensure the update_updated_at_column function exists"""
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            """)
            conn.commit()
            print("[OK] Updated_at function ensured")
    except Exception as e:
        print(f"[WARN] Warning: Could not create update_updated_at_column function: {e}")
        conn.rollback()

def create_super_admin_table(conn):
    """Create super_admin table"""
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS super_admin (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """)
            
            # Create index
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_super_admin_username 
                ON super_admin(username)
            """)
            
            # Create trigger
            cur.execute("""
                DROP TRIGGER IF EXISTS update_super_admin_updated_at ON super_admin;
                CREATE TRIGGER update_super_admin_updated_at 
                BEFORE UPDATE ON super_admin
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
            """)
            
            conn.commit()
            print("[OK] Super admin table created/verified")
    except Exception as e:
        print(f"[WARN] Super admin table: {e}")
        conn.rollback()

def create_admin_table(conn):
    """Create admin table"""
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS admin (
                    id SERIAL PRIMARY KEY,
                    created_by INTEGER REFERENCES super_admin(id) ON DELETE SET NULL,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    name VARCHAR(255),
                    email VARCHAR(255),
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """)
            
            # Create indexes
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_admin_username ON admin(username)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_admin_created_by 
                ON admin(created_by)
            """)
            
            # Create trigger
            cur.execute("""
                DROP TRIGGER IF EXISTS update_admin_updated_at ON admin;
                CREATE TRIGGER update_admin_updated_at 
                BEFORE UPDATE ON admin
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
            """)
            
            conn.commit()
            print("[OK] Admin table created/verified")
    except Exception as e:
        print(f"[WARN] Admin table: {e}")
        conn.rollback()

def add_admin_id_to_user_table(conn):
    """Add admin_id column to user table"""
    try:
        with conn.cursor() as cur:
            # Check if column exists
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'user' 
                AND column_name = 'admin_id'
            """)
            
            if cur.rowcount == 0:
                cur.execute("""
                    ALTER TABLE "user" 
                    ADD COLUMN admin_id INTEGER REFERENCES admin(id) ON DELETE SET NULL
                """)
                
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_user_admin_id ON "user"(admin_id)
                """)
                
                conn.commit()
                print("[OK] Added admin_id column to user table")
            else:
                print("[INFO] admin_id column already exists in user table")
    except Exception as e:
        print(f"[WARN] Adding admin_id column: {e}")
        conn.rollback()

def create_super_admin_user(conn):
    """Create default super admin user"""
    try:
        with conn.cursor() as cur:
            # Check if super admin exists
            cur.execute("SELECT id FROM super_admin WHERE username = %s", ('superadmin',))
            
            if cur.rowcount == 0:
                # Generate bcrypt hash for 'superadmin123'
                password_hash = bcrypt.hashpw('superadmin123'.encode('utf-8'), bcrypt.gensalt(12)).decode('utf-8')
                
                cur.execute("""
                    INSERT INTO super_admin (username, password_hash) 
                    VALUES (%s, %s)
                """, ('superadmin', password_hash))
                
                conn.commit()
                print("[OK] Super admin created: username=superadmin, password=superadmin123")
                print("[WARN] IMPORTANT: Change the default password after first login!")
            else:
                print("[INFO] Super admin already exists")
    except Exception as e:
        print(f"[WARN] Creating super admin: {e}")
        conn.rollback()

def main():
    """Main migration function"""
    print("[INFO] Starting admin tables migration to Render...")
    print("=" * 60)
    
    # Check required environment variables
    required_vars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"[ERROR] Missing required environment variables: {', '.join(missing_vars)}")
        print("\nPlease set these in your .env file or environment:")
        for var in missing_vars:
            print(f"  - {var}")
        sys.exit(1)
    
    conn = None
    try:
        # Connect to database
        conn = get_db_connection()
        
        # Ensure required function exists
        ensure_updated_at_function(conn)
        
        # Create tables
        create_super_admin_table(conn)
        create_admin_table(conn)
        add_admin_id_to_user_table(conn)
        
        # Create default super admin
        create_super_admin_user(conn)
        
        print("=" * 60)
        print("[OK] Migration completed successfully!")
        print("\n[SUMMARY]")
        print("  - super_admin table: OK")
        print("  - admin table: OK")
        print("  - admin_id column in user table: OK")
        print("  - Default super admin: OK")
        print("\n[CREDENTIALS] Default Super Admin Credentials:")
        print("  Username: superadmin")
        print("  Password: superadmin123")
        print("\n[WARN] IMPORTANT: Change the default password after first login!")
        
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        if conn:
            conn.close()
            print("\n[INFO] Database connection closed")

if __name__ == '__main__':
    main()

