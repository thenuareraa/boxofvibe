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

// POST /api/friends/requests/[id]/accept
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const reqId = parseInt(id);

  // Get the request
  const { data: friendReq } = await supabase
    .from('friend_requests').select('*').eq('id', reqId).single();

  if (!friendReq || friendReq.receiver_id !== user.id) {
    return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
  }

  // Update request status
  await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', reqId);

  // Create friendship (both directions)
  await supabase.from('friendships').insert([
    { user_id: friendReq.receiver_id, friend_id: friendReq.sender_id },
    { user_id: friendReq.sender_id, friend_id: friendReq.receiver_id },
  ]);

  return NextResponse.json({ success: true });
}
