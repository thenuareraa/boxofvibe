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

// GET /api/vibe/[sessionId] - get session state
export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { sessionId } = await params;

  // Get session
  const { data: session } = await supabase.from('vibe_sessions').select('*').eq('id', sessionId).single();
  if (!session) return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });

  // Get members with user info
  const { data: members } = await supabase
    .from('vibe_session_members')
    .select('user_id, joined_at, custom_users(id, username, unique_code, last_seen)')
    .eq('session_id', sessionId)
    .order('joined_at', { ascending: true });

  // Get queue with song info
  const { data: queue } = await supabase
    .from('vibe_queue')
    .select('id, song_id, added_by, position, songs(*)')
    .eq('session_id', sessionId)
    .order('position', { ascending: true });

  // Get current song
  let currentSong = null;
  if (session.current_song_id) {
    const { data } = await supabase.from('songs').select('*').eq('id', session.current_song_id).single();
    currentSong = data;
  }

  return NextResponse.json({
    success: true,
    session,
    members: (members || []).map((m: any) => ({
      ...m.custom_users,
      joined_at: m.joined_at,
      is_host: m.user_id === session.host_id,
    })),
    queue: queue || [],
    currentSong,
  });
}

// POST /api/vibe/[sessionId]/control - host controls play/pause/seek
export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { sessionId } = await params;
  const { action, position, songId } = await request.json();

  // Verify user is a member
  const { data: member } = await supabase
    .from('vibe_session_members')
    .select('id')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (!member) return NextResponse.json({ success: false, error: 'Not a member' }, { status: 403 });

  const updates: any = {};
  if (action === 'play') updates.is_playing = true;
  else if (action === 'pause') updates.is_playing = false;
  else if (action === 'seek' && position !== undefined) updates.current_position = position;
  else if (action === 'next' && songId) {
    updates.current_song_id = songId;
    updates.current_position = 0;
    updates.is_playing = true;
  }

  if (action === 'seek' && position !== undefined) {
    updates.current_position = position;
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('vibe_sessions').update(updates).eq('id', sessionId);
  }

  return NextResponse.json({ success: true, ...updates });
}
