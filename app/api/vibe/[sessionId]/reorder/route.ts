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

// POST /api/vibe/[sessionId]/reorder - reorder queue items
export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { sessionId } = await params;
  const { queueItems } = await request.json();

  if (!queueItems || !Array.isArray(queueItems)) {
    return NextResponse.json({ success: false, error: 'queueItems array required' }, { status: 400 });
  }

  // Verify user is a member
  const { data: member } = await supabase
    .from('vibe_session_members')
    .select('id')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (!member) return NextResponse.json({ success: false, error: 'Not a member' }, { status: 403 });

  // Update positions for each item
  for (const item of queueItems) {
    await supabase
      .from('vibe_queue')
      .update({ position: item.position })
      .eq('id', item.id)
      .eq('session_id', sessionId);
  }

  return NextResponse.json({ success: true });
}
