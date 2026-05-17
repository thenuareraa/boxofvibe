import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'explore_enabled')
      .single();

    if (error) {
      return NextResponse.json({ enabled: false });
    }

    return NextResponse.json({ enabled: data?.value === 'true' || data?.value === true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { enabled } = await request.json();

    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'explore_enabled', value: String(enabled) }, { onConflict: 'key' });

    if (error) throw error;
    return NextResponse.json({ enabled });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
