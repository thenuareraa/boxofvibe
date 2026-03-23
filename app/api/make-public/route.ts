import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    // Read service account credentials
    const serviceAccountPath = path.join(process.cwd(), 'google-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    // Authenticate with Google Drive
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Get all MP3 files from Google Drive folder
    const driveResponse = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType='audio/mpeg' and trashed=false`,
      fields: 'files(id, name)',
    });

    const driveFiles = driveResponse.data.files || [];
    let madePublic = 0;
    const errors = [];

    // Make each file publicly accessible
    for (const file of driveFiles) {
      try {
        await drive.permissions.create({
          fileId: file.id!,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
        madePublic++;
      } catch (err: any) {
        errors.push({ file: file.name, error: err.message });
      }
    }

    // Now update all songs in database to use direct Google Drive URLs
    const { data: songs } = await supabase
      .from('songs')
      .select('*');

    let updated = 0;
    for (const song of songs || []) {
      // Extract file ID from /api/stream/ URL
      const match = song.file_url.match(/\/api\/stream\/([^/?]+)/);
      if (match) {
        const fileId = match[1];
        // Update to direct Google Drive URL
        await supabase
          .from('songs')
          .update({
            file_url: `https://drive.google.com/uc?export=download&id=${fileId}`
          })
          .eq('id', song.id);
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Made ${madePublic} files public and updated ${updated} songs`,
      madePublic,
      updated,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Make public error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
