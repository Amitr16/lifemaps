-- Remove the restrictive CHECK constraint on the tag column
-- This allows users to use custom tags instead of just the hardcoded 4

-- First, drop the existing CHECK constraint
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_tag_check;

-- The tag column will now accept any VARCHAR(50) value
-- Custom tags will be validated at the application level instead
