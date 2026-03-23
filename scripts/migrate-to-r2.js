const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Initialize R2 client (S3-compatible)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Google Drive
const serviceAccountPath = path.join(process.cwd(), 'google-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

async function migrateSongsToR2() {
  console.log('🚀 Starting migration to Cloudflare R2...\n');

  // Get all songs from database
  const { data: songs, error } = await supabase
    .from('songs')
    .select('*');

  if (error) {
    console.error('❌ Error fetching songs:', error);
    return;
  }

  console.log(`📊 Found ${songs.length} songs to migrate\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    console.log(`\n[${i + 1}/${songs.length}] Processing: ${song.title} - ${song.artist}`);

    try {
      // Extract Google Drive file ID from current URL
      const fileIdMatch = song.file_url.match(/\/api\/stream\/([^/?]+)/);
      if (!fileIdMatch) {
        console.log('⚠️  Skipping - not a Google Drive file');
        continue;
      }

      const fileId = fileIdMatch[1];
      console.log(`   📥 Downloading from Google Drive (ID: ${fileId})...`);

      // Download file from Google Drive
      const response = await drive.files.get(
        { fileId: fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      // Get file metadata for proper naming
      const metadata = await drive.files.get({
        fileId: fileId,
        fields: 'name, mimeType, size',
      });

      const fileName = metadata.data.name || `${song.title.replace(/[^a-z0-9]/gi, '_')}.mp3`;
      const sanitizedFileName = `${song.id}-${fileName}`;

      console.log(`   📤 Uploading to R2: ${sanitizedFileName}...`);

      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of response.data) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // Upload to R2
      await r2Client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: sanitizedFileName,
          Body: buffer,
          ContentType: metadata.data.mimeType || 'audio/mpeg',
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );

      // Generate R2 public URL
      const r2Url = `${process.env.R2_PUBLIC_URL}/${sanitizedFileName}`;

      console.log(`   💾 Updating database with R2 URL...`);

      // Update database with new R2 URL
      const { error: updateError } = await supabase
        .from('songs')
        .update({ file_url: r2Url })
        .eq('id', song.id);

      if (updateError) {
        console.error(`   ❌ Database update failed:`, updateError.message);
        errorCount++;
      } else {
        console.log(`   ✅ Success! Now streaming from R2`);
        successCount++;
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err) {
      console.error(`   ❌ Error:`, err.message);
      errorCount++;
    }
  }

  console.log('\n\n📈 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📊 Total: ${songs.length}`);
  console.log('\n🎉 Migration complete!\n');
}

// Run migration
migrateSongsToR2().catch(console.error);
