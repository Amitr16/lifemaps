#!/usr/bin/env python3
"""
Helper script to apply a migration script to Render.com database

Usage:
    python backend/scripts/apply-migration-to-render.py <migration-file.sql>

Example:
    python backend/scripts/apply-migration-to-render.py 2025-01-29_add_new_column.sql

Environment Variables Required:
    DATABASE_URL - Full connection string to Render database
    OR set: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
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

def apply_migration(migration_file):
    """Apply a migration script to the database"""
    try:
        if not migration_file:
            print('❌ Error: Migration file not specified')
            print('\nUsage: python apply-migration-to-render.py <migration-file.sql>')
            print('Example: python apply-migration-to-render.py 2025-01-29_add_new_column.sql')
            sys.exit(1)
        
        # Resolve migration file path
        script_dir = os.path.dirname(os.path.abspath(__file__))
        migration_path = os.path.join(script_dir, migration_file)
        
        # Also try in parent directory (if running from project root)
        if not os.path.exists(migration_path):
            migration_path = os.path.join('backend', 'scripts', migration_file)
        
        if not os.path.exists(migration_path):
            print(f'❌ Error: Migration file not found: {migration_file}')
            print(f'   Tried: {os.path.join(script_dir, migration_file)}')
            print(f'   Tried: {os.path.join("backend", "scripts", migration_file)}')
            sys.exit(1)
        
        print('🚀 Applying migration to database...\n')
        print(f'📄 Migration file: {migration_file}\n')
        
        # Read migration SQL
        with open(migration_path, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        # Check if DATABASE_URL is set
        db_url = os.getenv('DATABASE_URL')
        
        if not db_url:
            print('⚠️  DATABASE_URL not set, using individual DB credentials')
            print('   (Make sure DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD are set)\n')
        
        print('🔌 Connecting to database...')
        conn = get_db_connection()
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        print('✅ Connected!\n')
        
        print('📝 Executing migration...')
        print('─' * 50)
        
        # Execute migration (split by semicolons for multiple statements)
        statements = [s.strip() for s in migration_sql.split(';') if s.strip() and not s.strip().startswith('--')]
        
        for i, statement in enumerate(statements, 1):
            if statement:
                try:
                    cursor.execute(statement)
                    print(f'  ✓ Statement {i} executed successfully')
                except psycopg2.Error as e:
                    # Some errors are expected (e.g., IF NOT EXISTS)
                    if 'already exists' in str(e) or 'does not exist' in str(e):
                        print(f'  ⚠️  Statement {i}: {e.pgcode} - {e.pgerror[:100]}')
                    else:
                        print(f'  ❌ Statement {i} failed: {e.pgcode} - {e.pgerror}')
                        raise
        
        print('─' * 50)
        print('✅ Migration applied successfully!\n')
        
        # Verify by checking tables
        print('🔍 Verifying changes...')
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        print(f'📊 Database now has {len(tables)} tables')
        
        cursor.close()
        conn.close()
        
        print('\n' + '=' * 50)
        print('✅ Migration completed successfully!')
        print('=' * 50)
        print('\n💡 Next steps:')
        print('  1. Verify the changes in Render dashboard')
        print('  2. Test your application to ensure everything works')
        print('  3. Check application logs for any errors\n')
        
    except psycopg2.Error as e:
        print(f'\n❌ Database error: {e.pgcode} - {e.pgerror}')
        sys.exit(1)
    except FileNotFoundError as e:
        print(f'\n❌ File not found: {e}')
        sys.exit(1)
    except Exception as e:
        print(f'\n❌ Error: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    migration_file = sys.argv[1] if len(sys.argv) > 1 else None
    apply_migration(migration_file)

