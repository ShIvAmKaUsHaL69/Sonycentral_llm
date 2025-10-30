import { NextRequest, NextResponse } from 'next/server';
import { db, initChatTable } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');
    const limit = searchParams.get('limit') || '50';

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    // Initialize chat table if it doesn't exist
    await initChatTable();

    // Get chat history from database
    const [rows] = await db.execute(
      'SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY created_at ASC LIMIT ?',
      [chatId, parseInt(limit)]
    );

    return NextResponse.json({ messages: rows });
  } catch (error) {
    console.error('History API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve chat history',
      details: process.env.NODE_ENV === 'development' && error && typeof error === 'object' && 'message' in error ? (error as { message: string }).message : undefined
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    // Initialize chat table if it doesn't exist
    await initChatTable();

    // Delete chat history from database
    await db.execute(
      'DELETE FROM chat_messages WHERE chat_id = ?',
      [chatId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete History API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete chat history',
      details: process.env.NODE_ENV === 'development' && error && typeof error === 'object' && 'message' in error ? (error as { message: string }).message : undefined
    }, { status: 500 });
  }
} 