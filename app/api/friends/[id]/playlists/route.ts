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

// GET /api/friends/[id]/playlists - get a friend's playlists (verified friendship)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const friendId = parseInt(id);

  // Verify they are actually friends
  const { data: friendship } = await supabase
    .from('friendships').select('id').eq('user_id', user.id).eq('friend_id', friendId).single();

  if (!friendship) {
    return NextResponse.json({ success: false, error: 'Not friends with this user' }, { status: 403 });
  }

  // Get friend's playlists with song count in a single query
  const { data: playlists } = await supabase
    .from('playlists')
    .select('id, name, created_at, playlist_songs(count)')
    .eq('custom_user_id', friendId)
    .order('created_at', { ascending: false });

  const enriched = (playlists || []).map((pl: any) => ({
    id: pl.id,
    name: pl.name,
    created_at: pl.created_at,
    song_count: pl.playlist_songs?.[0]?.count || 0,
  }));

  return NextResponse.json({ success: true, playlists: enriched });
}
