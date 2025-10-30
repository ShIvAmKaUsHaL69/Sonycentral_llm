export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ message: 'Logged out' });
  response.cookies.set('session', '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
} 