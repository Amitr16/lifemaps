-- Allow partial autosave payloads
-- This migration relaxes NOT NULL constraints to enable partial data entry

-- Relax financial_loan constraints (singular table name)
ALTER TABLE financial_loan
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN amount DROP NOT NULL,
  ALTER COLUMN order_index DROP NOT NULL;

-- Relax financial_expense constraints (singular table name)
ALTER TABLE financial_expense
  ALTER COLUMN description DROP NOT NULL,
  ALTER COLUMN amount DROP NOT NULL,
  ALTER COLUMN order_index DROP NOT NULL;

-- Relax financial_goal constraints (singular table name)
ALTER TABLE financial_goal
  ALTER COLUMN description DROP NOT NULL,
  ALTER COLUMN amount DROP NOT NULL,
  ALTER COLUMN order_index DROP NOT NULL;

-- Add some reasonable defaults for better UX
ALTER TABLE financial_loan
  ALTER COLUMN order_index SET DEFAULT 0;

ALTER TABLE financial_expense
  ALTER COLUMN order_index SET DEFAULT 0,
  ALTER COLUMN frequency SET DEFAULT 'Monthly';

ALTER TABLE financial_goal
  ALTER COLUMN order_index SET DEFAULT 0;