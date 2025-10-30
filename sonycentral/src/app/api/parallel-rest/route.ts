import { NextRequest, NextResponse } from 'next/server';
import { getOrderTransactions } from '@/lib/shopify/rest/getOrderTransactions';
import { getOrderReturns } from '@/lib/shopify/rest/getOrderReturns';
import pLimit from 'p-limit';

const CONCURRENCY = 10;

export async function POST(req: NextRequest) {
  const { shop_url, access_token, orderIds } = await req.json();
  if (!shop_url || !access_token || !Array.isArray(orderIds)) {
    return NextResponse.json({ error: 'Missing shop_url, access_token, or orderIds' }, { status: 400 });
  }

  const limit = pLimit(CONCURRENCY);

  // Parallel fetch transactions
  const transactionPromises = orderIds.map(orderId =>
    limit(() => getOrderTransactions(shop_url, access_token, orderId))
  );
  const allTransactions = await Promise.all(transactionPromises);

  // Parallel fetch returns
  const returnPromises = orderIds.map(orderId =>
    limit(() => getOrderReturns(shop_url, access_token, orderId))
  );
  const allReturns = await Promise.all(returnPromises);

  return NextResponse.json({
    transactions: allTransactions,
    returns: allReturns
  });
} 