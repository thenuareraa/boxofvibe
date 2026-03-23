import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data: songs, error } = await supabase
    .from('songs')
    .select('id, title, artist, file_url')
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    total: songs?.length || 0,
    sample: songs,
    urlTypes: songs?.map(s => ({
      title: s.title,
      isR2: s.file_url.includes('r2.dev'),
      isDrive: s.file_url.includes('drive.google.com') || s.file_url.includes('googleusercontent.com'),
      url: s.file_url
    }))
  });
}
