-- Add missing columns to match backend expectations
-- This script adds all the columns that the backend code expects but don't exist in the current schema

-- Add missing columns to financial_loan table
ALTER TABLE financial_loan 
ADD COLUMN IF NOT EXISTS lender VARCHAR(255),
ADD COLUMN IF NOT EXISTS type VARCHAR(255),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS principal_outstanding DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS rate DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS emi_day INTEGER DEFAULT 1 CHECK (emi_day >= 1 AND emi_day <= 31),
ADD COLUMN IF NOT EXISTS prepay_allowed BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add missing columns to financial_goal table  
ALTER TABLE financial_goal
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS target_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS term VARCHAR(10) DEFAULT 'LT',
ADD COLUMN IF NOT EXISTS recommended_allocation VARCHAR(255),
ADD COLUMN IF NOT EXISTS funding_source VARCHAR(255),
ADD COLUMN IF NOT EXISTS on_track BOOLEAN DEFAULT FALSE;

-- Add missing columns to financial_expense table
ALTER TABLE financial_expense
ADD COLUMN IF NOT EXISTS category VARCHAR(255),
ADD COLUMN IF NOT EXISTS subcategory VARCHAR(255),
ADD COLUMN IF NOT EXISTS personal_inflation DECIMAL(5,4) DEFAULT 0.06,
ADD COLUMN IF NOT EXISTS source VARCHAR(255),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add missing columns to financial_profile table
ALTER TABLE financial_profile
ADD COLUMN IF NOT EXISTS monthly_income DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS annual_income DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS asset_value DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS loan_value DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS loan_tenure_years INTEGER;

-- Create indexes for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_financial_loan_lender ON financial_loan(lender);
CREATE INDEX IF NOT EXISTS idx_financial_loan_type ON financial_loan(type);
CREATE INDEX IF NOT EXISTS idx_financial_goal_name ON financial_goal(name);
CREATE INDEX IF NOT EXISTS idx_financial_expense_category ON financial_expense(category);

-- Add some helpful comments
COMMENT ON COLUMN financial_loan.lender IS 'Name of the lending institution';
COMMENT ON COLUMN financial_loan.type IS 'Type of loan (e.g., Home, Car, Personal)';
COMMENT ON COLUMN financial_loan.principal_outstanding IS 'Outstanding principal amount';
COMMENT ON COLUMN financial_goal.name IS 'Goal name/description';
COMMENT ON COLUMN financial_goal.target_amount IS 'Target amount for the goal';
COMMENT ON COLUMN financial_expense.category IS 'Expense category (e.g., Housing, Food, Transportation)';
