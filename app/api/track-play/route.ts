import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { song_id, play_duration = 0, completed = false } = await request.json();

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Insert play history
    const { error: playError } = await supabase
      .from('play_history')
      .insert([
        {
          user_id: user.id,
          song_id,
          play_duration,
          completed
        }
      ]);

    if (playError) {
      console.error('Error tracking play:', playError);
      return NextResponse.json({ error: playError.message }, { status: 500 });
    }

    // Increment song play count
    const { error: countError } = await supabase.rpc('increment_play_count', {
      song_id_param: song_id
    });

    if (countError) {
      console.error('Error incrementing play count:', countError);
    }

    // Log activity
    await supabase
      .from('user_activity')
      .insert([
        {
          user_id: user.id,
          activity_type: 'play_song',
          activity_data: { song_id, completed }
        }
      ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Track play error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
