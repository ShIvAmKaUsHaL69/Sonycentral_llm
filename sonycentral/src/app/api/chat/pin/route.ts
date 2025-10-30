import { NextRequest, NextResponse } from 'next/server';
import { db, initChatTable } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, pinned } = body;

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    // Initialize chat table if it doesn't exist
    await initChatTable();

    // Update pinned status for all messages in the chat session
    await db.execute(
      'UPDATE chat_messages SET pinned = ? WHERE chat_id = ?',
      [!!pinned, chatId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pin Chat API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to pin/unpin chat',
      details: process.env.NODE_ENV === 'development' && error && typeof error === 'object' && 'message' in error ? (error as { message: string }).message : undefined
    }, { status: 500 });
  }
} 