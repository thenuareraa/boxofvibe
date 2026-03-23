import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// CRITICAL: Cache auth and drive to avoid recreating on every request (HUGE performance boost)
let cachedAuth: any = null;
let cachedDrive: any = null;

function getGoogleDrive() {
  if (!cachedAuth || !cachedDrive) {
    const serviceAccountPath = path.join(process.cwd(), 'google-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    cachedAuth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    cachedDrive = google.drive({ version: 'v3', auth: cachedAuth });
  }
  return cachedDrive;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const drive = getGoogleDrive();

    // Get file metadata ONCE
    const metadata = await drive.files.get({
      fileId: fileId,
      fields: 'size, mimeType',
    });

    const fileSize = parseInt(metadata.data.size || '0');
    const mimeType = metadata.data.mimeType || 'audio/mpeg';
    const range = request.headers.get('range');

    let start = 0;
    let end = fileSize - 1;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    }

    const chunkSize = end - start + 1;

    // Stream from Google Drive
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      {
        responseType: 'stream',
        headers: { Range: `bytes=${start}-${end}` }
      }
    );

    // Stream the data directly
    const stream = response.data as any;

    return new NextResponse(stream, {
      status: range ? 206 : 200,
      headers: {
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range',
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error: any) {
    console.error('Stream error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
