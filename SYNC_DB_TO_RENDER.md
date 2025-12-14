# 🔄 Quick Guide: Sync Database Changes to Render.com

## Step 1: Check What Changes You Made

First, let's see what's different between your local database and what should be on Render:

```bash
cd lifemaps
node backend/scripts/check-db-schema.js
```

This will show you:
- ✅ What tables/columns exist
- ⚠️ What's missing
- 📋 Current schema details

---

## Step 2: Create Migration Script (If Needed)

If you made changes locally, create a migration script:

### Example: Adding a new column

Create file: `backend/scripts/2025-01-29_add_your_change.sql`

```sql
-- Migration: Add your_column to your_table
-- Date: 2025-01-29

ALTER TABLE your_table 
ADD COLUMN IF NOT EXISTS your_column VARCHAR(255);

-- Add index if needed
CREATE INDEX IF NOT EXISTS idx_your_table_your_column 
ON your_table(your_column);
```

---

## Step 3: Test Migration Locally

```bash
# Connect to your local database
psql -U postgres -d life_sheet

# Run the migration
\i backend/scripts/2025-01-29_add_your_change.sql

# Verify it worked
\d your_table
```

---

## Step 4: Commit Migration Script to Git

```bash
cd lifemaps

# Add the migration script
git add backend/scripts/2025-01-29_add_your_change.sql

# Commit
git commit -m "Add migration: description of change"

# Push
git push origin main
```

---

## Step 5: Apply to Render.com

### Option A: Using the Helper Script (Easiest)

1. **Get your Render database connection string:**
   - Go to https://dashboard.render.com
   - Select your database service
   - Click "Info" tab
   - Copy "Internal Database URL" or "External Connection String"

2. **Set the connection string:**
   ```bash
   export DATABASE_URL="postgresql://user:password@host:port/database"
   ```

3. **Run the migration:**
   ```bash
   cd lifemaps
   node backend/scripts/apply-migration-to-render.js 2025-01-29_add_your_change.sql
   ```

### Option B: Using Render Shell

1. Go to Render Dashboard → Your Database → "Shell" tab
2. Run:
   ```bash
   # Copy your SQL migration content and paste it
   # Or use:
   cat > migration.sql << 'EOF'
   [paste your SQL here]
   EOF
   
   psql $DATABASE_URL -f migration.sql
   ```

### Option C: Using psql from Your Computer

```bash
# Connect directly to Render database
psql "postgresql://user:password@host:port/database" -f backend/scripts/2025-01-29_add_your_change.sql
```

---

## 🎯 Quick Example Workflow

Let's say you added a `notes` column to `financial_expense`:

```bash
# 1. Check current schema
node backend/scripts/check-db-schema.js

# 2. Create migration (if column doesn't exist)
# File: backend/scripts/2025-01-29_add_notes_to_expenses.sql
# Content:
#   ALTER TABLE financial_expense 
#   ADD COLUMN IF NOT EXISTS notes TEXT;

# 3. Test locally
psql -U postgres -d life_sheet -f backend/scripts/2025-01-29_add_notes_to_expenses.sql

# 4. Commit
git add backend/scripts/2025-01-29_add_notes_to_expenses.sql
git commit -m "Add notes column to financial_expense"
git push

# 5. Apply to Render
export DATABASE_URL="your-render-db-url"
node backend/scripts/apply-migration-to-render.js 2025-01-29_add_notes_to_expenses.sql
```

---

## ✅ Verification

After applying migration, verify it worked:

1. **Check in Render Dashboard:**
   - Go to Database → Shell
   - Run: `\d financial_expense` (or your table name)

2. **Or use the check script:**
   ```bash
   # Set DATABASE_URL to Render database
   export DATABASE_URL="your-render-db-url"
   node backend/scripts/check-db-schema.js
   ```

---

## 🆘 Need Help?

If you're not sure what changes you made:

1. **Check your local database:**
   ```bash
   psql -U postgres -d life_sheet
   \d financial_expense  # See table structure
   \dt                   # List all tables
   ```

2. **Compare with migration scripts:**
   - Look at `backend/scripts/*.sql` files
   - See what migrations already exist
   - Create new one for any missing changes

3. **Common changes:**
   - New tables → `CREATE TABLE IF NOT EXISTS ...`
   - New columns → `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`
   - New indexes → `CREATE INDEX IF NOT EXISTS ...`

---

## 📝 Important Notes

- ✅ Always use `IF NOT EXISTS` to make migrations safe to run multiple times
- ✅ Test locally before applying to Render
- ✅ Commit migration scripts to Git
- ✅ Keep migration scripts in `backend/scripts/` with descriptive names
- ⚠️ Never drop tables/columns without a backup!

---

**Ready to start?** Run `node backend/scripts/check-db-schema.js` to see what needs migration!

