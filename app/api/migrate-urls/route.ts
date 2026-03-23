import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrateUrls() {
  // Get all songs
  const { data: songs, error: fetchError } = await supabase
    .from('songs')
    .select('id, file_url');

  if (fetchError) {
    return NextResponse.json(
      { success: false, error: fetchError.message },
      { status: 500 }
    );
  }

  let updated = 0;

  // Update each song's URL to DIRECT Google Drive URL for instant playback
  for (const song of songs || []) {
    let fileId: string | null = null;

    // Extract file ID from any URL format
    const oldMatch = song.file_url.match(/id=([^&]+)/);
    const apiMatch = song.file_url.match(/\/api\/stream\/([^/?]+)/);

    if (oldMatch) {
      fileId = oldMatch[1];
    } else if (apiMatch) {
      fileId = apiMatch[1];
    }

    if (fileId) {
      const newUrl = `/api/stream/${fileId}`;

      const { error: updateError } = await supabase
        .from('songs')
        .update({ file_url: newUrl })
        .eq('id', song.id);

      if (!updateError) {
        updated++;
        console.log(`Updated song ${song.id}: ${song.file_url} -> ${newUrl}`);
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: `Migrated ${updated} song URLs to direct Google Drive URLs for instant playback!`,
    updated,
  });
}

export async function GET() {
  try {
    return await migrateUrls();
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    return await migrateUrls();
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
