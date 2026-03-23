import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
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

    if (authUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No Supabase Auth users found to migrate',
        migrated: 0,
      });
    }

    let migratedCount = 0;
    const errors: string[] = [];

    // Migrate each user to custom_users table
    for (const authUser of authUsers) {
      try {
        // Check if user already exists in custom_users
        const { data: existingUser } = await supabase
          .from('custom_users')
          .select('id')
          .eq('email', authUser.email)
          .single();

        if (existingUser) {
          continue; // Skip if already migrated
        }

        // Insert into custom_users with a placeholder password
        const { error: insertError } = await supabase
          .from('custom_users')
          .insert([
            {
              email: authUser.email?.toLowerCase() || '',
              password: 'MIGRATED_USER_NEEDS_RESET', // Placeholder - user needs to reset
              username: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
              created_at: authUser.created_at,
            },
          ]);

        if (insertError) {
          errors.push(`Failed to migrate ${authUser.email}: ${insertError.message}`);
        } else {
          migratedCount++;
        }
      } catch (error: any) {
        errors.push(`Error migrating ${authUser.email}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration complete. Migrated ${migratedCount} users.`,
      migrated: migratedCount,
      total: authUsers.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
