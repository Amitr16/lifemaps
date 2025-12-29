# Insurance Migration for Render

This guide explains how to run the insurance database migrations on Render.com.

## Problem
The insurance endpoints are returning 500 errors because:
1. The `financial_insurance` table may not exist
2. The `profile_id` column may be missing from `financial_insurance`
3. The `insurance_id` column may be missing from `financial_expense`

## Solution

Run the complete migration script on Render's database.

## Option 1: Run Python Script Locally (Recommended)

1. **Get your Render database connection string:**
   - Go to your Render dashboard
   - Navigate to your PostgreSQL database
   - Copy the "Internal Database URL" or "External Database URL"

2. **Set the DATABASE_URL environment variable:**
   ```bash
   export DATABASE_URL="postgresql://user:password@host:port/database"
   ```
   Or on Windows PowerShell:
   ```powershell
   $env:DATABASE_URL="postgresql://user:password@host:port/database"
   ```

3. **Install dependencies (if not already installed):**
   ```bash
   pip install psycopg2-binary python-dotenv
   ```

4. **Run the migration script:**
   ```bash
   cd lifemaps
   python backend/scripts/2025-01-30_setup_insurance_complete.py
   ```

## Option 2: Run SQL Directly on Render

If you prefer to run SQL directly, you can use Render's database console or a SQL client:

1. **Connect to your Render database** using any PostgreSQL client (pgAdmin, DBeaver, psql, etc.)

2. **Run this SQL script:**

```sql
-- Create financial_insurance table if it doesn't exist
CREATE TABLE IF NOT EXISTS financial_insurance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
    profile_id INTEGER REFERENCES financial_profile(id) ON DELETE CASCADE,
    policy_type VARCHAR(255),
    cover DECIMAL(15,2),
    premium DECIMAL(15,2),
    frequency VARCHAR(20) CHECK (frequency IN ('Monthly', 'Quarterly', 'Yearly')) DEFAULT 'Yearly',
    provider VARCHAR(255),
    policy_number VARCHAR(255),
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_financial_insurance_user_id ON financial_insurance(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_insurance_profile_id ON financial_insurance(profile_id);

-- Create update function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_financial_insurance_updated_at ON financial_insurance;
CREATE TRIGGER update_financial_insurance_updated_at 
BEFORE UPDATE ON financial_insurance
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add profile_id column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='financial_insurance' AND column_name='profile_id'
    ) THEN
        ALTER TABLE financial_insurance 
        ADD COLUMN profile_id INTEGER REFERENCES financial_profile(id) ON DELETE CASCADE;
        
        -- Update existing rows
        UPDATE financial_insurance fi
        SET profile_id = (
            SELECT id 
            FROM financial_profile fp 
            WHERE fp.user_id = fi.user_id 
            ORDER BY fp.created_at DESC 
            LIMIT 1
        )
        WHERE profile_id IS NULL;
    END IF;
END $$;

-- Add insurance_id column to financial_expense if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='financial_expense' AND column_name='insurance_id'
    ) THEN
        ALTER TABLE financial_expense 
        ADD COLUMN insurance_id INTEGER REFERENCES financial_insurance(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_financial_expense_insurance_id 
        ON financial_expense(insurance_id);
    END IF;
END $$;
```

## Verification

After running the migration, verify it worked:

1. **Check if the table exists:**
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'financial_insurance';
   ```

2. **Check if columns exist:**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'financial_insurance' 
   AND column_name IN ('profile_id');
   
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'financial_expense' 
   AND column_name IN ('insurance_id');
   ```

3. **Test the API endpoints:**
   - Try creating an insurance policy
   - Try fetching insurance policies
   - Check that premiums appear as expenses

## Troubleshooting

- **"relation financial_insurance does not exist"**: The table wasn't created. Run the migration again.
- **"column profile_id does not exist"**: The column wasn't added. Check if the table exists first, then run the profile_id migration.
- **"column insurance_id does not exist"**: The expenses table migration didn't run. Run the insurance_id migration.

