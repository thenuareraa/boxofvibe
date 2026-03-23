import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { parseBuffer } from 'music-metadata';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

function extractMetadataFromFilename(filename: string) {
  // Remove _spotdown.org and .mp3
  let cleanName = filename
    .replace(/_spotdown\.org/g, '')
    .replace(/\.mp3$/g, '')
    .trim();

  // Try to split by common patterns
  let title = cleanName;
  let artist = 'Unknown Artist';

  // Pattern: "Artist - Song Title"
  if (cleanName.includes(' - ')) {
    const parts = cleanName.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  }
  // Pattern: "Song Title (feat. Artist)"
  else if (cleanName.includes('(feat.')) {
    const match = cleanName.match(/^(.+?)\s*\(feat\.\s*(.+?)\)/i);
    if (match) {
      title = match[1].trim();
      artist = match[2].trim();
    }
  }

  return { title, artist };
}

function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

async function getAudioMetadata(filename: string) {
  try {
    // Download first 512KB to get metadata (enough for most MP3 headers)
    const getCommand = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: filename,
      Range: 'bytes=0-524288' // First 512KB
    });

    const response = await r2Client.send(getCommand);
    const chunks: Uint8Array[] = [];

    if (response.Body) {
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
    }

    const buffer = Buffer.concat(chunks);
    const metadata = await parseBuffer(buffer, 'audio/mpeg');

    return {
      duration: metadata.format.duration ? formatDuration(metadata.format.duration) : '3:30',
      bitrate: metadata.format.bitrate ? `${Math.round(metadata.format.bitrate / 1000)} kbps` : '320 kbps',
      title: metadata.common.title || null,
      artist: metadata.common.artist || null
    };
  } catch (error) {
    console.error('Error reading metadata:', error);
    return {
      duration: '3:30',
      bitrate: '320 kbps',
      title: null,
      artist: null
    };
  }
}

export async function POST() {
  try {
    console.log('Starting R2 sync...');

    // Get all files from R2
    let allFiles: any[] = [];
    let continuationToken: string | undefined = undefined;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME!,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      });

      const result = await r2Client.send(listCommand);
      if (result.Contents) {
        allFiles = allFiles.concat(result.Contents);
      }
      continuationToken = result.NextContinuationToken;
    } while (continuationToken);

    console.log('Found in R2:', allFiles.length, 'files');

    // Filter only MP3 files
    const mp3Files = allFiles.filter(file => file.Key?.endsWith('.mp3'));

    console.log('MP3 files:', mp3Files.length);

    if (mp3Files.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No MP3 files found in R2 bucket',
        synced: 0,
        skipped: 0,
      });
    }

    // Get existing songs from Supabase
    const { data: existingSongs } = await supabase
      .from('songs')
      .select('file_url, title');

    console.log('Existing songs in DB:', existingSongs?.length || 0);

    const existingUrls = new Set(
      (existingSongs || []).map(song => {
        // Extract filename from R2 URL
        const match = song.file_url.match(/\/([^/]+)$/);
        return match ? decodeURIComponent(match[1]) : '';
      })
    );

    console.log('Existing file names:', Array.from(existingUrls));

    // Filter out files that already exist in database
    const newFiles = mp3Files.filter(file => !existingUrls.has(file.Key || ''));

    console.log('New files to sync:', newFiles.length);

    const syncedSongs = [];
    const errors = [];

    for (const file of newFiles) {
      try {
        const filename = file.Key!;

        // Get real metadata from MP3 file
        const audioMeta = await getAudioMetadata(filename);

        // Use filename (without .mp3) as title, or MP3 metadata if available
        let cleanTitle = filename.replace(/\.mp3$/i, '').trim();
        const title = audioMeta.title || cleanTitle;
        const artist = audioMeta.artist || 'Unknown Artist';

        // Ensure filename is fully decoded first, then properly encode it
        const decodedFilename = decodeURIComponent(filename);
        const r2Url = `${process.env.R2_PUBLIC_URL}/${encodeURIComponent(decodedFilename)}`;
        const fileSize = formatFileSize(file.Size || 0);

        // Create database entry
        const { data: newSong, error } = await supabase
          .from('songs')
          .insert([
            {
              title,
              artist,
              album: 'Unknown Album',
              duration: audioMeta.duration,
              cover_url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=2400&q=95&auto=format&fit=crop',
              file_url: r2Url,
              file_size: fileSize,
              bitrate: audioMeta.bitrate,
              format: 'MP3',
              play_count: 0,
              uploaded_by: 'Admin (Synced from R2)',
            },
          ])
          .select();

        if (error) {
          errors.push({ file: filename, error: error.message });
        } else {
          syncedSongs.push(newSong[0]);
        }
      } catch (err: any) {
        errors.push({ file: file.Key, error: err.message });
      }
    }

    // Remove songs from database that are no longer in R2
    const r2FileNames = new Set(mp3Files.map(f => f.Key));

    const songsToDelete = (existingSongs || []).filter(song => {
      const match = song.file_url.match(/\/([^/]+)$/);
      const fileName = match ? decodeURIComponent(match[1]) : '';
      return fileName && !r2FileNames.has(fileName);
    });

    console.log('Songs to delete:', songsToDelete.length);

    let deletedCount = 0;
    if (songsToDelete.length > 0) {
      for (const song of songsToDelete) {
        const { error: deleteError } = await supabase
          .from('songs')
          .delete()
          .eq('file_url', song.file_url);

        if (!deleteError) {
          deletedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedSongs.length} new, deleted ${deletedCount} removed`,
      synced: syncedSongs.length,
      deleted: deletedCount,
      skipped: mp3Files.length - newFiles.length,
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
