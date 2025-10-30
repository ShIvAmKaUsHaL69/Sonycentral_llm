import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await db.query<any[]>(
      `SELECT 
        MIN(CONCAT(first_name, ' ', last_name)) AS name,
        email,
        COUNT(DISTINCT store_id) AS store_count
      FROM customers
      WHERE email IS NOT NULL AND email != ''
      GROUP BY email
      HAVING store_count > 1
      ORDER BY store_count DESC, name ASC`
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Error in /api/customers/common:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 