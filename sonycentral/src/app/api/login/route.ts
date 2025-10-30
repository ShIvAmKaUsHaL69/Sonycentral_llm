export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
  }
  // Check admin table for matching email and password
  const [rows] = await db.query('SELECT email FROM admin WHERE email = ? AND password = ?', [email, password]) as [any[], any];
  if ((rows as any[]).length === 0) {
    return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
  }
  // Set session cookie (simple implementation)
  const response = NextResponse.json({ message: 'Login successful' });
  response.cookies.set('session', email, { httpOnly: true, path: '/' });
  return response;
} 