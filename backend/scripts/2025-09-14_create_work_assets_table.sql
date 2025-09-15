-- Create work_assets table for income streams
CREATE TABLE IF NOT EXISTS work_assets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    profile_id INTEGER NOT NULL REFERENCES financial_profile(id) ON DELETE CASCADE,
    stream VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    growth_rate DECIMAL(5,4) DEFAULT 0.03,
    end_age INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_assets_user_id ON work_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_work_assets_profile_id ON work_assets(profile_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_work_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_work_assets_updated_at
    BEFORE UPDATE ON work_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_work_assets_updated_at();
