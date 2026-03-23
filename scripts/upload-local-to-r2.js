const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Initialize R2 client
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

const DOWNLOADS_FOLDER = 'C:\\Users\\thenu\\Downloads';

async function uploadLocalSongsToR2() {
  console.log('🚀 Starting upload to Cloudflare R2...\n');

  // Get all MP3 files from Downloads folder
  const files = fs.readdirSync(DOWNLOADS_FOLDER).filter(file => file.endsWith('.mp3'));

  console.log(`📊 Found ${files.length} MP3 files to upload\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const filePath = path.join(DOWNLOADS_FOLDER, fileName);

    console.log(`\n[${i + 1}/${files.length}] Uploading: ${fileName}`);

    try {
      // Read file
      const fileBuffer = fs.readFileSync(filePath);

      // Generate clean filename for R2
      const sanitizedFileName = fileName.replace(/_spotdown\.org/g, '').trim();

      console.log(`   📤 Uploading to R2: ${sanitizedFileName}...`);

      // Upload to R2
      await r2Client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: sanitizedFileName,
          Body: fileBuffer,
          ContentType: 'audio/mpeg',
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );

      // Generate R2 public URL
      const r2Url = `${process.env.R2_PUBLIC_URL}/${encodeURIComponent(sanitizedFileName)}`;

      console.log(`   ✅ Uploaded successfully!`);
      console.log(`   🔗 URL: ${r2Url}`);

      successCount++;

    } catch (err) {
      console.error(`   ❌ Error:`, err.message);
      errorCount++;
    }
  }

  console.log('\n\n📈 Upload Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📊 Total: ${files.length}`);
  console.log('\n🎉 Upload complete!\n');
  console.log('⚠️  Note: Database NOT updated yet. Songs uploaded to R2 only.');
  console.log('   Run the sync script to update database with R2 URLs.\n');
}

// Run upload
uploadLocalSongsToR2().catch(console.error);
