-- Migration: Sync all schema changes to Render.com
-- Date: 2025-01-29
-- Description: Ensures Render.com database has all tables, columns, and indexes that exist locally

-- ============================================
-- FINANCIAL_EXPENSE TABLE COLUMNS
-- ============================================

-- Add any missing columns to financial_expense
ALTER TABLE financial_expense 
ADD COLUMN IF NOT EXISTS profile_id INTEGER,
ADD COLUMN IF NOT EXISTS description VARCHAR(255),
ADD COLUMN IF NOT EXISTS order_index INTEGER,
ADD COLUMN IF NOT EXISTS expense_type VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_essential BOOLEAN,
ADD COLUMN IF NOT EXISTS category VARCHAR(255),
ADD COLUMN IF NOT EXISTS subcategory VARCHAR(255),
ADD COLUMN IF NOT EXISTS personal_inflation DECIMAL(5,4) DEFAULT 0.06,
ADD COLUMN IF NOT EXISTS source VARCHAR(255),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS tag_for VARCHAR(255),
ADD COLUMN IF NOT EXISTS lifestyle_level VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_from VARCHAR(255),
ADD COLUMN IF NOT EXISTS expiry DATE,
ADD COLUMN IF NOT EXISTS loan_id INTEGER REFERENCES financial_loan(id) ON DELETE CASCADE;

-- ============================================
-- FINANCIAL_LOAN TABLE COLUMNS
-- ============================================

-- Add any missing columns to financial_loan
ALTER TABLE financial_loan
ADD COLUMN IF NOT EXISTS profile_id INTEGER,
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS order_index INTEGER,
ADD COLUMN IF NOT EXISTS lender VARCHAR(255),
ADD COLUMN IF NOT EXISTS type VARCHAR(255),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS principal_outstanding DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS rate DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS emi_day INTEGER DEFAULT 1 CHECK (emi_day >= 1 AND emi_day <= 31),
ADD COLUMN IF NOT EXISTS prepay_allowed BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS source INTEGER;

-- ============================================
-- INDEXES FOR FINANCIAL_EXPENSE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_financial_expense_category 
ON financial_expense(category);

CREATE INDEX IF NOT EXISTS idx_financial_expense_lifestyle_level 
ON financial_expense(lifestyle_level);

CREATE INDEX IF NOT EXISTS idx_financial_expense_loan_id 
ON financial_expense(loan_id);

CREATE INDEX IF NOT EXISTS idx_financial_expense_payment_from 
ON financial_expense(payment_from);

CREATE INDEX IF NOT EXISTS idx_financial_expense_tag_for 
ON financial_expense(tag_for);

CREATE INDEX IF NOT EXISTS idx_financial_expense_expiry 
ON financial_expense(expiry);

CREATE INDEX IF NOT EXISTS idx_financial_expense_profile_id 
ON financial_expense(profile_id);

-- ============================================
-- INDEXES FOR FINANCIAL_LOAN
-- ============================================

CREATE INDEX IF NOT EXISTS idx_financial_loan_profile_id 
ON financial_loan(profile_id);

CREATE INDEX IF NOT EXISTS idx_financial_loan_lender 
ON financial_loan(lender);

CREATE INDEX IF NOT EXISTS idx_financial_loan_type 
ON financial_loan(type);

-- ============================================
-- FOREIGN KEY CONSTRAINTS (if needed)
-- ============================================

-- Add foreign key for profile_id in financial_expense if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'financial_expense_profile_id_fkey'
    ) THEN
        ALTER TABLE financial_expense 
        ADD CONSTRAINT financial_expense_profile_id_fkey 
        FOREIGN KEY (profile_id) REFERENCES financial_profile(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key for profile_id in financial_loan if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'financial_loan_profile_id_fkey'
    ) THEN
        ALTER TABLE financial_loan 
        ADD CONSTRAINT financial_loan_profile_id_fkey 
        FOREIGN KEY (profile_id) REFERENCES financial_profile(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES (for manual checking)
-- ============================================

-- Uncomment these to verify after migration:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'financial_expense'
-- ORDER BY ordinal_position;

-- SELECT indexname 
-- FROM pg_indexes 
-- WHERE tablename = 'financial_expense';

