import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get all Supabase Auth users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      return NextResponse.json(
        { success: false, error: authError.message },
        { status: 500 }
      );
    }

    const authUsers = authData?.users || [];

    // Get all custom_users
    const { data: customUsers, error: customError } = await supabase
      .from('custom_users')
      .select('email');

    if (customError) {
      return NextResponse.json(
        { success: false, error: customError.message },
        { status: 500 }
      );
    }

    const customUserEmails = new Set(customUsers?.map(u => u.email) || []);

    // Find users that exist in auth but not in custom_users
    const unmigrated = authUsers.filter(u => !customUserEmails.has(u.email));

    return NextResponse.json({
      success: true,
      totalAuthUsers: authUsers.length,
      totalCustomUsers: customUsers?.length || 0,
      unmigratedUsers: unmigrated.map(u => ({
        email: u.email,
        name: u.user_metadata?.name || u.email?.split('@')[0],
        created_at: u.created_at,
      })),
      unmigratedCount: unmigrated.length,
    });
  } catch (error: any) {
    console.error('Check users error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
