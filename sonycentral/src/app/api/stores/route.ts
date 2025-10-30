export const dynamic = "force-dynamic";
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  // ✅ Destructure only the rows
  const [rows] = await db.query(`
    SELECT store_id, store_name, shop_url, status, total_products, total_customers, total_orders
    FROM stores
  `)

  // For each store, fetch old and new customer counts
  const now = new Date();
  const stores = await Promise.all((rows as any[]).map(async (row) => {
    // Get old and new customer counts for this store
    const [customerRows] = await db.query<any[]>(
      `SELECT created_at FROM customers WHERE store_id = ?`,
      [row.store_id]
    );
    let old_customers = 0;
    let new_customers = 0;
    for (const c of customerRows) {
      if (c.created_at) {
        const createdAt = new Date(c.created_at);
        const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays <= 30) new_customers++;
        else old_customers++;
      }
    }
    return {
      store_id: row.store_id,
      store_name: row.store_name,
      shop_url: row.shop_url,
      status: row.status || 'UNKNOWN',
      total_products: Number(row.total_products ?? 0),
      total_customers: Number(row.total_customers ?? 0),
      total_orders: Number(row.total_orders ?? 0),
      old_customers,
      new_customers,
      access_token: row.access_token,
    };
  }));

  return NextResponse.json(stores)
}
