import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { password, username } = await request.json();

    // Validation
    if (!password || !username) {
      return NextResponse.json(
        { success: false, error: 'Username and password required' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const { data: existingUsername } = await supabase
      .from('custom_users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUsername) {
      return NextResponse.json(
        { success: false, error: 'Username already taken' },
        { status: 400 }
      );
    }

    // Generate a unique 4-digit code
    let uniqueCode = '';
    let attempts = 0;
    while (attempts < 100) {
      uniqueCode = String(Math.floor(1000 + Math.random() * 9000));
      const { data: existing } = await supabase.from('custom_users').select('id').eq('unique_code', uniqueCode).single();
      if (!existing) break;
      attempts++;
    }

    // Create user with PLAIN TEXT password - NO EMAIL
    const { data: newUser, error: createError } = await supabase
      .from('custom_users')
      .insert([
        {
          email: `${username}@local.user`, // Dummy email for database
          password: password, // PLAIN TEXT - visible to admin
          username: username,
          unique_code: uniqueCode,
        },
      ])
      .select()
      .single();

    if (createError) {
      console.error('Signup error:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const { error: sessionError } = await supabase
      .from('custom_sessions')
      .insert([
        {
          user_id: newUser.id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          device_info: request.headers.get('user-agent') || 'unknown',
        },
      ]);

    if (sessionError) {
      console.error('Session error:', sessionError);
    }

    // Return success with session token
    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        unique_code: newUser.unique_code,
      },
      sessionToken: sessionToken,
    });

    // Set session cookie
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
