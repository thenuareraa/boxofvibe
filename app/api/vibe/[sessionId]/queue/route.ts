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

// POST /api/vibe/[sessionId]/queue - add song to queue
export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { sessionId } = await params;
  const { songId } = await request.json();
  if (!songId) return NextResponse.json({ success: false, error: 'Song ID required' }, { status: 400 });

  // Get current max position
  const { data: queue } = await supabase
    .from('vibe_queue')
    .select('position')
    .eq('session_id', sessionId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = queue && queue.length > 0 ? queue[0].position + 1 : 0;

  const { data, error } = await supabase
    .from('vibe_queue')
    .insert([{ session_id: sessionId, song_id: songId, added_by: user.id, position: nextPosition }])
    .select()
    .single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, queueItem: data });
}
