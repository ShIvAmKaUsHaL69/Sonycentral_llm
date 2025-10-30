import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Forward the request to the middleware
    const middlewareUrl = new URL('/api/chat/middleware', req.url);
    const response = await fetch(middlewareUrl.toString(), {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(await req.json())
    });
    
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ 
      output: "Sorry, an error occurred while processing your message.",
      error: process.env.NODE_ENV === 'development' && error && typeof error === 'object' && 'message' in error ? (error as { message: string }).message : undefined
    }, { status: 500 });
  }
}