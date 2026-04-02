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

// POST /api/vibe/leave - leave a vibe session
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { sessionId } = await request.json();
  if (!sessionId) return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 });

  // Remove from members
  await supabase.from('vibe_session_members').delete().eq('session_id', sessionId).eq('user_id', user.id);

  // Check if host left
  const { data: session } = await supabase.from('vibe_sessions').select('*').eq('id', sessionId).single();
  if (session && session.host_id === user.id) {
    // Find next member to promote
    const { data: members } = await supabase.from('vibe_session_members').select('user_id').eq('session_id', sessionId).order('joined_at', { ascending: true }).limit(1);
    if (members && members.length > 0) {
      await supabase.from('vibe_sessions').update({ host_id: members[0].user_id }).eq('id', sessionId);
    } else {
      // No members left, end session
      await supabase.from('vibe_sessions').update({ status: 'ended' }).eq('id', sessionId);
    }
  }

  return NextResponse.json({ success: true });
}
