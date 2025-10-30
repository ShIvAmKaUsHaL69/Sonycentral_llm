import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {

  const [rows] = await db.query<any[]>(
    `SELECT s.store_id, s.store_name, o.currency, SUM(o.total_price) as total_sales
     FROM stores s
     LEFT JOIN orders o ON s.store_id = o.store_id
     GROUP BY s.store_id, o.currency`
  );
  return NextResponse.json(rows);
} 