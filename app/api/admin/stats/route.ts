import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Get all users with their stats
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    // Get user stats for each user
    const { data: userStats, error: statsError } = await supabase
      .from('user_stats')
      .select('*');

    if (statsError) throw statsError;

    // Get total play history count
    const { data: playHistory, error: playError } = await supabase
      .from('play_history')
      .select('id, user_id, song_id, played_at, completed');

    if (playError) throw playError;

    // Get all songs
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('*')
      .order('play_count', { ascending: false });

    if (songsError) throw songsError;

    // Get playlists count per user
    const { data: playlists, error: playlistsError } = await supabase
      .from('playlists')
      .select('id, user_id');

    if (playlistsError) throw playlistsError;

    // Combine user data with stats
    const usersWithStats = (users || []).map(user => {
      const stats = (userStats || []).find(s => s.user_id === user.id);
      const userPlays = (playHistory || []).filter(p => p.user_id === user.id);
      const userPlaylists = (playlists || []).filter(p => p.user_id === user.id);

      return {
        ...user,
        stats: {
          total_plays: stats?.total_plays || userPlays.length,
          total_listening_time: stats?.total_listening_time || 0,
          favorite_songs_count: stats?.favorite_songs_count || 0,
          playlists_count: userPlaylists.length,
          last_active_at: stats?.last_active_at || user.created_at,
          songs_completed: userPlays.filter(p => p.completed).length,
          unique_songs_played: new Set(userPlays.map(p => p.song_id)).size
        }
      };
    });

    // Overall stats
    const totalPlays = (playHistory || []).length;
    const totalSongs = (songs || []).length;
    const totalUsers = (users || []).length;
    const totalListeningTime = (userStats || []).reduce((sum, s) => sum + (s.total_listening_time || 0), 0);

    // Most played songs
    const mostPlayedSongs = (songs || [])
      .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
      .slice(0, 10);

    // Recent activity
    const recentActivity = (playHistory || [])
      .sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())
      .slice(0, 20);

    return NextResponse.json({
      overview: {
        total_plays: totalPlays,
        total_songs: totalSongs,
        total_users: totalUsers,
        total_listening_time: totalListeningTime,
        total_playlists: (playlists || []).length
      },
      users: usersWithStats,
      most_played_songs: mostPlayedSongs,
      recent_activity: recentActivity,
      songs: songs || []
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
