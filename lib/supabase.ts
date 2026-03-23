import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export type Song = {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: string;
  cover_url: string;
  file_url: string;
  file_size: string;
  bitrate: string;
  format: string;
  play_count: number;
  uploaded_at: string;
  uploaded_by: string;
  created_at: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
};

export type Playlist = {
  id: number;
  user_id: string;
  name: string;
  description?: string;
  cover_url?: string;
  created_at: string;
  updated_at: string;
};

export type PlaylistSong = {
  id: number;
  playlist_id: number;
  song_id: number;
  added_at: string;
};
