# 🔄 Database Migration Guide

## Overview

When you make changes to your **local database** (new tables, columns, indexes, etc.), you need to:

1. ✅ **Create a migration script** (SQL or Python)
2. ✅ **Commit it to Git**
3. ✅ **Apply it to Render.com database**

**Important**: Database schema changes are NOT automatically synced. You must create and run migration scripts.

---

## 📋 Step-by-Step Process

### Step 1: Make Changes in Local Database

When you add/modify tables, columns, or indexes in your local PostgreSQL database, note what you changed.

**Example changes:**
- Added a new table `my_new_table`
- Added column `new_column` to `financial_expense`
- Created index `idx_expense_new_column`
- Modified a constraint

---

### Step 2: Create a Migration Script

Create a migration script in `backend/scripts/` with a descriptive name.

#### Option A: SQL Migration (Recommended for simple changes)

**File naming**: `YYYY-MM-DD_description.sql`

**Example**: `2025-01-29_add_new_column_to_expenses.sql`

```sql
-- Add new_column to financial_expense table
-- Migration date: 2025-01-29

ALTER TABLE financial_expense 
ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_financial_expense_new_column 
ON financial_expense(new_column);

-- Add comment for documentation
COMMENT ON COLUMN financial_expense.new_column IS 'Description of what this column stores';
```

#### Option B: Python Migration (For complex logic)

**File naming**: `migrate_description.py`

**Example**: `migrate_add_loan_id_to_expenses.py` (already exists)

```python
#!/usr/bin/env python3
"""
Migration script to add new_column to financial_expense table
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

def main():
    """Main migration function"""
    try:
        print("Connecting to database...")
        conn = get_db_connection()
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("Adding new_column to financial_expense table...")
        
        # Add column
        cursor.execute("""
            ALTER TABLE financial_expense 
            ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);
        """)
        print("  - Added new_column")
        
        # Add index
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_financial_expense_new_column 
            ON financial_expense(new_column);
        """)
        print("  - Added index")
        
        # Verify
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'financial_expense' 
            AND column_name = 'new_column';
        """)
        column = cursor.fetchone()
        
        if column:
            print(f"\n[OK] Migration completed successfully!")
            print(f"  - Column: {column[0]}, Type: {column[1]}")
        else:
            print("\n[WARNING] Column verification failed")
        
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
```

---

### Step 3: Test Migration Locally

**For SQL migrations:**
```bash
# Connect to your local database
psql -U postgres -d life_sheet

# Run the migration
\i backend/scripts/2025-01-29_add_new_column_to_expenses.sql
```

**For Python migrations:**
```bash
cd lifemaps
python migrate_add_new_column.py
```

**Verify the changes:**
```sql
-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'financial_expense' 
AND column_name = 'new_column';
```

---

### Step 4: Commit Migration Script to Git

```bash
cd lifemaps

# Add the migration script
git add backend/scripts/2025-01-29_add_new_column_to_expenses.sql

# Commit with descriptive message
git commit -m "Add migration script for new_column in financial_expense"

# Push to GitHub
git push origin main
```

---

### Step 5: Apply Migration to Render.com Database

You have **3 options** to apply migrations to Render.com:

#### Option 1: Using Render.com Shell (Recommended)

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Select your database service** (e.g., `lifemaps-db`)
3. **Click "Shell"** tab (or "Connect" → "Shell")
4. **Run the migration**:

   **For SQL migrations:**
   ```bash
   # Copy the SQL content and paste it into the shell
   psql $DATABASE_URL -f /path/to/migration.sql
   
   # Or paste SQL directly:
   psql $DATABASE_URL
   ```
   Then paste your SQL migration script.

   **For Python migrations:**
   ```bash
   # Set DATABASE_URL environment variable
   export DATABASE_URL="your-database-url-from-render"
   
   # Run the migration script
   python migrate_add_new_column.py
   ```

#### Option 2: Using psql from Your Local Machine

1. **Get Database Connection String** from Render Dashboard:
   - Go to your database service
   - Click "Info" tab
   - Copy the "Internal Database URL" or "External Connection String"

2. **Run migration locally** (connects to Render database):
   ```bash
   # For SQL migrations
   psql "postgresql://user:password@host:port/database" -f backend/scripts/2025-01-29_add_new_column_to_expenses.sql
   
   # For Python migrations
   export DATABASE_URL="postgresql://user:password@host:port/database"
   python migrate_add_new_column.py
   ```

