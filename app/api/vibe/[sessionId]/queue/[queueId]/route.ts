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

// DELETE /api/vibe/[sessionId]/queue/[queueId] - remove song from queue
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ sessionId: string; queueId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { queueId } = await params;

  // Check if user added this song
  const { data: item } = await supabase
    .from('vibe_queue')
    .select('added_by')
    .eq('id', queueId)
    .single();

  if (!item) return NextResponse.json({ success: false, error: 'Queue item not found' }, { status: 404 });
  if (item.added_by !== user.id) return NextResponse.json({ success: false, error: 'You can only remove songs you added' }, { status: 403 });

  await supabase.from('vibe_queue').delete().eq('id', queueId);
  return NextResponse.json({ success: true });
}
