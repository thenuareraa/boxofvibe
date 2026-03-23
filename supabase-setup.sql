-- Create function to increment play count
CREATE OR REPLACE FUNCTION increment_play_count(song_id_param INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE songs
  SET play_count = play_count + 1
  WHERE id = song_id_param;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_play_count(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_play_count(INTEGER) TO anon;
