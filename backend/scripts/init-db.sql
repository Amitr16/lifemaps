-- Life Sheet Database Schema
-- Run this script in your PostgreSQL database

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create financial_profiles table
CREATE TABLE IF NOT EXISTS financial_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    age INTEGER,
    current_annual_gross_income DECIMAL(15,2),
    work_tenure_years INTEGER,
    total_asset_gross_market_value DECIMAL(15,2),
    total_loan_outstanding_value DECIMAL(15,2),
    lifespan_years INTEGER DEFAULT 85,
    income_growth_rate DECIMAL(5,4) DEFAULT 0.06,
    asset_growth_rate DECIMAL(5,4) DEFAULT 0.06,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create financial_goals table
CREATE TABLE IF NOT EXISTS financial_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_amount DECIMAL(15,2) NOT NULL,
    target_date DATE NOT NULL,
    term VARCHAR(10) DEFAULT 'LT',
    recommended_allocation VARCHAR(255),
    funding_source VARCHAR(255),
    on_track BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create financial_expenses table
CREATE TABLE IF NOT EXISTS financial_expenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(255) NOT NULL,
    subcategory VARCHAR(255),
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('Monthly', 'Quarterly', 'Yearly')),
    amount DECIMAL(15,2) NOT NULL,
    personal_inflation DECIMAL(5,4) DEFAULT 0.06,
    source VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create financial_loans table
CREATE TABLE IF NOT EXISTS financial_loans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lender VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    principal_outstanding DECIMAL(15,2) NOT NULL,
    rate DECIMAL(5,4) NOT NULL,
    emi DECIMAL(15,2) NOT NULL,
    emi_day INTEGER DEFAULT 1 CHECK (emi_day >= 1 AND emi_day <= 31),
    prepay_allowed BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create financial_scenarios table
CREATE TABLE IF NOT EXISTS financial_scenarios (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scenario_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_financial_profiles_user_id ON financial_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_id ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_expenses_user_id ON financial_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_loans_user_id ON financial_loans(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_scenarios_user_id ON financial_scenarios(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_profiles_updated_at BEFORE UPDATE ON financial_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_goals_updated_at BEFORE UPDATE ON financial_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_expenses_updated_at BEFORE UPDATE ON financial_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_loans_updated_at BEFORE UPDATE ON financial_loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_scenarios_updated_at BEFORE UPDATE ON financial_scenarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
