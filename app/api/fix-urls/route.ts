import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    // Get all songs
    const { data: songs, error: fetchError } = await supabase
      .from('songs')
      .select('id, file_url');

    if (fetchError) {
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    let fixed = 0;
    const errors = [];

    for (const song of songs || []) {
      try {
        // Extract the current URL
        const currentUrl = song.file_url;

        // Extract filename from URL (everything after last /)
        const lastSlashIndex = currentUrl.lastIndexOf('/');
        const urlFilename = currentUrl.substring(lastSlashIndex + 1);

        // Decode the filename completely (handles mixed encoding)
        let decodedFilename = urlFilename;
        try {
          // Try to decode - if it fails, use as-is
          decodedFilename = decodeURIComponent(urlFilename);
        } catch {
          decodedFilename = urlFilename;
        }

        // Create properly encoded URL
        const newUrl = `${process.env.R2_PUBLIC_URL}/${encodeURIComponent(decodedFilename)}`;

        // Always update to ensure proper encoding
        const { error: updateError } = await supabase
          .from('songs')
          .update({ file_url: newUrl })
          .eq('id', song.id);

        if (updateError) {
          errors.push({ id: song.id, error: updateError.message });
        } else {
          fixed++;
        }
      } catch (err: any) {
        errors.push({ id: song.id, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixed} song URLs`,
      fixed,
      total: songs?.length || 0,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
