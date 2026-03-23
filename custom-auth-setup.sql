-- ============================================
-- CUSTOM AUTH SYSTEM - PLAIN TEXT PASSWORDS
-- WARNING: NOT SECURE - FOR ADMIN CONTROL ONLY
-- ============================================

-- Drop Supabase auth dependency (we'll use our own)

-- Custom users table with PLAIN TEXT passwords
CREATE TABLE IF NOT EXISTS custom_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- PLAIN TEXT PASSWORD (visible to admin)
  username TEXT UNIQUE NOT NULL, -- Username is UNIQUE and REQUIRED for login
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE
);

-- User sessions table (for login tracking)
CREATE TABLE IF NOT EXISTS custom_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES custom_users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  device_info TEXT
);

-- Update songs table to reference custom_users
ALTER TABLE songs DROP CONSTRAINT IF EXISTS songs_uploaded_by_fkey;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS uploaded_by_user_id INTEGER REFERENCES custom_users(id) ON DELETE SET NULL;

-- Update playlists table to reference custom_users
ALTER TABLE playlists DROP CONSTRAINT IF EXISTS playlists_user_id_fkey;
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS custom_user_id INTEGER REFERENCES custom_users(id) ON DELETE CASCADE;

-- Update liked_songs table to reference custom_users
CREATE TABLE IF NOT EXISTS custom_liked_songs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES custom_users(id) ON DELETE CASCADE,
  song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, song_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_users_email ON custom_users(email);
CREATE INDEX IF NOT EXISTS idx_custom_users_username ON custom_users(username);
CREATE INDEX IF NOT EXISTS idx_custom_sessions_token ON custom_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_custom_sessions_user ON custom_sessions(user_id);

-- Grant permissions
GRANT ALL ON custom_users TO authenticated, anon;
GRANT ALL ON custom_sessions TO authenticated, anon;
GRANT ALL ON custom_liked_songs TO authenticated, anon;

-- Sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
