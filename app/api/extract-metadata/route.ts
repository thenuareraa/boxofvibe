import { NextRequest, NextResponse } from 'next/server';
import { parseBuffer } from 'music-metadata';

export async function POST(request: NextRequest) {
  try {
    const { fileUrl } = await request.json();

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'File URL is required' },
        { status: 400 }
      );
    }

    // Fetch the MP3 file
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch file');
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract metadata
    const metadata = await parseBuffer(buffer, { mimeType: 'audio/mpeg' });

    // Format duration (seconds to MM:SS)
    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return NextResponse.json({
      title: metadata.common.title || 'Unknown Title',
      artist: metadata.common.artist || 'Unknown Artist',
      album: metadata.common.album || 'Unknown Album',
      duration: metadata.format.duration
        ? formatDuration(metadata.format.duration)
        : '0:00',
      bitrate: metadata.format.bitrate
        ? `${Math.round(metadata.format.bitrate / 1000)} kbps`
        : '320 kbps',
      format: 'MP3',
    });
  } catch (error: any) {
    console.error('Metadata extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract metadata: ' + error.message },
      { status: 500 }
    );
  }
}
