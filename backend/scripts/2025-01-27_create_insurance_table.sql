-- Create financial_insurance table
CREATE TABLE IF NOT EXISTS financial_insurance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
    policy_type VARCHAR(255) NOT NULL,
    cover DECIMAL(15,2) NOT NULL,
    premium DECIMAL(15,2) NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('Monthly', 'Quarterly', 'Yearly')) DEFAULT 'Yearly',
    provider VARCHAR(255),
    policy_number VARCHAR(255),
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_financial_insurance_user_id ON financial_insurance(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_financial_insurance_updated_at BEFORE UPDATE ON financial_insurance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
