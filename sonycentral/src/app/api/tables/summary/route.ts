export const dynamic = "force-dynamic";
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const table = searchParams.get('table');
    const storeId = searchParams.get('store_id');

    if (!table || table === 'admin') {
      return NextResponse.json({ error: 'Invalid or missing table' }, { status: 400 });
    }

    // Check if store_id column exists
    const [columns] = await db.query<any[]>(`SHOW COLUMNS FROM \`${table}\` LIKE 'store_id'`);
    const hasStoreId = columns.length > 0;

    // Summary values
    const query = `
      SELECT
        COUNT(*) AS total,
        MIN(created_at) AS first_entry,
        MAX(created_at) AS last_entry
      FROM \`${table}\`
      ${hasStoreId && storeId ? 'WHERE store_id = ?' : ''}
    `;
    const params = hasStoreId && storeId ? [storeId] : [];

    const [rows] = await db.query<any[]>(query, params);

    return NextResponse.json({
      table,
      store_id: storeId || null,
      total_rows: rows[0]?.total || 0,
      first_entry: rows[0]?.first_entry || null,
      last_entry: rows[0]?.last_entry || null,
    });
  } catch (err) {
    console.error('Error in /tables/summary:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
