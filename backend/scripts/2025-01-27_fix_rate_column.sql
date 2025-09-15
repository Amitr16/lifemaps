-- Fix rate column to accept percentage values instead of decimal values
-- Change from DECIMAL(5,4) to DECIMAL(5,2) to store percentages like 5.00, 9.50, etc.

ALTER TABLE financial_loan 
ALTER COLUMN rate TYPE DECIMAL(5,2);

-- Update existing data to convert from decimal to percentage
-- If rate is stored as 0.05 (5%), convert to 5.00
UPDATE financial_loan 
SET rate = rate * 100 
WHERE rate < 1;

-- Add a comment to clarify the column stores percentage values
COMMENT ON COLUMN financial_loan.rate IS 'Interest rate as percentage (e.g., 5.00 for 5%)';
