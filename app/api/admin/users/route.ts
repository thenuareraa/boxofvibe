import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Get all users (with passwords - ADMIN ONLY)
export async function GET(request: NextRequest) {
  try {
    // Get all users with PLAIN TEXT passwords
    const { data: users, error } = await supabase
      .from('custom_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      users: users || [],
      total: users?.length || 0,
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: Block or Delete user
export async function POST(request: NextRequest) {
  try {
    const { action, userId, reason } = await request.json();

    if (!action || !userId) {
      return NextResponse.json(
        { success: false, error: 'Action and userId required' },
        { status: 400 }
      );
    }

    if (action === 'block') {
      // Block user
      const { error } = await supabase
        .from('custom_users')
        .update({
          is_blocked: true,
          blocked_reason: reason || 'Blocked by admin',
          blocked_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      // Delete all active sessions
      await supabase.from('custom_sessions').delete().eq('user_id', userId);

      return NextResponse.json({
        success: true,
        message: 'User blocked successfully',
      });
    } else if (action === 'unblock') {
      // Unblock user
      const { error } = await supabase
        .from('custom_users')
        .update({
          is_blocked: false,
          blocked_reason: null,
          blocked_at: null,
        })
        .eq('id', userId);

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'User unblocked successfully',
      });
    } else if (action === 'delete') {
      // Delete user permanently
      const { error } = await supabase
        .from('custom_users')
        .delete()
        .eq('id', userId);

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'User deleted successfully',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('User management error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
