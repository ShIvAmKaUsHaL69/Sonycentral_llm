export async function getOrderTransactions(shop: string, accessToken: string, orderId: string) {
  const url = `https://${shop}/admin/api/2023-10/orders/${orderId}/transactions.json`;
  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch transactions for order ${orderId}`);
  const data = await res.json();
  return data.transactions;
}