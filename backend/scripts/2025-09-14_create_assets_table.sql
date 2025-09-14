-- Create assets table for asset register
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    profile_id INTEGER NOT NULL REFERENCES financial_profile(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    tag VARCHAR(50) NOT NULL CHECK (tag IN ('Investment', 'Personal', 'Emergency', 'Retirement')),
    current_value DECIMAL(15,2) DEFAULT 0,
    custom_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create user_asset_columns table to store custom column definitions
CREATE TABLE IF NOT EXISTS user_asset_columns (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    column_key VARCHAR(100) NOT NULL,
    column_label VARCHAR(255) NOT NULL,
    column_type VARCHAR(50) DEFAULT 'text',
    column_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, column_key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_profile_id ON assets(profile_id);
CREATE INDEX IF NOT EXISTS idx_assets_tag ON assets(tag);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION update_assets_updated_at();
