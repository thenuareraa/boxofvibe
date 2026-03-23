-- ============================================
-- MIGRATION: Update existing custom_users table
-- Makes username UNIQUE and NOT NULL
-- ============================================

-- Step 1: Add unique constraint to username column if not exists
DO $$
BEGIN
    -- Check if username column exists and make it NOT NULL
    ALTER TABLE custom_users ALTER COLUMN username SET NOT NULL;
EXCEPTION
    WHEN others THEN
        -- If it fails, username might have NULL values
        RAISE NOTICE 'Could not set username to NOT NULL. Some users might have NULL usernames.';
END $$;

-- Step 2: Create unique index on username (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_users_username_unique ON custom_users(username);

-- Step 3: Update any NULL usernames with email prefix (if any exist)
UPDATE custom_users
SET username = CONCAT(split_part(email, '@', 1), '_', id)
WHERE username IS NULL OR username = '';

-- Step 4: Now set username to NOT NULL (after fixing NULL values)
ALTER TABLE custom_users ALTER COLUMN username SET NOT NULL;

-- Step 5: Add index for username lookups (performance)
CREATE INDEX IF NOT EXISTS idx_custom_users_username ON custom_users(username);

-- Done! Username is now UNIQUE and REQUIRED
