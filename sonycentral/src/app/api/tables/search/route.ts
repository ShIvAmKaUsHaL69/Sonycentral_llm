export const dynamic = "force-dynamic";
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const table = searchParams.get('table');
    const query = searchParams.get('q') || '';
    const storeId = searchParams.get('store_id');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!table || table === 'admin' || !query) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Get columns to find searchable fields
    const [columns] = await db.query<any[]>(`DESCRIBE \`${table}\``);

    // Filter for only text-based columns
    const searchableFields = columns
      .filter((col) => col.Type.includes('char') || col.Type.includes('text'))
      .map((col) => col.Field);

    if (searchableFields.length === 0) {
      return NextResponse.json({ error: 'No searchable columns found' }, { status: 400 });
    }

    // Build dynamic WHERE clause
    const whereParts = searchableFields.map((col) => `\`${col}\` LIKE ?`);
    const whereClause = whereParts.join(' OR ');
    const searchParamsArray = searchableFields.map(() => `%${query}%`);

    // Add store filter if store_id exists
    const [storeCols] = await db.query<any[]>(`SHOW COLUMNS FROM \`${table}\` LIKE 'store_id'`);
    const hasStoreId = storeCols.length > 0;

    let sql = `SELECT * FROM \`${table}\` WHERE (${whereClause})`;
    if (hasStoreId && storeId) {
      sql += ` AND store_id = ?`;
      searchParamsArray.push(storeId);
    }
    sql += ` LIMIT ?`;
    searchParamsArray.push(limit.toString());

    const [rows] = await db.query<any[]>(sql, searchParamsArray);

    // Add new/old label for customers table
    let results = rows;
    if (table === 'customers') {
      const now = new Date();
      results = rows.map((row: any) => {
        if (row.created_at) {
          const createdAt = new Date(row.created_at);
          const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          row.customer_status = diffDays <= 30 ? 'new' : 'old';
        } else {
          row.customer_status = 'unknown';
        }
        return row;
      });
    }

    return NextResponse.json({
      table,
      query,
      results,
      found: rows.length,
    });
  } catch (err) {
    console.error('Error in /tables/search:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
