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

  // Single JOIN query - gets songs directly
  const { data: songs, error } = await supabase
    .from('playlist_songs')
    .select('songs(*)')
    .eq('playlist_id', playlistId);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const extractedSongs = (songs || [])
    .map((item: any) => item.songs)
    .filter(Boolean);

  return NextResponse.json({ success: true, songs: extractedSongs });
}
