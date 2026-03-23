import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    // Get all songs
    const { data: songs, error } = await supabase
      .from('songs')
      .select('*');

    if (error) throw error;

    let updated = 0;
    for (const song of songs || []) {
      let fileId = '';

      // Extract file ID from any URL format
      const streamMatch = song.file_url.match(/\/api\/stream\/([^/?]+)/);
      const driveMatch = song.file_url.match(/[?&]id=([^&]+)/);

      if (streamMatch) {
        fileId = streamMatch[1];
      } else if (driveMatch) {
        fileId = driveMatch[1];
      }

      if (fileId) {
        // Keep using optimized streaming API (necessary for audio streaming)
        const { error: updateError} = await supabase
          .from('songs')
          .update({
            file_url: `/api/stream/${fileId}`
          })
          .eq('id', song.id);

        if (!updateError) {
          updated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} songs to use direct Google Drive URLs for instant playback`,
      updated
    });

  } catch (error: any) {
    console.error('Update URLs error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
