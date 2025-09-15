-- Add custom_data JSONB field to financial_goal table for earmarking
-- This allows storing linked assets and other custom data on goals

ALTER TABLE financial_goal 
ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

-- Update existing goals to have empty custom_data
UPDATE financial_goal 
SET custom_data = '{}'::jsonb 
WHERE custom_data IS NULL;

-- Add index for better performance on JSON queries
CREATE INDEX IF NOT EXISTS idx_financial_goal_custom_data ON financial_goal USING GIN (custom_data);

-- Add comment for documentation
COMMENT ON COLUMN financial_goal.custom_data IS 'Custom JSON data for storing linked assets and other metadata';
