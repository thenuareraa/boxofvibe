import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { song_id, play_duration = 0, total_duration = 0, completed = false } = await request.json();

    // Only count if user listened to at least 50% of the song
    const halfPlayed = total_duration > 0 && play_duration >= total_duration * 0.5;
    if (!completed && !halfPlayed) {
      return NextResponse.json({ success: true, counted: false });
    }

    // Validate using custom session token
    const sessionToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: session } = await supabase
      .from('custom_sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .single();

    if (!session || new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Increment play_count on the songs table
    const { error: countError } = await supabase.rpc('increment_play_count', {
      song_id_param: song_id,
    });

    if (countError) {
      // Fallback: manual increment if RPC doesn't exist
      const { data: song } = await supabase
        .from('songs')
        .select('play_count')
        .eq('id', song_id)
        .single();

      await supabase
        .from('songs')
        .update({ play_count: (song?.play_count || 0) + 1 })
        .eq('id', song_id);
    }

    // Record play history if table exists (silently ignore if it doesn't)
    try {
      await supabase.from('play_history').insert([{
        user_id: String(session.user_id),
        song_id,
        play_duration,
        completed,
        played_at: new Date().toISOString(),
      }]);
    } catch { /* table may not exist */ }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Track play error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
