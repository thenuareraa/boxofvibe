-- Vibe Together: Collaborative Listening Sessions
-- Run this in Supabase SQL Editor

-- Vibe sessions
CREATE TABLE vibe_sessions (
  id BIGSERIAL PRIMARY KEY,
  host_id INTEGER REFERENCES custom_users(id) ON DELETE CASCADE,
  session_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active',
  current_song_id BIGINT REFERENCES songs(id),
  current_position FLOAT DEFAULT 0,
  is_playing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Session members
CREATE TABLE vibe_session_members (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES vibe_sessions(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES custom_users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Session song queue
CREATE TABLE vibe_queue (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES vibe_sessions(id) ON DELETE CASCADE,
  song_id BIGINT REFERENCES songs(id),
  added_by INTEGER REFERENCES custom_users(id),
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Session invites
CREATE TABLE vibe_invites (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES vibe_sessions(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES custom_users(id) ON DELETE CASCADE,
  receiver_id INTEGER REFERENCES custom_users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies

ALTER TABLE vibe_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_session_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_invites ENABLE ROW LEVEL SECURITY;

-- Vibe sessions: members can read, only host can update
CREATE POLICY "vibe_sessions_read_members" ON vibe_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM vibe_session_members WHERE vibe_session_members.session_id = vibe_sessions.id AND vibe_session_members.user_id = (SELECT id FROM custom_users WHERE id = vibe_sessions.host_id))
    OR host_id = (SELECT id FROM custom_users WHERE id = vibe_sessions.host_id)
  );

CREATE POLICY "vibe_sessions_insert_any" ON vibe_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "vibe_sessions_update_host" ON vibe_sessions
  FOR UPDATE USING (host_id = (SELECT id FROM custom_users WHERE id = vibe_sessions.host_id));

-- Session members: members can read, anyone can join
CREATE POLICY "vibe_session_members_read" ON vibe_session_members
  FOR SELECT USING (true);

CREATE POLICY "vibe_session_members_insert" ON vibe_session_members
  FOR INSERT WITH CHECK (true);

CREATE POLICY "vibe_session_members_delete" ON vibe_session_members
  FOR DELETE USING (user_id = (SELECT id FROM custom_users WHERE id = vibe_session_members.user_id));

-- Queue: members can read, anyone can add, only adder can delete
CREATE POLICY "vibe_queue_read" ON vibe_queue
  FOR SELECT USING (true);

CREATE POLICY "vibe_queue_insert" ON vibe_queue
  FOR INSERT WITH CHECK (true);

CREATE POLICY "vibe_queue_update" ON vibe_queue
  FOR UPDATE USING (added_by = (SELECT id FROM custom_users WHERE id = vibe_queue.added_by));

CREATE POLICY "vibe_queue_delete" ON vibe_queue
  FOR DELETE USING (added_by = (SELECT id FROM custom_users WHERE id = vibe_queue.added_by));

-- Invites: receiver can read their invites
CREATE POLICY "vibe_invites_read" ON vibe_invites
  FOR SELECT USING (receiver_id = (SELECT id FROM custom_users WHERE id = vibe_invites.receiver_id));

CREATE POLICY "vibe_invites_insert" ON vibe_invites
  FOR INSERT WITH CHECK (true);

CREATE POLICY "vibe_invites_update" ON vibe_invites
  FOR UPDATE USING (receiver_id = (SELECT id FROM custom_users WHERE id = vibe_invites.receiver_id));
