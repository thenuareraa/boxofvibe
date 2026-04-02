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

// POST /api/vibe/join - join a session by code
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { sessionCode } = await request.json();
  if (!sessionCode) return NextResponse.json({ success: false, error: 'Session code required' }, { status: 400 });

  // Find session
  const { data: session } = await supabase
    .from('vibe_sessions')
    .select('*')
    .eq('session_code', sessionCode)
    .eq('status', 'active')
    .single();

  if (!session) return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });

  // Check if already a member
  const { data: existing } = await supabase
    .from('vibe_session_members')
    .select('id')
    .eq('session_id', session.id)
    .eq('user_id', user.id)
    .single();

  if (!existing) {
    await supabase.from('vibe_session_members').insert([{ session_id: session.id, user_id: user.id }]);
  }

  return NextResponse.json({ success: true, session });
}
