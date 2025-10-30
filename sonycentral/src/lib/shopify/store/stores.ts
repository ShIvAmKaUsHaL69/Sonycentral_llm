import { db } from '@/lib/db'

export async function getStoresFromDB() {
  const [rows] = await db.query<any[]>(`
    SELECT shop_url AS shop, access_token
    FROM stores
    WHERE status = 'ACTIVE'
  `)

  return rows.map((row) => ({
    shop: row.shop,
    accessToken: row.access_token,
  }))
}
