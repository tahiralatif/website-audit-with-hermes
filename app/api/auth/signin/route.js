import { NextResponse } from 'next/server';
import { logServerError } from '@/lib/logger';

export async function POST(request) {
  try {
    const { getUserByEmail, setUserToken } = await import('@/lib/db');
    const bcrypt = (await import('bcryptjs')).default;
    const { randomUUID } = await import('crypto');

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = randomUUID();
    setUserToken(user.id, token);

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return response;
  } catch (err) {
    logServerError('POST /api/auth/signin', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
