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

// POST /api/vibe/invite - send vibe invites to friends
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { sessionId, friendIds } = await request.json();
  if (!sessionId || !friendIds?.length) return NextResponse.json({ success: false, error: 'Missing params' }, { status: 400 });

  const invites = friendIds.map((friendId: number) => ({
    session_id: sessionId,
    sender_id: user.id,
    receiver_id: friendId,
  }));

  await supabase.from('vibe_invites').insert(invites);
  return NextResponse.json({ success: true });
}

// GET /api/vibe/[sessionId]/invites - get pending invites for current user
export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { sessionId } = await params;
  const { data: invites } = await supabase
    .from('vibe_invites')
    .select('id, sender_id, status, created_at, vibe_sessions(session_code, status)')
    .eq('receiver_id', user.id)
    .eq('status', 'pending')
    .eq('session_id', sessionId);

  return NextResponse.json({ success: true, invites: invites || [] });
}
