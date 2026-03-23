const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
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

async function testR2Upload() {
  console.log('🔧 Testing R2 Upload...\n');

  console.log('📋 Configuration:');
  console.log(`   Endpoint: ${process.env.R2_ENDPOINT}`);
  console.log(`   Bucket: ${process.env.R2_BUCKET_NAME}`);
  console.log(`   Public URL: ${process.env.R2_PUBLIC_URL}`);
  console.log(`   Access Key: ${process.env.R2_ACCESS_KEY_ID?.substring(0, 10)}...`);
  console.log('');

  try {
    // Test 1: List existing objects
    console.log('📂 Test 1: Listing objects in bucket...');
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      MaxKeys: 10,
    });

    const listResult = await r2Client.send(listCommand);
    console.log(`   ✅ Success! Found ${listResult.KeyCount} objects`);
    if (listResult.Contents && listResult.Contents.length > 0) {
      console.log('   First few files:');
      listResult.Contents.forEach(obj => console.log(`      - ${obj.Key}`));
    }
    console.log('');

    // Test 2: Upload a small test file
    console.log('📤 Test 2: Uploading test file...');
    const testContent = 'This is a test file from BoxOfVibe';

    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: 'test-upload.txt',
      Body: Buffer.from(testContent),
      ContentType: 'text/plain',
    });

    await r2Client.send(uploadCommand);
    console.log('   ✅ Upload successful!');
    console.log(`   🔗 URL: ${process.env.R2_PUBLIC_URL}/test-upload.txt`);
    console.log('   👉 Try opening that URL in your browser!');
    console.log('');

    // Test 3: Upload one MP3 file
    const mp3Files = fs.readdirSync('C:\\Users\\thenu\\Downloads').filter(f => f.endsWith('.mp3'));
    if (mp3Files.length > 0) {
      const testMp3 = mp3Files[0];
      console.log(`📤 Test 3: Uploading MP3: ${testMp3}...`);

      const mp3Path = path.join('C:\\Users\\thenu\\Downloads', testMp3);
      const mp3Buffer = fs.readFileSync(mp3Path);

      const mp3Command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: testMp3,
        Body: mp3Buffer,
        ContentType: 'audio/mpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      });

      await r2Client.send(mp3Command);
      console.log('   ✅ MP3 Upload successful!');
      console.log(`   🔗 URL: ${process.env.R2_PUBLIC_URL}/${encodeURIComponent(testMp3)}`);
      console.log('   👉 Try playing that URL in your browser!');
    }

    console.log('\n✅ All tests passed! R2 is working correctly.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testR2Upload();
