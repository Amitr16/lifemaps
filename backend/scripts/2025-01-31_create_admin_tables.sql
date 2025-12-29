-- Admin and Super Admin Tables
-- Run this script to create admin management tables

-- Create super_admin table
CREATE TABLE IF NOT EXISTS super_admin (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create admin table
CREATE TABLE IF NOT EXISTS admin (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES super_admin(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add admin_id to user table to track which admin manages which user
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES admin(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_super_admin_username ON super_admin(username);
CREATE INDEX IF NOT EXISTS idx_admin_username ON admin(username);
CREATE INDEX IF NOT EXISTS idx_admin_created_by ON admin(created_by);
CREATE INDEX IF NOT EXISTS idx_user_admin_id ON "user"(admin_id);

-- Create triggers for updated_at
CREATE TRIGGER update_super_admin_updated_at BEFORE UPDATE ON super_admin
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_updated_at BEFORE UPDATE ON admin
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default super admin (username: superadmin, password: superadmin123)
-- Password hash for 'superadmin123' using bcrypt with 12 rounds
-- You should generate this properly in the application, but for initial setup:
INSERT INTO super_admin (username, password_hash)
VALUES ('superadmin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY5Y5Y5Y5Y5Y')
ON CONFLICT (username) DO NOTHING;

-- Note: The password hash above is a placeholder. 
-- The actual hash should be generated using bcrypt.hash('superadmin123', 12)
-- This will be handled in the backend initialization script

