-- Create user_tags table for storing custom tag options per user
CREATE TABLE IF NOT EXISTS user_tags (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) NOT NULL,
    tag_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tag_name)
);

-- Insert default tags for existing users
INSERT INTO user_tags (user_id, tag_name, tag_order)
SELECT 
    u.id,
    tag_name,
    tag_order
FROM "user" u
CROSS JOIN (
    VALUES 
        ('Investment', 0),
        ('Personal', 1),
        ('Emergency', 2),
        ('Retirement', 3)
) AS default_tags(tag_name, tag_order)
WHERE NOT EXISTS (
    SELECT 1 FROM user_tags ut 
    WHERE ut.user_id = u.id AND ut.tag_name = default_tags.tag_name
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON user_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_user_id_order ON user_tags(user_id, tag_order);
