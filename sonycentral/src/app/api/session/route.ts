import { NextRequest, NextResponse } from 'next/server';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = req.cookies.get('session');
  if (session) {
    return NextResponse.json({ loggedIn: true });
  } else {
    return NextResponse.json({ loggedIn: false });
  }
} 