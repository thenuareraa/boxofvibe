import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const serviceAccountPath = path.join(process.cwd(), 'google-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Get all songs
    const { data: songs } = await supabase
      .from('songs')
      .select('*');

    let updated = 0;

    for (const song of songs || []) {
      // Extract file ID
      const match = song.file_url.match(/\/api\/stream\/([^/?]+)/);
      if (match) {
        const fileId = match[1];

        // Get the webContentLink from Google Drive
        const file = await drive.files.get({
          fileId: fileId,
          fields: 'webContentLink'
        });

        if (file.data.webContentLink) {
          await supabase
            .from('songs')
            .update({
              file_url: file.data.webContentLink
            })
            .eq('id', song.id);

          updated++;
          console.log(`Updated ${song.id}: ${file.data.webContentLink}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} songs with direct Google Drive webContentLinks`,
      updated
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
