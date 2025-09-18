-- Add source tracking columns to existing tables
-- 0 = main page/quick calculator, 1 = detailed page

-- Add source column to financial_profile (for main page inputs)
ALTER TABLE financial_profile 
ADD COLUMN IF NOT EXISTS source INTEGER DEFAULT 0;

-- Add source column to financial_goal (for goals page)
ALTER TABLE financial_goal 
ADD COLUMN IF NOT EXISTS source INTEGER DEFAULT 0;

-- Add source column to financial_expense (for expenses page)
ALTER TABLE financial_expense 
ADD COLUMN IF NOT EXISTS source INTEGER DEFAULT 0;

-- Add source column to financial_loan (for loans page)
ALTER TABLE financial_loan 
ADD COLUMN IF NOT EXISTS source INTEGER DEFAULT 0;

-- Add source column to assets table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets') THEN
        ALTER TABLE assets ADD COLUMN IF NOT EXISTS source INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add source column to work_assets table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_assets') THEN
        ALTER TABLE work_assets ADD COLUMN IF NOT EXISTS source INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create a user_source_preferences table to track which source is active for each component
CREATE TABLE IF NOT EXISTS user_source_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
    component VARCHAR(50) NOT NULL, -- 'assets', 'income', 'loans', 'expenses', 'goals'
    source INTEGER NOT NULL DEFAULT 0, -- 0 = main page, 1 = detailed page
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, component)
);

-- Create index for user_source_preferences
CREATE INDEX IF NOT EXISTS idx_user_source_preferences_user_id ON user_source_preferences(user_id);

-- Create updated_at trigger for user_source_preferences
CREATE TRIGGER update_user_source_preferences_updated_at
    BEFORE UPDATE ON user_source_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
