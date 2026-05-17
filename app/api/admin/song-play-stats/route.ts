import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role bypasses RLS — safe here since this is admin-only
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const songId = request.nextUrl.searchParams.get('song_id');
    if (!songId) return NextResponse.json({ error: 'song_id required' }, { status: 400 });

    const { data: plays, error } = await supabase
      .from('play_history')
      .select('user_id, played_at')
      .eq('song_id', parseInt(songId))
      .order('played_at', { ascending: false });

    if (error) {
      console.error('play_history query error:', error);
      return NextResponse.json({ stats: [], error: error.message });
    }

    if (!plays || plays.length === 0) {
      return NextResponse.json({ stats: [] });
    }

    // Aggregate per user
    const statsMap: Record<string, { count: number; last_played: string }> = {};
    for (const row of plays) {
      const uid = String(row.user_id);
      if (!statsMap[uid]) statsMap[uid] = { count: 0, last_played: row.played_at };
      statsMap[uid].count++;
    }

    // Fetch usernames
    const userIds = Object.keys(statsMap);
    const { data: usersData } = await supabase
      .from('custom_users')
      .select('id, username')
      .in('id', userIds);

    const usernameMap: Record<string, string> = {};
    for (const u of usersData || []) usernameMap[String(u.id)] = u.username;

    const stats = userIds
      .map(uid => ({
        username: usernameMap[uid] || `User ${uid}`,
        count: statsMap[uid].count,
        last_played: statsMap[uid].last_played,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
