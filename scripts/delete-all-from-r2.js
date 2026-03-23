const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
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

async function deleteAllFromR2() {
  console.log('🗑️  Deleting all files from R2 bucket...\n');

  try {
    let allFiles = [];
    let continuationToken = undefined;

    // Get all files
    console.log('📂 Listing all files...');
    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      });

      const result = await r2Client.send(listCommand);
      if (result.Contents) {
        allFiles = allFiles.concat(result.Contents);
      }
      continuationToken = result.NextContinuationToken;
    } while (continuationToken);

    console.log(`   ✅ Found ${allFiles.length} files to delete\n`);

    if (allFiles.length === 0) {
      console.log('✅ Bucket is already empty!');
      return;
    }

    // Delete in batches of 1000 (R2 limit)
    let deletedCount = 0;
    for (let i = 0; i < allFiles.length; i += 1000) {
      const batch = allFiles.slice(i, i + 1000);

      console.log(`🗑️  Deleting batch ${Math.floor(i / 1000) + 1}... (${batch.length} files)`);

      const deleteCommand = new DeleteObjectsCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Delete: {
          Objects: batch.map(file => ({ Key: file.Key })),
        },
      });

      await r2Client.send(deleteCommand);
      deletedCount += batch.length;
      console.log(`   ✅ Deleted ${deletedCount}/${allFiles.length}`);
    }

    console.log('\n✅ All files deleted from R2 bucket!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

deleteAllFromR2();
