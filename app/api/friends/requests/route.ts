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

// GET /api/friends/requests - list pending requests (received by current user)
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { data: requests } = await supabase
    .from('friend_requests')
    .select('id, status, created_at, sender_id')
    .eq('receiver_id', user.id)
    .eq('status', 'pending');

  // Enrich with sender info
  const enriched = await Promise.all((requests || []).map(async (req) => {
    const { data: sender } = await supabase
      .from('custom_users').select('id, username, unique_code').eq('id', req.sender_id).single();
    return { ...req, sender };
  }));

  return NextResponse.json({ success: true, requests: enriched });
}

// POST /api/friends/requests - send a friend request by unique_code
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { unique_code } = await request.json();
  if (!unique_code) return NextResponse.json({ success: false, error: 'unique_code required' }, { status: 400 });

  // Find target user
  const { data: target } = await supabase
    .from('custom_users').select('id, username').eq('unique_code', unique_code).single();

  if (!target) return NextResponse.json({ success: false, error: 'No user found with that ID' }, { status: 404 });
  if (target.id === user.id) return NextResponse.json({ success: false, error: "You can't add yourself" }, { status: 400 });

  // Check if already friends
  const { data: existing } = await supabase
    .from('friendships').select('id').eq('user_id', user.id).eq('friend_id', target.id).single();
  if (existing) return NextResponse.json({ success: false, error: 'Already friends' }, { status: 400 });

  // Check if request already sent
  const { data: existingReq } = await supabase
    .from('friend_requests').select('id, status').eq('sender_id', user.id).eq('receiver_id', target.id).single();
  if (existingReq) return NextResponse.json({ success: false, error: 'Request already sent' }, { status: 400 });

  // Insert request
  const { error } = await supabase.from('friend_requests').insert([{
    sender_id: user.id,
    receiver_id: target.id,
    status: 'pending'
  }]);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, message: `Friend request sent to ${target.username}` });
}
