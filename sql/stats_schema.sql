-- User Statistics Table
CREATE TABLE IF NOT EXISTS user_stats (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_plays INTEGER DEFAULT 0,
  total_listening_time INTEGER DEFAULT 0, -- in seconds
  favorite_songs_count INTEGER DEFAULT 0,
  playlists_count INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Song Play History Table
CREATE TABLE IF NOT EXISTS play_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id BIGINT REFERENCES songs(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ DEFAULT NOW(),
  play_duration INTEGER DEFAULT 0, -- seconds listened
  completed BOOLEAN DEFAULT FALSE -- did they listen to the end
);

-- User Activity Log
CREATE TABLE IF NOT EXISTS user_activity (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'login', 'play_song', 'create_playlist', 'like_song'
  activity_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security Policies
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Users can only see their own stats
CREATE POLICY "Users can view their own stats"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
  ON user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Play history policies
CREATE POLICY "Users can view their own play history"
  ON play_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own play history"
  ON play_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Activity log policies
CREATE POLICY "Users can view their own activity"
  ON user_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity"
  ON user_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to increment play count
CREATE OR REPLACE FUNCTION increment_play_count(song_id_param BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE songs
  SET play_count = play_count + 1
  WHERE id = song_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats after play
CREATE OR REPLACE FUNCTION update_user_stats_on_play()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id, total_plays, total_listening_time, last_active_at)
  VALUES (NEW.user_id, 1, NEW.play_duration, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_plays = user_stats.total_plays + 1,
    total_listening_time = user_stats.total_listening_time + NEW.play_duration,
    last_active_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats when song is played
CREATE TRIGGER update_user_stats_trigger
AFTER INSERT ON play_history
FOR EACH ROW
EXECUTE FUNCTION update_user_stats_on_play();

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_play_history_user_id ON play_history(user_id);
CREATE INDEX IF NOT EXISTS idx_play_history_song_id ON play_history(song_id);
CREATE INDEX IF NOT EXISTS idx_play_history_played_at ON play_history(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at DESC);
