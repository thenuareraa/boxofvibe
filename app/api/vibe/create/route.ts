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

// POST /api/vibe/create - create a new vibe session
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { friendIds } = await request.json();

  // Generate 4-char session code
  const sessionCode = Math.floor(1000 + Math.random() * 9000).toString();

  // Create session
  const { data: session, error: sessionError } = await supabase
    .from('vibe_sessions')
    .insert([{ host_id: user.id, session_code: sessionCode }])
    .select()
    .single();

  if (sessionError) return NextResponse.json({ success: false, error: sessionError.message }, { status: 500 });

  // Add host as member
  await supabase.from('vibe_session_members').insert([{ session_id: session.id, user_id: user.id }]);

  // Send invites to friends
  if (friendIds && friendIds.length > 0) {
    const invites = friendIds.map((friendId: number) => ({
      session_id: session.id,
      sender_id: user.id,
      receiver_id: friendId,
    }));
    await supabase.from('vibe_invites').insert(invites);
  }

  return NextResponse.json({ success: true, session });
}
