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

  // Use RPC for fast single-query count
  const { data: playlists, error } = await supabase.rpc('get_user_playlists_with_counts', { target_user_id: friendId });

  if (error) {
    // Fallback to simple query
    const { data: simplePlaylists } = await supabase
      .from('playlists')
      .select('id, name, created_at')
      .eq('custom_user_id', friendId)
      .order('created_at', { ascending: false });

    return NextResponse.json({ success: true, playlists: (simplePlaylists || []).map((pl: any) => ({
      id: pl.id,
      name: pl.name,
      song_count: 0,
    })) });
  }

  return NextResponse.json({ success: true, playlists: playlists || [] });
}
