-- Create expense_tags table for user-defined expense tags
-- This table stores tags for: tag_for, lifestyle_level, payment_from

CREATE TABLE IF NOT EXISTS expense_tags (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    tag_label VARCHAR(50) NOT NULL CHECK (tag_label IN ('For', 'Lifestyle Level', 'Payment From')),
    tag_name VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, tag_label, tag_name),
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_expense_tags_user_id ON expense_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_tags_tag_label ON expense_tags(tag_label);
CREATE INDEX IF NOT EXISTS idx_expense_tags_user_label ON expense_tags(user_id, tag_label);

-- Add comment for documentation
COMMENT ON TABLE expense_tags IS 'User-defined expense tags for tag_for, lifestyle_level, and payment_from fields';
COMMENT ON COLUMN expense_tags.tag_label IS 'Tag category: For, Lifestyle Level, or Payment From';
COMMENT ON COLUMN expense_tags.tag_name IS 'User-defined tag value';

