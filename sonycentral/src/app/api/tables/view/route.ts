export const dynamic = "force-dynamic";
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const table = searchParams.get('table');
    const storeId = searchParams.get('store_id');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // ✅ Input validation
    if (!table || /[^a-z0-9_]/i.test(table)) {
      return NextResponse.json({ error: 'Invalid or missing table' }, { status: 400 });
    }

    // ✅ Check if table exists
    const [exists] = await db.query<any[]>(`SHOW TABLES LIKE ?`, [table]);
    if (!exists || exists.length === 0) {
      return NextResponse.json({ error: 'Table does not exist' }, { status: 400 });
    }

    // ✅ Build query
    let query = `SELECT * FROM \`${table}\``;
    const params: any[] = [];

    if (storeId && storeId !== 'all') {
      query += ` WHERE store_id = ?`;
      params.push(storeId);
    }

    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await db.query<any[]>(query, params);

    return NextResponse.json({ rows });
  } catch (error: any) {
    console.error('[TABLE_VIEW_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
