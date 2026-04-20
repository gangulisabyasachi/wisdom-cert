import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { createSession } from '@/lib/session';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email }).lean();

    // 1. Check if account is currently locked
    if (user && user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return NextResponse.json(
        { message: `Account locked. Try again in ${remainingMinutes} minutes.` },
        { status: 403 }
      );
    }

    // 2. Verify Password using bcrypt
    const isMatched = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !isMatched) {
      if (user) {
        // Increment attempts
        const newAttempts = (user.loginAttempts || 0) + 1;
        const lockUntil = newAttempts >= 3 ? Date.now() + 30 * 60 * 1000 : null;
        await User.findByIdAndUpdate(user._id, { loginAttempts: newAttempts, lockUntil });
        
        if (newAttempts >= 3) {
          return NextResponse.json({ message: 'Too many attempts. Account locked for 30 mins.' }, { status: 429 });
        }
        return NextResponse.json({ message: `Invalid credentials. ${3 - newAttempts} attempts remaining.` }, { status: 401 });
      }
      
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // 3. Success - reset locks and create session
    await User.findByIdAndUpdate(user._id, { loginAttempts: 0, lockUntil: null });

    // Success - create session
    await createSession(user._id.toString());

    return NextResponse.json({ message: 'Login successful' }, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred' },
      { status: 500 }
    );
  }
}
