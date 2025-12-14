# 🚀 Quick Migration Steps - Follow These!

## What Changes Did You Make?

Tell me what you changed in your local database, and I'll help create the migration script. Common changes:

- ✅ Added a new table
- ✅ Added a new column to existing table
- ✅ Added an index
- ✅ Modified a column type
- ✅ Added a constraint

---

## If You're Not Sure What Changed:

### Step 1: Check Your Local Database Schema

Use the Python script to check your database:

```bash
# Check what tables/columns exist
python backend/scripts/check-db-schema.py
```

Or connect directly to PostgreSQL:

```bash
# Connect to PostgreSQL
psql -U postgres -d life_sheet

# List all tables
\dt

# See structure of a specific table (e.g., financial_expense)
\d financial_expense

# List all columns in financial_expense
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'financial_expense'
ORDER BY ordinal_position;
```

### Step 2: Compare with Expected Schema

Check what should exist based on the code:

**Expected columns in `financial_expense`:**
- id, user_id, category, subcategory, frequency, amount
- expiry, loan_id, tag_for, lifestyle_level, payment_from
- description, personal_inflation, source, notes
- created_at, updated_at

**Expected columns in `financial_loan`:**
- id, user_id, lender, type, start_date, end_date
- principal_outstanding, rate, emi, emi_day
- prepay_allowed, notes, created_at, updated_at

---

## Creating the Migration Script

### Option 1: Use the Helper Script (Easiest)

```bash
# Create a new migration file with template
python backend/scripts/create-migration.py "add missing columns to expenses"

# This creates: backend/scripts/2025-01-29_add_missing_columns_to_expenses.sql
# Then edit the file and add your SQL statements
```

### Option 2: Create Manually

**File name format:** `YYYY-MM-DD_description.sql`

**Example:** `2025-01-29_add_missing_columns.sql`

```sql
-- Migration: Add missing columns
-- Date: 2025-01-29

-- Add to financial_expense if missing
ALTER TABLE financial_expense 
ADD COLUMN IF NOT EXISTS expiry DATE,
ADD COLUMN IF NOT EXISTS loan_id INTEGER REFERENCES financial_loan(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS tag_for VARCHAR(255),
ADD COLUMN IF NOT EXISTS lifestyle_level VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_from VARCHAR(255),
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_financial_expense_loan_id 
ON financial_expense(loan_id);

CREATE INDEX IF NOT EXISTS idx_financial_expense_expiry 
ON financial_expense(expiry);
```

---

## Apply to Render.com

### Method 1: Using Render Dashboard (Easiest)

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Select your database service** (e.g., `lifemaps-db`)
3. **Click "Shell" tab**
4. **Paste your SQL migration** and press Enter

### Method 2: Using Python Script (Recommended)

1. **Get connection string from Render:**
   - Dashboard → Database → Info tab
   - Copy "Internal Database URL" or "External Connection String"

2. **Set environment variable and run:**
   ```bash
   # Set DATABASE_URL to your Render database connection string
   export DATABASE_URL="postgresql://user:password@host:port/database"
   
   # Apply migration
   python backend/scripts/apply-migration-to-render.py 2025-01-29_add_missing_columns.sql
   ```

### Method 3: Using psql from Your Computer

1. **Get connection string from Render:**
   - Dashboard → Database → Info tab
   - Copy "Internal Database URL" or "External Connection String"

2. **Run migration:**
   ```bash
   psql "postgresql://user:password@host:port/database" -f backend/scripts/2025-01-29_add_missing_columns.sql
   ```

---

## Need Help Right Now?

**Just tell me:**
1. What table did you modify? (e.g., `financial_expense`)
2. What did you add? (e.g., "I added a `notes` column")
3. What's the column type? (e.g., TEXT, VARCHAR(255), INTEGER, etc.)

**And I'll create the migration script for you!**

---

## Example: Complete Workflow

Let's say you added `expiry` column to `financial_expense`:

```bash
# 1. Create migration file using helper script
python backend/scripts/create-migration.py "add expiry to expenses"
# This creates: backend/scripts/2025-01-29_add_expiry_to_expenses.sql

# 2. Edit the file and add your SQL:
#   ALTER TABLE financial_expense 
#   ADD COLUMN IF NOT EXISTS expiry DATE;

# 3. Test locally
python backend/scripts/apply-migration-to-render.py 2025-01-29_add_expiry_to_expenses.sql
# (Make sure DATABASE_URL points to your local DB, or set DB_HOST, DB_PORT, etc.)

# 4. Commit to Git
git add backend/scripts/2025-01-29_add_expiry_to_expenses.sql
git commit -m "Add expiry column to financial_expense"
git push

# 5. Apply to Render
# Set Render database URL
export DATABASE_URL="postgresql://user:password@host:port/database"
python backend/scripts/apply-migration-to-render.py 2025-01-29_add_expiry_to_expenses.sql
```

---

**Ready? Tell me what you changed and I'll create the migration script!** 🚀

