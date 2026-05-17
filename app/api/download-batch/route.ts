import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { song_ids } = await request.json();

    if (!Array.isArray(song_ids) || song_ids.length === 0) {
      return NextResponse.json({ error: 'song_ids array required' }, { status: 400 });
    }

    // Fetch the pending songs to get their YouTube URLs
    const { data: songs, error } = await supabase
      .from('pending_songs')
      .select('id, title, artist, youtube_url')
      .in('id', song_ids)
      .eq('status', 'pending');

    if (error) throw error;
    if (!songs || songs.length === 0) {
      return NextResponse.json({ error: 'No pending songs found with those IDs' }, { status: 404 });
    }

    // Mark them as "downloading" immediately
    await supabase
      .from('pending_songs')
      .update({ status: 'downloading' })
      .in('id', song_ids);

    // Trigger GitHub Actions workflow dispatch
    const ghToken = process.env.GITHUB_ACTIONS_TOKEN;
    const ghRepo = process.env.GITHUB_REPO || 'thenuareraa/boxofvibe';

    if (!ghToken) {
      // No GH token configured — just mark as downloading and return
      return NextResponse.json({
        success: true,
        queued: songs.length,
        note: 'GitHub Actions token not configured. Songs marked as downloading.',
      });
    }

    const workflowResponse = await fetch(
      `https://api.github.com/repos/${ghRepo}/actions/workflows/download-songs.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            song_ids: song_ids.join(','),
          },
        }),
      }
    );

    if (!workflowResponse.ok) {
      const errText = await workflowResponse.text();
      console.error('GitHub Actions dispatch failed:', errText);
      // Revert status on failure
      await supabase
        .from('pending_songs')
        .update({ status: 'pending' })
        .in('id', song_ids);
      return NextResponse.json({ error: 'Failed to trigger download workflow' }, { status: 500 });
    }

    return NextResponse.json({ success: true, queued: songs.length });
  } catch (error: any) {
    console.error('download-batch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
