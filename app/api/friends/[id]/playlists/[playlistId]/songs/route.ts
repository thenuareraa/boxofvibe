import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAuthUser(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')?.value;
  if (!sessionToken) return null;
  const { data: session } = await supabase
    .from('custom_sessions').select('*').eq('session_token', sessionToken).single();
  if (!session || new Date(session.expires_at) < new Date()) return null;
  const { data: user } = await supabase
    .from('custom_users').select('id').eq('id', session.user_id).single();
  return user;
}

// GET /api/friends/[id]/playlists/[playlistId]/songs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; playlistId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id, playlistId: playlistIdStr } = await params;
  const friendId = parseInt(id);
  const playlistId = parseInt(playlistIdStr);

  // Verify friendship
  const { data: friendship } = await supabase
    .from('friendships').select('id').eq('user_id', user.id).eq('friend_id', friendId).single();

  if (!friendship) {
    return NextResponse.json({ success: false, error: 'Not friends with this user' }, { status: 403 });
  }

  // Verify playlist belongs to the friend
  const { data: playlist } = await supabase
    .from('playlists').select('id').eq('id', playlistId).eq('custom_user_id', friendId).single();

  if (!playlist) {
    return NextResponse.json({ success: false, error: 'Playlist not found' }, { status: 404 });
  }

  // Get songs in the playlist
  const { data: playlistSongs } = await supabase
    .from('playlist_songs')
    .select('song_id')
    .eq('playlist_id', playlistId);

  if (!playlistSongs || playlistSongs.length === 0) {
    return NextResponse.json({ success: true, songs: [] });
  }

  const songIds = playlistSongs.map(ps => ps.song_id);
  const { data: songs } = await supabase
    .from('songs').select('*').in('id', songIds);

  return NextResponse.json({ success: true, songs: songs || [] });
}
