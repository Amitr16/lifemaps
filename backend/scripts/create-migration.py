#!/usr/bin/env python3
"""
Helper script to create a new migration file with proper naming and template

Usage:
    python backend/scripts/create-migration.py "description of migration"

Example:
    python backend/scripts/create-migration.py "add notes column to expenses"
    
This will create: backend/scripts/2025-01-29_add_notes_column_to_expenses.sql
"""

import os
import sys
from datetime import datetime

def create_migration(description):
    """Create a new migration file with template"""
    try:
        if not description:
            print('❌ Error: Migration description not provided')
            print('\nUsage: python create-migration.py "description of migration"')
            print('Example: python create-migration.py "add notes column to expenses"')
            sys.exit(1)
        
        # Generate filename from description
        date_str = datetime.now().strftime('%Y-%m-%d')
        filename_part = description.lower().replace(' ', '_').replace("'", '').replace('"', '')
        # Remove special characters
        filename_part = ''.join(c if c.isalnum() or c == '_' else '' for c in filename_part)
        filename = f'{date_str}_{filename_part}.sql'
        
        # Get script directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        migration_path = os.path.join(script_dir, filename)
        
        if os.path.exists(migration_path):
            print(f'⚠️  Warning: Migration file already exists: {filename}')
            response = input('Do you want to overwrite it? (y/N): ')
            if response.lower() != 'y':
                print('Cancelled.')
                sys.exit(0)
        
        # Create template
        template = f"""-- Migration: {description}
-- Date: {date_str}
-- Description: {description}

-- Add your migration SQL here
-- Example:
-- ALTER TABLE financial_expense 
-- ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);

-- CREATE INDEX IF NOT EXISTS idx_financial_expense_new_column 
-- ON financial_expense(new_column);

-- Remember to use IF NOT EXISTS / IF EXISTS to make migrations safe to run multiple times
"""
        
        # Write file
        with open(migration_path, 'w', encoding='utf-8') as f:
            f.write(template)
        
        print(f'✅ Created migration file: {filename}')
        print(f'📄 Location: {migration_path}')
        print(f'\n💡 Next steps:')
        print(f'  1. Edit {filename} and add your SQL statements')
        print(f'  2. Test locally: python backend/scripts/apply-migration-to-render.py {filename}')
        print(f'  3. Commit to Git: git add backend/scripts/{filename}')
        print(f'  4. Apply to Render.com\n')
        
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    description = ' '.join(sys.argv[1:]) if len(sys.argv) > 1 else None
    create_migration(description)

