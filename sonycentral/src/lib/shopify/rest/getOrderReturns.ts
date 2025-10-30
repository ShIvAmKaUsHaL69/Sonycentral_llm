export async function getOrderReturns(shop: string, accessToken: string, orderId: string) {
  const url = `https://${shop}/admin/api/2023-10/orders/${orderId}/refunds.json`;

  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`❌ Refund fetch failed for ${shop} / order ${orderId}:`, errorText);
    throw new Error(`Failed to fetch refunds for order ${orderId}`);
  }

  const data = await res.json();
  return data.refunds || [];
}
