-- Migration 004: Add authentication and invitation system
-- Run after 003_volley_balance_players.sql

BEGIN;

-- Create users table for authenticated users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    full_name VARCHAR(255),
    picture_url TEXT,
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create invitations table for whitelisted emails
CREATE TABLE IF NOT EXISTS invitations (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    invited_by VARCHAR(255),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT
);

-- Create sessions table for user sessions
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR(255) PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_is_active ON invitations(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- Add comments
COMMENT ON TABLE users IS 'Authenticated users with Google OAuth';
COMMENT ON TABLE invitations IS 'Whitelist of invited email addresses';
COMMENT ON TABLE sessions IS 'User session storage';

COMMENT ON COLUMN users.email IS 'User email from Google OAuth';
COMMENT ON COLUMN users.google_id IS 'Google user ID from OAuth';
COMMENT ON COLUMN users.is_active IS 'Whether user can access the app';
COMMENT ON COLUMN invitations.email IS 'Whitelisted email address';
COMMENT ON COLUMN invitations.is_active IS 'Whether invitation is valid';

COMMIT;
