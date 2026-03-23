import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { parseBuffer } from 'music-metadata';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

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

    // Get all MP3 files from Google Drive folder with pagination
    let driveFiles: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const driveResponse = await drive.files.list({
        q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType='audio/mpeg' and trashed=false`,
        fields: 'nextPageToken, files(id, name, size)',
        pageSize: 1000, // Maximum allowed by Google Drive API
        pageToken: pageToken,
      });

      driveFiles = driveFiles.concat(driveResponse.data.files || []);
      pageToken = driveResponse.data.nextPageToken || undefined;
    } while (pageToken);

    console.log('Found in Drive:', driveFiles.length, 'files');
    console.log('Drive files:', driveFiles.map(f => ({ id: f.id, name: f.name })));

    if (driveFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No MP3 files found in Google Drive folder - make sure folder is shared with service account',
        synced: 0,
        skipped: 0,
        debug: {
          folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
          serviceEmail: serviceAccount.client_email
        }
      });
    }

    // Get existing songs from Supabase
    const { data: existingSongs } = await supabase
      .from('songs')
      .select('file_url');

    console.log('Existing songs in DB:', existingSongs?.length || 0);

    const existingUrls = new Set(
      (existingSongs || []).map(song => {
        // Extract file ID from URL (supports both old and new format)
        const oldMatch = song.file_url.match(/id=([^&]+)/);
        const newMatch = song.file_url.match(/\/api\/stream\/([^/?]+)/);
        return oldMatch ? oldMatch[1] : (newMatch ? newMatch[1] : '');
      })
    );

    console.log('Existing file IDs:', Array.from(existingUrls));

    // Filter out files that already exist in database
    const newFiles = driveFiles.filter(file => !existingUrls.has(file.id || ''));

    console.log('New files to sync:', newFiles.length);
    console.log('New files:', newFiles.map(f => ({ id: f.id, name: f.name })));

    const syncedSongs = [];
    const errors = [];

    // Process files in parallel batches of 5 for speed
    const BATCH_SIZE = 5;

    for (let i = 0; i < newFiles.length; i += BATCH_SIZE) {
      const batch = newFiles.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (file) => {
          try {
            let title, artist, album, duration;

            // Try to extract metadata from filename first (fast!)
            const fileName = file.name || 'Unknown';
            const nameWithoutExt = fileName.replace('.mp3', '');

            // Check if filename has pattern like "Artist - Song Title"
            if (nameWithoutExt.includes(' - ')) {
              const parts = nameWithoutExt.split(' - ');
              artist = parts[0].trim();
              title = parts[1].trim();
              album = 'Unknown Album';
              duration = '3:30'; // Default duration
            } else {
              // Only download first 512KB for metadata (much faster!)
              try {
                const response = await drive.files.get(
                  { fileId: file.id!, alt: 'media' },
                  {
                    responseType: 'arraybuffer',
                    headers: { Range: 'bytes=0-524288' } // First 512KB only
                  }
                );

                const buffer = Buffer.from(response.data as ArrayBuffer);
                const metadata = await parseBuffer(buffer, { mimeType: 'audio/mpeg', skipCovers: true });

                title = metadata.common.title || nameWithoutExt;
                artist = metadata.common.artist || 'Unknown Artist';
                album = metadata.common.album || 'Unknown Album';
                duration = formatDuration(metadata.format.duration);
              } catch (metaError) {
                // Fallback to filename if metadata extraction fails
                title = nameWithoutExt;
                artist = 'Unknown Artist';
                album = 'Unknown Album';
                duration = '3:30';
              }
            }

            const fileSize = formatFileSize(parseInt(file.size || '0'));

            // Get the direct Google Drive webContentLink for fast streaming
            let fileUrl = `/api/stream/${file.id}`; // fallback
            try {
              const fileMetadata = await drive.files.get({
                fileId: file.id!,
                fields: 'webContentLink'
              });
              if (fileMetadata.data.webContentLink) {
                fileUrl = fileMetadata.data.webContentLink;
              }
            } catch (err) {
              console.log('Could not get webContentLink, using proxy route');
            }

            // Create database entry with DIRECT Google Drive URL for instant playback
            const { data: newSong, error } = await supabase
              .from('songs')
              .insert([
                {
                  title,
                  artist,
                  album,
                  duration,
                  cover_url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=2400&q=95&auto=format&fit=crop',
                  file_url: fileUrl,
                  file_size: fileSize,
                  bitrate: '320 kbps',
                  format: 'MP3',
                  play_count: 0,
                  uploaded_by: 'Admin (Synced from Drive)',
                },
              ])
              .select();

            if (error) {
              errors.push({ file: file.name, error: error.message });
            } else {
              syncedSongs.push(newSong[0]);
            }
          } catch (err: any) {
            errors.push({ file: file.name, error: err.message });
          }
        })
      );
    }

    // Remove songs from database that are no longer in Drive
    const driveFileIds = new Set(driveFiles.map(f => f.id));
    console.log('Drive file IDs:', Array.from(driveFileIds));

    const songsToDelete = (existingSongs || []).filter(song => {
      // Extract file ID from URL (supports both old and new format)
      const oldMatch = song.file_url.match(/id=([^&]+)/);
      const newMatch = song.file_url.match(/\/api\/stream\/([^/?]+)/);
      const fileId = oldMatch ? oldMatch[1] : (newMatch ? newMatch[1] : '');
      const shouldDelete = fileId && !driveFileIds.has(fileId);
      console.log(`Song ${song.file_url}: fileId=${fileId}, inDrive=${driveFileIds.has(fileId)}, shouldDelete=${shouldDelete}`);
      return shouldDelete;
    });

    console.log('Songs to delete:', songsToDelete.length);

    let deletedCount = 0;
    if (songsToDelete.length > 0) {
      console.log('Deleting songs not in Drive:', songsToDelete.map(s => s.file_url));

      for (const song of songsToDelete) {
        console.log('Attempting to delete:', song.file_url);
        const { error: deleteError } = await supabase
          .from('songs')
          .delete()
          .eq('file_url', song.file_url);

        if (deleteError) {
          console.error('Delete error:', deleteError);
        } else {
          console.log('Deleted successfully');
          deletedCount++;
        }
      }
    }

    console.log('Total deleted:', deletedCount);

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedSongs.length} new, deleted ${deletedCount} removed`,
      synced: syncedSongs.length,
      deleted: deletedCount,
      skipped: driveFiles.length - newFiles.length,
      errors: errors.length > 0 ? errors : undefined,
      songs: syncedSongs,
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
