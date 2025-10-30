import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await db.query<any[]>(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS old_customers,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS new_customers
      FROM customers`
    );
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('Error in /api/customers/summary:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 