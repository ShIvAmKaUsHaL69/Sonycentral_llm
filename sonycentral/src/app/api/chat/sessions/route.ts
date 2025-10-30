import { NextRequest, NextResponse } from 'next/server';
import { db, initChatTable } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Initialize chat table if it doesn't exist
    await initChatTable();

    // Get all unique chat sessions with their latest message and timestamp
    const [rows] = await db.execute(`
      SELECT 
        chat_id,
        MAX(created_at) as last_message_time,
        COUNT(*) as message_count,
        (
          SELECT message 
          FROM chat_messages cm2 
          WHERE cm2.chat_id = cm1.chat_id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message,
        MAX(pinned) as pinned
      FROM chat_messages cm1
      GROUP BY chat_id
      ORDER BY pinned DESC, last_message_time DESC
    `);

    // Convert pinned from 0/1 to boolean
    const sessions = (rows as any[]).map(session => ({
      ...session,
      pinned: Boolean(session.pinned)
    }));

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Sessions API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve chat sessions',
      details: process.env.NODE_ENV === 'development' && error && typeof error === 'object' && 'message' in error ? (error as { message: string }).message : undefined
    }, { status: 500 });
  }
} 