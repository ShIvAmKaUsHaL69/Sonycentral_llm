export const dynamic = "force-dynamic";
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const table = searchParams.get('table');

    // ✅ 1. Basic input validation
    if (!table || /[^a-z0-9_]/i.test(table)) {
      return NextResponse.json({ error: 'Invalid or missing table' }, { status: 400 });
    }

    // ✅ 2. Check if table exists in the database
    const [exists] = await db.query<any[]>(`SHOW TABLES LIKE ?`, [table]);
    if (!exists || exists.length === 0) {
      return NextResponse.json({ error: 'Table does not exist' }, { status: 400 });
    }

    // ✅ 3. Fetch column metadata
    const [columns] = await db.query<any[]>(`SHOW COLUMNS FROM \`${table}\``);

    return NextResponse.json({ columns });
  } catch (error: any) {
    console.error('[TABLE_META_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
