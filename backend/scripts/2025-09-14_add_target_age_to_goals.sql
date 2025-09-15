-- Add target_age column to financial_goal table
ALTER TABLE financial_goal 
ADD COLUMN IF NOT EXISTS target_age INTEGER;

-- Update existing goals to have a default target_age based on target_date
-- This is a rough calculation - you may want to adjust based on your needs
UPDATE financial_goal 
SET target_age = EXTRACT(YEAR FROM target_date) - EXTRACT(YEAR FROM CURRENT_DATE) + 30
WHERE target_age IS NULL;

