# 🐍 Python Database Migration Guide

## Quick Start

### 1. Check Your Database Schema

```bash
python backend/scripts/check-db-schema.py
```

This shows:
- ✅ What tables/columns exist
- ⚠️ What's missing
- 📋 Current schema details

---

### 2. Create a New Migration

```bash
python backend/scripts/create-migration.py "description of your change"
```

Example:
```bash
python backend/scripts/create-migration.py "add notes column to expenses"
```

This creates: `backend/scripts/2025-01-29_add_notes_column_to_expenses.sql`

---

### 3. Edit the Migration File

Open the created file and add your SQL statements:

```sql
-- Migration: add notes column to expenses
-- Date: 2025-01-29

ALTER TABLE financial_expense 
ADD COLUMN IF NOT EXISTS notes TEXT;
```

---

### 4. Test Migration Locally

```bash
# Make sure your local DB credentials are set in .env or environment
python backend/scripts/apply-migration-to-render.py 2025-01-29_add_notes_column_to_expenses.sql
```

**Environment Variables:**
- `DATABASE_URL` (full connection string), OR
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

---

### 5. Commit to Git

```bash
git add backend/scripts/2025-01-29_add_notes_column_to_expenses.sql
git commit -m "Add notes column to financial_expense"
git push
```

---

### 6. Apply to Render.com

**Option A: Using Python Script (Recommended)**

1. Get Render database connection string:
   - Go to Render Dashboard → Your Database → Info tab
   - Copy "Internal Database URL"

2. Set and run:
   ```bash
   export DATABASE_URL="postgresql://user:password@host:port/database"
   python backend/scripts/apply-migration-to-render.py 2025-01-29_add_notes_column_to_expenses.sql
   ```

**Option B: Using Render Shell**

1. Go to Render Dashboard → Database → Shell tab
2. Paste your SQL migration directly

---

## Available Scripts

### `check-db-schema.py`
Checks your database schema and shows what's missing.

```bash
python backend/scripts/check-db-schema.py
```

### `create-migration.py`
Creates a new migration file with template.

```bash
python backend/scripts/create-migration.py "your description here"
```

### `apply-migration-to-render.py`
Applies a migration script to your database (local or Render).

```bash
python backend/scripts/apply-migration-to-render.py <migration-file.sql>
```

---

## Environment Setup

### Local Development

Create `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=life_sheet
DB_USER=postgres
DB_PASSWORD=your_password
```

### Render.com Production

Set `DATABASE_URL` environment variable:
```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
```

Or get it from Render Dashboard → Database → Info tab.

---

## Common Migration Examples

### Add a Column

```sql
ALTER TABLE financial_expense 
ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);
```

### Add Multiple Columns

```sql
ALTER TABLE financial_expense 
ADD COLUMN IF NOT EXISTS column1 VARCHAR(255),
ADD COLUMN IF NOT EXISTS column2 TEXT,
ADD COLUMN IF NOT EXISTS column3 INTEGER;
```

### Add an Index

```sql
CREATE INDEX IF NOT EXISTS idx_financial_expense_new_column 
ON financial_expense(new_column);
```

### Add Foreign Key

```sql
ALTER TABLE financial_expense 
ADD COLUMN IF NOT EXISTS loan_id INTEGER;

ALTER TABLE financial_expense 
ADD CONSTRAINT fk_expense_loan 
FOREIGN KEY (loan_id) REFERENCES financial_loan(id) ON DELETE CASCADE;
```

### Create a New Table

```sql
CREATE TABLE IF NOT EXISTS my_new_table (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_my_new_table_user_id 
ON my_new_table(user_id);
```

---

## Best Practices

1. ✅ **Always use `IF NOT EXISTS`** - Makes migrations safe to run multiple times
2. ✅ **Test locally first** - Always test on local database before applying to Render
3. ✅ **Commit to Git** - Keep all migration scripts in version control
4. ✅ **Document changes** - Add comments explaining what and why
5. ✅ **Use transactions** - For multiple related changes, wrap in BEGIN/COMMIT

---

## Troubleshooting

### "password authentication failed"
- Check your `.env` file has correct credentials
- Verify `DATABASE_URL` is set correctly

### "relation already exists"
- This is OK if you used `IF NOT EXISTS`
- The script will continue

### "column already exists"
- This is OK if you used `IF NOT EXISTS`
- The script will continue

### "cannot connect to database"
- Check database is running
- Verify connection string is correct
- Check firewall/network settings

---

## Complete Example Workflow

```bash
# 1. Check current schema
python backend/scripts/check-db-schema.py

# 2. Create migration
python backend/scripts/create-migration.py "add expiry and loan_id to expenses"

# 3. Edit the created file: backend/scripts/2025-01-29_add_expiry_and_loan_id_to_expenses.sql
# Add SQL:
#   ALTER TABLE financial_expense 
#   ADD COLUMN IF NOT EXISTS expiry DATE,
#   ADD COLUMN IF NOT EXISTS loan_id INTEGER REFERENCES financial_loan(id) ON DELETE CASCADE;
#   
#   CREATE INDEX IF NOT EXISTS idx_financial_expense_loan_id ON financial_expense(loan_id);

# 4. Test locally
python backend/scripts/apply-migration-to-render.py 2025-01-29_add_expiry_and_loan_id_to_expenses.sql

# 5. Commit
git add backend/scripts/2025-01-29_add_expiry_and_loan_id_to_expenses.sql
git commit -m "Add expiry and loan_id columns to financial_expense"
git push

# 6. Apply to Render
export DATABASE_URL="your-render-db-url"
python backend/scripts/apply-migration-to-render.py 2025-01-29_add_expiry_and_loan_id_to_expenses.sql
```

---

**Ready to start?** Run `python backend/scripts/check-db-schema.py` to see what needs migration! 🚀

