export const dynamic = "force-dynamic";
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { shopUrl, accessToken } = await req.json()

  if (!shopUrl || !accessToken) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
  }

  try {
    // Test database connection first
    console.log('🔍 Testing database connection...');
    await db.query('SELECT 1');
    console.log('✅ Database connection successful');
    
    // Check if store already exists
    console.log('🔍 Checking for existing store:', shopUrl);
    const [existingRows] = await db.query<any[]>(
      'SELECT shop_url FROM stores WHERE shop_url = ?', [shopUrl]
    );
    console.log('✅ Store check completed, found:', existingRows.length, 'existing stores');

    if (existingRows.length > 0) {
      // Update access token if store exists
      await db.query(
        'UPDATE stores SET access_token = ? WHERE shop_url = ?',
        [accessToken, shopUrl]
      );
      return NextResponse.json({ message: '✅ Store access token updated! Please sync now.' })
    }

    // Create minimal store entry with just the essential info
    // Use shop_url as store_id for now (will be updated during sync)
    await db.query(
      `INSERT INTO stores (
        store_id, shop_url, access_token, status, created_at
      ) VALUES (?, ?, ?, 'PENDING', NOW())`,
      [shopUrl, shopUrl, accessToken]
    );

    return NextResponse.json({ message: '✅ Store added successfully! Please sync now.' })
  } catch (err) {
    console.error('❌ Error inserting store:', err)
    console.error('❌ Error details:', {
      name: err instanceof Error ? err.name : 'Unknown',
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : 'No stack trace'
    })
    // Handle specific database errors
    let userMessage = 'Error adding store';
    if (err instanceof Error) {
      if (err.message.includes('Duplicate entry')) {
        userMessage = 'Store already exists with this URL';
      } else if (err.message.includes('ER_DUP_ENTRY')) {
        userMessage = 'Store already exists with this URL';
      } else {
        userMessage = `Database error: ${err.message}`;
      }
    }
    
    return NextResponse.json({ 
      message: userMessage, 
      error: err instanceof Error ? err.message : 'Unknown database error'
    }, { status: 500 })
  }
}
