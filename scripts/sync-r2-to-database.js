const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
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

function extractMetadataFromFilename(filename) {
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

async function syncR2ToDatabase() {
  console.log('🔄 Syncing R2 files to database...\n');

  try {
    // Get all files from R2
    console.log('📂 Fetching files from R2...');
    let allFiles = [];
    let continuationToken = undefined;

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

    console.log(`   ✅ Found ${allFiles.length} files in R2\n`);

    // Get existing songs from database
    const { data: existingSongs } = await supabase.from('songs').select('*');
    const existingSongsMap = new Map(existingSongs?.map(s => [s.title.toLowerCase(), s]) || []);

    let updatedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const filename = file.Key;

      // Skip non-MP3 files
      if (!filename.endsWith('.mp3')) {
        console.log(`[${i + 1}/${allFiles.length}] Skipping non-MP3: ${filename}`);
        skippedCount++;
        continue;
      }

      console.log(`[${i + 1}/${allFiles.length}] Processing: ${filename}`);

      const { title, artist } = extractMetadataFromFilename(filename);
      const r2Url = `${process.env.R2_PUBLIC_URL}/${encodeURIComponent(filename)}`;

      // Check if song exists in database
      const existingSong = existingSongsMap.get(title.toLowerCase());

      if (existingSong) {
        // Update existing song with R2 URL
        const { error } = await supabase
          .from('songs')
          .update({ file_url: r2Url })
          .eq('id', existingSong.id);

        if (error) {
          console.log(`   ❌ Update failed: ${error.message}`);
        } else {
          console.log(`   ✅ Updated: ${title} → R2`);
          updatedCount++;
        }
      } else {
        // Create new song entry
        const { error } = await supabase.from('songs').insert([{
          title,
          artist,
          album: 'Unknown Album',
          duration: '3:30',
          cover_url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=2400&q=95&auto=format&fit=crop',
          file_url: r2Url,
          file_size: `${(file.Size / (1024 * 1024)).toFixed(2)} MB`,
          bitrate: '320 kbps',
          format: 'MP3',
          play_count: 0,
          uploaded_by: 'Admin (Synced from R2)',
        }]);

        if (error) {
          console.log(`   ❌ Create failed: ${error.message}`);
        } else {
          console.log(`   ✅ Created: ${title}`);
          createdCount++;
        }
      }
    }

    console.log('\n\n📈 Sync Summary:');
    console.log(`   🔄 Updated: ${updatedCount}`);
    console.log(`   ✨ Created: ${createdCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   📊 Total R2 files: ${allFiles.length}`);
    console.log('\n✅ Database sync complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

syncR2ToDatabase();
