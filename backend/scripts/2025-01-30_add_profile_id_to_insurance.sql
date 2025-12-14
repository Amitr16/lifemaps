-- Add profile_id column to financial_insurance table
-- Date: 2025-01-30
-- Description: Adds profile_id column to link insurance to financial profiles

-- Add profile_id column
ALTER TABLE financial_insurance 
ADD COLUMN IF NOT EXISTS profile_id INTEGER REFERENCES financial_profile(id) ON DELETE CASCADE;

-- Update existing rows to have a profile_id (use the most recent profile for each user)
UPDATE financial_insurance fi
SET profile_id = (
    SELECT id 
    FROM financial_profile fp 
    WHERE fp.user_id = fi.user_id 
    ORDER BY fp.created_at DESC 
    LIMIT 1
)
WHERE profile_id IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_financial_insurance_profile_id 
ON financial_insurance(profile_id);