#### Option 3: Create a Migration Endpoint (Advanced)

Add a migration endpoint to your backend that runs migrations:

```javascript
// In backend/server.js or a separate migration route
app.post('/api/admin/run-migration', async (req, res) => {
  try {
    const { migrationFile } = req.body;
    const migrationPath = path.join(__dirname, 'scripts', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(migrationSQL);
    
    res.json({ 
      status: 'success', 
      message: `Migration ${migrationFile} completed` 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});
```

Then call it:
```bash
curl -X POST https://lifemaps-backend.onrender.com/api/admin/run-migration \
  -H "Content-Type: application/json" \
  -d '{"migrationFile": "2025-01-29_add_new_column_to_expenses.sql"}'
```

---

## 📝 Best Practices

### 1. Always Use `IF NOT EXISTS` / `IF EXISTS`

Prevents errors if migration runs multiple times:

```sql
-- ✅ Good
ALTER TABLE financial_expense 
ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);

-- ❌ Bad (will fail if column already exists)
ALTER TABLE financial_expense 
ADD COLUMN new_column VARCHAR(255);
```

### 2. Use Transactions for Multiple Operations

```sql
BEGIN;

ALTER TABLE financial_expense 
ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_financial_expense_new_column 
ON financial_expense(new_column);

COMMIT;
```

### 3. Document Your Migrations

Always include:
- What the migration does
- Why it's needed
- Date created
- Any dependencies

```sql
-- Migration: Add expiry column to financial_expense
-- Date: 2025-01-29
-- Reason: Track when expenses expire (e.g., loan EMI end dates)
-- Dependencies: None
```

### 4. Test Rollback (If Needed)

For destructive changes, create a rollback script:

```sql
-- rollback_2025-01-29_add_new_column.sql
ALTER TABLE financial_expense 
DROP COLUMN IF EXISTS new_column;

DROP INDEX IF EXISTS idx_financial_expense_new_column;
```

### 5. Version Control

Keep all migration scripts in `backend/scripts/` and commit them to Git.

---

## 🔍 Checking Current Database Schema

### On Local Database:
```sql
-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- List columns in a table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'financial_expense'
ORDER BY ordinal_position;

-- List indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'financial_expense';
```

### On Render.com Database:
1. Go to Render Dashboard → Your Database → "Info" tab
2. Use "Connect" → "psql" to connect
3. Run the same queries above

---

## 🚨 Common Issues

### Issue: Migration fails with "column already exists"

**Solution**: Use `IF NOT EXISTS`:
```sql
ALTER TABLE financial_expense 
ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);
```

### Issue: Can't connect to Render database

**Solution**: 
- Check database is running in Render dashboard
- Verify connection string is correct
- Ensure your IP is whitelisted (if using external connection)

### Issue: Migration works locally but fails on Render

**Solution**:
- Check for differences in PostgreSQL versions
- Verify all dependencies exist (tables, sequences, etc.)
- Check Render database logs for detailed error messages

---

## 📚 Existing Migration Scripts Reference

Your project already has these migration scripts:

- `2025-01-27_create_expense_categories.sql` - Expense categories table
- `2025-01-28_create_expense_tags_table.sql` - Expense tags table
- `2025-01-27_create_insurance_table.sql` - Insurance table
- `add_loan_id_to_expenses.py` - Add loan_id column to expenses
- `add_expense_expiry_column.py` - Add expiry column to expenses

**Use these as templates** for creating new migrations!

---

## ✅ Checklist for New Migrations

- [ ] Created migration script (SQL or Python)
- [ ] Tested migration on local database
- [ ] Verified changes work correctly
- [ ] Committed migration script to Git
- [ ] Pushed to GitHub
- [ ] Applied migration to Render.com database
- [ ] Verified changes on Render.com database
- [ ] Updated documentation if needed

---

## 🎯 Quick Reference

```bash
# 1. Create migration script
# Edit: backend/scripts/YYYY-MM-DD_description.sql

# 2. Test locally
psql -U postgres -d life_sheet -f backend/scripts/YYYY-MM-DD_description.sql

# 3. Commit to Git
git add backend/scripts/YYYY-MM-DD_description.sql
git commit -m "Add migration: description"
git push

# 4. Apply to Render
# Use Render Shell or psql connection
```

---

**Remember**: Database schema changes are **NOT automatically synced**. Always create migration scripts and apply them manually to Render.com!

