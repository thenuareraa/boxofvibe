import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { parseBuffer } from 'music-metadata';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read service account credentials
    const serviceAccountPath = path.join(process.cwd(), 'google-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    // Authenticate with Google Drive
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract metadata from MP3
    const metadata = await parseBuffer(buffer, { mimeType: 'audio/mpeg' });

    // Format duration (seconds to MM:SS)
    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Create a readable stream from buffer
    const { Readable } = require('stream');
    const readableStream = Readable.from(buffer);

    // Upload to Google Drive
    const driveResponse = await drive.files.create({
      requestBody: {
        name: file.name,
        mimeType: 'audio/mpeg',
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
      },
      media: {
        mimeType: 'audio/mpeg',
        body: readableStream,
      },
      fields: 'id, webViewLink, webContentLink',
    });

    // Make file publicly accessible
    await drive.permissions.create({
      fileId: driveResponse.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Get direct download link
    const fileId = driveResponse.data.id;
    const fileUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    // Calculate file size
    const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(1);

    return NextResponse.json({
      success: true,
      fileUrl,
      fileId,
      metadata: {
        title: metadata.common.title || file.name.replace('.mp3', ''),
        artist: metadata.common.artist || 'Unknown Artist',
        album: metadata.common.album || 'Unknown Album',
        duration: metadata.format.duration
          ? formatDuration(metadata.format.duration)
          : '0:00',
        fileSize: `${fileSizeMB} MB`,
        bitrate: metadata.format.bitrate
          ? `${Math.round(metadata.format.bitrate / 1000)} kbps`
          : '320 kbps',
        format: 'MP3',
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed: ' + error.message },
      { status: 500 }
    );
  }
}
