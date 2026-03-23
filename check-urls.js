require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkURLs() {
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, file_url')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== First 10 Song URLs ===\n');
  data.forEach((song, i) => {
    console.log(`${i + 1}. ${song.title}`);
    console.log(`   URL: ${song.file_url}`);
    if (song.file_url.includes('/api/stream/')) {
      console.log('   ⚠️  SLOW: Using Google Drive API route');
    } else if (song.file_url.includes('boxofvibe-music-cdn')) {
      console.log('   ✅ FAST: Using Worker CDN');
    } else if (song.file_url.includes('pub-4aa78d03f9f7449881845258641f97a7.r2.dev')) {
      console.log('   ⚠️  MEDIUM: Direct R2 (no caching)');
    }
    console.log('');
  });

  // Count URL types
  const { data: allSongs } = await supabase.from('songs').select('file_url');
  const googleDrive = allSongs.filter(s => s.file_url.includes('/api/stream/')).length;
  const workerCDN = allSongs.filter(s => s.file_url.includes('boxofvibe-music-cdn')).length;
  const directR2 = allSongs.filter(s => s.file_url.includes('pub-4aa78d03f9f7449881845258641f97a7.r2.dev')).length;

  console.log('\n=== URL Distribution (Total: ' + allSongs.length + ' songs) ===');
  console.log(`Google Drive API (SLOW):  ${googleDrive} songs`);
  console.log(`Worker CDN (FAST):        ${workerCDN} songs`);
  console.log(`Direct R2 (MEDIUM):       ${directR2} songs`);
}

checkURLs().then(() => process.exit(0));
