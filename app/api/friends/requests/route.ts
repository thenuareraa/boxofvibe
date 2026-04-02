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
  console.log('[Friend Request] POST endpoint hit');
  
  const user = await getAuthUser(request);
  if (!user) {
    console.log('[Friend Request] Unauthorized - no valid session');
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { unique_code } = body;
  console.log(`[Friend Request] User ${user.username} (${user.id}) sending request to code: ${unique_code}`);
  
  if (!unique_code) {
    console.log('[Friend Request] No unique_code provided');
    return NextResponse.json({ success: false, error: 'unique_code required' }, { status: 400 });
  }

  // Find target user
  const { data: target, error: targetError } = await supabase
    .from('custom_users').select('id, username').eq('unique_code', unique_code).single();

  if (targetError) {
    console.log(`[Friend Request] Error finding target user: ${targetError.message}`);
  }

  if (!target) {
    console.log(`[Friend Request] No user found with code: ${unique_code}`);
    return NextResponse.json({ success: false, error: 'No user found with that ID' }, { status: 404 });
  }
  
  console.log(`[Friend Request] Found target user: ${target.username} (${target.id})`);
  
  if (target.id === user.id) {
    console.log('[Friend Request] User tried to add themselves');
    return NextResponse.json({ success: false, error: "You can't add yourself" }, { status: 400 });
  }

  // Check if already friends
  const { data: existing } = await supabase
    .from('friendships').select('id').eq('user_id', user.id).eq('friend_id', target.id).single();
  if (existing) {
    console.log('[Friend Request] Already friends');
    return NextResponse.json({ success: false, error: 'Already friends' }, { status: 400 });
  }

  // Check if a PENDING request already exists (skip accepted/rejected ones)
  const { data: existingReq } = await supabase
    .from('friend_requests').select('id, status').eq('sender_id', user.id).eq('receiver_id', target.id).eq('status', 'pending').single();
  if (existingReq) {
    console.log(`[Friend Request] Pending request already exists`);
    return NextResponse.json({ success: false, error: 'Request already sent' }, { status: 400 });
  }

  // Check if target already sent us a pending request - accept it instead
  const { data: reverseReq } = await supabase
    .from('friend_requests').select('id').eq('sender_id', target.id).eq('receiver_id', user.id).eq('status', 'pending').single();
  if (reverseReq) {
    console.log('[Friend Request] Target already sent a request, accepting it');
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', reverseReq.id);
    await supabase.from('friendships').insert([
      { user_id: user.id, friend_id: target.id },
      { user_id: target.id, friend_id: user.id },
    ]);
    return NextResponse.json({ success: true, message: `Friend request accepted from ${target.username}` });
  }

  // Delete any old requests between these users (accepted/rejected) to avoid unique constraint violation
  await supabase.from('friend_requests').delete().eq('sender_id', user.id).eq('receiver_id', target.id);
  await supabase.from('friend_requests').delete().eq('sender_id', target.id).eq('receiver_id', user.id);

  // Insert new request
  const { data: inserted, error } = await supabase.from('friend_requests').insert([{
    sender_id: user.id,
    receiver_id: target.id,
    status: 'pending'
  }]).select();

  if (error) {
    console.error(`[Friend Request] Insert error: ${error.message}`);
    console.error(`[Friend Request] Error details: ${JSON.stringify(error)}`);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  console.log(`[Friend Request] Successfully created request: ${JSON.stringify(inserted)}`);
  return NextResponse.json({ success: true, message: `Friend request sent to ${target.username}` });
}
