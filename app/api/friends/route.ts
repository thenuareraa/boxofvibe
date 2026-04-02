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
    .from('custom_users').select('id, username, unique_code').eq('id', session.user_id).single();
  return user;
}

// GET /api/friends - list all friends
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { data: friendships } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', user.id);

  if (!friendships || friendships.length === 0) {
    return NextResponse.json({ success: true, friends: [] });
  }

  const friendIds = friendships.map(f => f.friend_id);
  const cutoff = new Date(Date.now() - 90000).toISOString(); // 90s = online

  const { data: friends } = await supabase
    .from('custom_users')
    .select('id, username, unique_code, last_seen')
    .in('id', friendIds);

  const enriched = (friends || []).map(f => ({
    ...f,
    is_online: f.last_seen && new Date(f.last_seen) > new Date(cutoff),
  }));

  return NextResponse.json({ success: true, friends: enriched });
}

// DELETE /api/friends - remove a friend (bidirectional)
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { friendId } = await request.json();
  if (!friendId) return NextResponse.json({ success: false, error: 'Friend ID required' }, { status: 400 });

  // Remove both directions
  await supabase.from('friendships').delete().eq('user_id', user.id).eq('friend_id', friendId);
  await supabase.from('friendships').delete().eq('user_id', friendId).eq('friend_id', user.id);

  return NextResponse.json({ success: true });
}
