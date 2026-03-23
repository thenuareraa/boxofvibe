-- ============================================
-- COMPLETE ANALYTICS SYSTEM FOR BOXOFVIBE
-- Tracks EVERYTHING users do
-- ============================================

-- 1. USER SESSIONS TABLE
-- Tracks every login/logout, session duration
CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_end TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  device_info TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. DETAILED PLAY HISTORY
-- Tracks every single play with full details
CREATE TABLE IF NOT EXISTS play_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
  play_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  play_ended_at TIMESTAMP WITH TIME ZONE,
  play_duration_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  skipped BOOLEAN DEFAULT FALSE,
  skip_position_seconds INTEGER,
  source TEXT, -- 'search', 'playlist', 'liked', 'queue', 'recommendation'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. USER ACTIONS TABLE
-- Tracks EVERY action: like, unlike, add to playlist, create playlist, etc.
CREATE TABLE IF NOT EXISTS user_actions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'like_song', 'unlike_song', 'create_playlist', 'add_to_playlist', 'remove_from_playlist', 'delete_playlist', 'search'
  target_id INTEGER, -- song_id or playlist_id
  action_data JSONB, -- Additional data about the action
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SEARCH QUERIES TABLE
-- Tracks all searches
CREATE TABLE IF NOT EXISTS search_queries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results_count INTEGER,
  clicked_song_id INTEGER REFERENCES songs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. SONG ANALYTICS TABLE
-- Aggregate stats per song (updated in real-time)
CREATE TABLE IF NOT EXISTS song_analytics (
  song_id INTEGER PRIMARY KEY REFERENCES songs(id) ON DELETE CASCADE,
  total_plays INTEGER DEFAULT 0,
  unique_listeners INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_duration_seconds BIGINT DEFAULT 0,
  average_completion_rate DECIMAL(5,2) DEFAULT 0,
  skip_rate DECIMAL(5,2) DEFAULT 0,
  last_played_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. USER ANALYTICS TABLE
-- Aggregate stats per user
CREATE TABLE IF NOT EXISTS user_analytics (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_listening_time_seconds BIGINT DEFAULT 0,
  total_songs_played INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_playlists INTEGER DEFAULT 0,
  favorite_artist TEXT,
  favorite_genre TEXT,
  last_active_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS TO UPDATE STATS AUTOMATICALLY
-- ============================================

-- Function: Increment play count
CREATE OR REPLACE FUNCTION increment_play_count(song_id_param INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE songs SET play_count = play_count + 1 WHERE id = song_id_param;

  -- Update song analytics
  INSERT INTO song_analytics (song_id, total_plays, last_played_at)
  VALUES (song_id_param, 1, NOW())
  ON CONFLICT (song_id)
  DO UPDATE SET
    total_plays = song_analytics.total_plays + 1,
    last_played_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function: Track completed play
CREATE OR REPLACE FUNCTION track_completed_play(
  p_user_id UUID,
  p_song_id INTEGER,
  p_duration_seconds INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- Update song analytics
  UPDATE song_analytics
  SET
    total_duration_seconds = total_duration_seconds + p_duration_seconds,
    updated_at = NOW()
  WHERE song_id = p_song_id;

  -- Update user analytics
  INSERT INTO user_analytics (user_id, total_listening_time_seconds, total_songs_played, last_active_at)
  VALUES (p_user_id, p_duration_seconds, 1, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_listening_time_seconds = user_analytics.total_listening_time_seconds + p_duration_seconds,
    total_songs_played = user_analytics.total_songs_played + 1,
    last_active_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function: Track like action
CREATE OR REPLACE FUNCTION track_like_action(
  p_user_id UUID,
  p_song_id INTEGER,
  p_action TEXT -- 'like' or 'unlike'
)
RETURNS VOID AS $$
BEGIN
  -- Update song analytics
  UPDATE song_analytics
  SET
    total_likes = CASE
      WHEN p_action = 'like' THEN total_likes + 1
      ELSE GREATEST(total_likes - 1, 0)
    END,
    updated_at = NOW()
  WHERE song_id = p_song_id;

  -- Update user analytics
  UPDATE user_analytics
  SET
    total_likes = CASE
      WHEN p_action = 'like' THEN total_likes + 1
      ELSE GREATEST(total_likes - 1, 0)
    END,
    last_active_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS FOR ANALYTICS DASHBOARD
-- ============================================

-- View: Top songs today
CREATE OR REPLACE VIEW top_songs_today AS
SELECT
  s.id,
  s.title,
  s.artist,
  COUNT(ph.id) as plays_today,
  COUNT(DISTINCT ph.user_id) as unique_listeners
FROM songs s
LEFT JOIN play_history ph ON s.id = ph.song_id AND ph.created_at >= CURRENT_DATE
GROUP BY s.id, s.title, s.artist
ORDER BY plays_today DESC
LIMIT 50;

-- View: Active users today
CREATE OR REPLACE VIEW active_users_today AS
SELECT
  COUNT(DISTINCT user_id) as active_users_today
FROM user_actions
WHERE created_at >= CURRENT_DATE;

-- View: Total listening time today
CREATE OR REPLACE VIEW listening_stats_today AS
SELECT
  SUM(play_duration_seconds) as total_seconds,
  COUNT(*) as total_plays,
  COUNT(DISTINCT user_id) as unique_listeners
FROM play_history
WHERE created_at >= CURRENT_DATE;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT ALL ON user_sessions TO authenticated;
GRANT ALL ON play_history TO authenticated;
GRANT ALL ON user_actions TO authenticated;
GRANT ALL ON search_queries TO authenticated;
GRANT ALL ON song_analytics TO authenticated;
GRANT ALL ON user_analytics TO authenticated;

GRANT EXECUTE ON FUNCTION increment_play_count(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION track_completed_play(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION track_like_action(UUID, INTEGER, TEXT) TO authenticated;

GRANT SELECT ON top_songs_today TO authenticated;
GRANT SELECT ON active_users_today TO authenticated;
GRANT SELECT ON listening_stats_today TO authenticated;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_play_history_user ON play_history(user_id);
CREATE INDEX IF NOT EXISTS idx_play_history_song ON play_history(song_id);
CREATE INDEX IF NOT EXISTS idx_play_history_created ON play_history(created_at);
CREATE INDEX IF NOT EXISTS idx_user_actions_user ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_created ON user_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_search_queries_user ON search_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
