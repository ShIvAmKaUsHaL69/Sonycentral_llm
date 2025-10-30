import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [rows] = await db.query<any[]>(`SHOW TABLES`);
    if (!rows.length) return NextResponse.json([]);

    const key = Object.keys(rows[0])[0]; // usually Tables_in_<dbname>
    const tableNames = rows.map(row => row[key]);

    // Optional: exclude internal tables like 'admin'
    const filtered = tableNames.filter(name => name !== 'admin' && name !== 'chat_messages');

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('[TABLE LIST ERROR]', error);
    return NextResponse.json({ error: 'Failed to load tables' }, { status: 500 });
  }
}
