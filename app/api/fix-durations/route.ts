import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { parseBuffer } from 'music-metadata';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

async function getAudioMetadata(filename: string) {
  try {
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
      duration: metadata.format.duration ? formatDuration(metadata.format.duration) : null,
      bitrate: metadata.format.bitrate ? `${Math.round(metadata.format.bitrate / 1000)} kbps` : null,
      title: metadata.common.title || null,
      artist: metadata.common.artist || null
    };
  } catch (error) {
    console.error('Error reading metadata:', error);
    return null;
  }
}

export async function POST() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Get all songs
        const { data: songs, error: fetchError } = await supabase
          .from('songs')
          .select('id, file_url, title');

        if (fetchError) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: fetchError.message })}\n\n`));
          controller.close();
          return;
        }

        const totalSongs = songs?.length || 0;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', total: totalSongs })}\n\n`));

        let updated = 0;
        let failed = 0;
        const errors = [];

        for (let i = 0; i < totalSongs; i++) {
          const song = songs![i];

          try {
            // Extract filename from URL
            const urlParts = song.file_url.split('/');
            const filename = decodeURIComponent(urlParts[urlParts.length - 1]);

            // Send progress update
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              current: i + 1,
              total: totalSongs,
              songTitle: song.title,
              updated,
              failed
            })}\n\n`));

            // Get metadata
            const metadata = await getAudioMetadata(filename);

            if (metadata && metadata.duration) {
              // Update duration and bitrate
              const { error: updateError } = await supabase
                .from('songs')
                .update({
                  duration: metadata.duration,
                  bitrate: metadata.bitrate || '320 kbps',
                  ...(metadata.title && { title: metadata.title }),
                  ...(metadata.artist && { artist: metadata.artist })
                })
                .eq('id', song.id);

              if (updateError) {
                errors.push({ id: song.id, title: song.title, error: updateError.message });
                failed++;
              } else {
                updated++;
              }
            } else {
              failed++;
              errors.push({ id: song.id, title: song.title, error: 'Could not extract metadata' });
            }
          } catch (err: any) {
            failed++;
            errors.push({ id: song.id, title: song.title, error: err.message });
          }
        }

        // Send completion
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          updated,
          failed,
          total: totalSongs,
          errors: errors.slice(0, 20)
        })}\n\n`));

        controller.close();
      } catch (error: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
