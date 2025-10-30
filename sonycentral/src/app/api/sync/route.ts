export const dynamic = "force-dynamic";
import { db } from '@/lib/db';


import { NextRequest, NextResponse } from 'next/server'
import { getStoresFromDB } from '@/lib/shopify/store/stores'
import { fetchShopifyGraphQL } from '@/lib/shopify/graphql/fetchGraphQl';
import { fetchAllPaginatedData } from '@/lib/shopify/graphql/fetchAllPaginated';
import { GET_ORDERS_QUERY } from '@/lib/shopify/graphql/queries/getOrders';
import { GET_PRODUCTS_QUERY } from '@/lib/shopify/graphql/queries/getProducts';
import { GET_CUSTOMERS_QUERY } from '@/lib/shopify/graphql/queries/getCustomers';
import { GET_STORE_DETAILS_QUERY } from '@/lib/shopify/graphql/queries/getStoreDetails';
import { getOrderTransactions } from '@/lib/shopify/rest/getOrderTransactions';
import { getOrderReturns } from '@/lib/shopify/rest/getOrderReturns'
export async function GET() {
  const stores = await getStoresFromDB();
  return await syncStores(stores);
}




export async function POST(req: NextRequest) {
  const body = await req.json();
  const { shopUrl } = body;

  if (!shopUrl) {
    return NextResponse.json({ message: 'Missing shopUrl' }, { status: 400 });
  }

  // Look up accessToken for the given shopUrl
  const [rows] = await db.query<any[]>(
    'SELECT shop_url, access_token FROM stores WHERE shop_url = ?', [shopUrl]
  );
  if (!rows.length) {
    return NextResponse.json({ message: 'Store not found' }, { status: 404 });
  }
  const { shop_url, access_token } = rows[0];
  return await syncStores([{ shop: shop_url, accessToken: access_token }]);
}

// ✅ Shared sync logic used by GET and POST
async function syncStores(stores: { shop: string; accessToken: string }[]) {
  const allStoresData = [];
  const errorLogs = [];

  for (const { shop, accessToken } of stores) {
    try {
      const storeDetailsRaw = await fetchShopifyGraphQL({
        shop,
        accessToken,
        query: GET_STORE_DETAILS_QUERY,
      });

      const storeDetails = storeDetailsRaw?.shop;
      const store_id = storeDetails.id.split('/').pop();

      const [ordersData, productsData, customersData] = await Promise.all([
        fetchAllPaginatedData({
          shop,
          accessToken,
          query: GET_ORDERS_QUERY,
          extractor: (data) => data.orders || [],
        }),
        fetchAllPaginatedData({
          shop,
          accessToken,
          query: GET_PRODUCTS_QUERY,
          extractor: (data) => data.products || [],
        }),
        fetchAllPaginatedData({
          shop,
          accessToken,
          query: GET_CUSTOMERS_QUERY,
          extractor: (data) => data.customers || [],
        }),
      ]);

      // 👉 Step 3: Insert Store Info AFTER we have all counts
      // Check if store already exists
      const [existingStore] = await db.query<any[]>(
        'SELECT shop_url FROM stores WHERE shop_url = ?', [shop]
      );

      if (existingStore.length > 0) {
        // Update existing store
        await db.query(
          `UPDATE stores SET 
            store_id = ?, 
            shopify_id = ?, 
            store_name = ?, 
            access_token = ?, 
            status = 'ACTIVE',
            total_products = ?, 
            total_customers = ?, 
            total_orders = ?,
            synced_at = NOW()
          WHERE shop_url = ?`,
          [
            store_id,
            storeDetails.id,
            storeDetails.name,
            accessToken,
            productsData.edges.length,
            customersData.edges.length,
            ordersData.edges.length,
            shop
          ]
        );
      } else {
        // Insert new store
        await db.query(
          `INSERT INTO stores (
            store_id, shopify_id, store_name, shop_url, access_token, status,
            created_at, synced_at, total_products, total_customers, total_orders
          ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', NOW(), NOW(), ?, ?, ?)`,
          [
            store_id,
            storeDetails.id,
            storeDetails.name,
            shop,
            accessToken,
            productsData.edges.length,
            customersData.edges.length,
            ordersData.edges.length,
          ]
        );
      }


      // 👉 Step 4.5: Insert Customers (top-level loop)
      for (const customer of customersData.edges) {
        const c = customer.node;
        const orderEdges = c.orders?.edges || [];
        const orderCount = orderEdges.length;
        let totalSpent = 0;
        for (const order of orderEdges) {
          totalSpent += parseFloat(order.node.totalPriceSet?.shopMoney?.amount || '0.00');
        }
        await db.query(
          `INSERT INTO customers (
      customer_id, shopify_id, store_id, first_name, last_name,
      email, phone, orders_count, total_spent, created_at, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE 
      orders_count = VALUES(orders_count),
      total_spent = VALUES(total_spent),
      synced_at = NOW()`,
          [
            c.id.split('/').pop(),
            c.id,
            store_id,
            c.firstName,
            c.lastName,
            c.email,
            c.phone || 'NA',
            orderCount,
            totalSpent.toFixed(2),
            c.createdAt
          ]
        );
      }

      // 👉 Step 4: Insert Orders
      const successfullyInsertedOrders = new Set<string>();

      for (const order of ordersData.edges) {
        const o = order.node;

        const orderId = o.id.split('/').pop();

        // 👉 Insert order main data
        try {
          await db.query(
            `INSERT INTO orders (
        order_id, shopify_id, store_id, name, email, status, currency,
        total_price, subtotal_price, total_tax, total_discount, shipping_cost,
        created_at, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE 
        status = VALUES(status),
        synced_at = NOW()`,
            [
              orderId,
              o.id,
              store_id,
              o.name,
              o.email || '',
              o.displayFinancialStatus || 'pending',
              o.currencyCode,
              o.totalPrice || 0,
              o.subtotalPrice || 0,
              o.totalTax || 0,
              o.totalDiscounts || 0,
              o.totalShippingPrice || 0,
              o.createdAt,
            ]
          );
          
          // Mark this order as successfully inserted
          successfullyInsertedOrders.add(orderId);
        } catch (orderError) {
          console.error(`❌ Error inserting order ${orderId}:`, orderError);
          errorLogs.push({
            store: shop,
            error: `Failed to insert order ${orderId}: ${orderError instanceof Error ? orderError.message : 'Unknown error'}`,
            timestamp: new Date().toISOString()
          });
          continue; // Skip processing this order's line items, transactions, etc.
        }

        const lineItems = o.lineItems?.edges || [];
        const fulfillments = o.fulfillments || [];
        // Use the first fulfillment's location for all items in this order
        let originLocationId = null;
        let originLocationName = null;
        if (fulfillments.length > 0 && fulfillments[0].location) {
          originLocationId = fulfillments[0].location.id?.split('/').pop() || null;
          originLocationName = fulfillments[0].location.name || null;
        }
        for (const item of lineItems) {
          const i = item.node;

          try {
            await db.query(
              `INSERT INTO order_items (
    order_id, store_id, product_id, variant_id, title, quantity, sku,
    priceBeforeVat, vatAmount, vatPercentage, price, discount,
    origin_location_id, origin_location_name, synced_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  ON DUPLICATE KEY UPDATE 
    quantity = VALUES(quantity),
    sku = VALUES(sku),
    price = VALUES(price),
    vatAmount = VALUES(vatAmount),
    vatPercentage = VALUES(vatPercentage),
    priceBeforeVat = VALUES(priceBeforeVat),
    discount = VALUES(discount),
    synced_at = NOW()`,
              [
                o.id.split('/').pop(),
                store_id,
                i.product?.id?.split('/').pop() || null,
                i.variant?.id?.split('/').pop() || null,
                i.name || '',
                i.quantity || 0,
                i.sku || '',

                parseFloat(i.originalUnitPriceSet?.shopMoney?.amount || '0'),
                parseFloat(i.taxLines?.[0]?.priceSet?.shopMoney?.amount || '0'),
                parseFloat(i.taxLines?.[0]?.rate || '0') * 100,
                i.discountedTotalSet?.shopMoney?.amount || 'NULL',
                parseFloat(i.discountAllocations?.[0]?.allocatedAmountSet?.shopMoney?.amount || '0'),
                originLocationId,
                originLocationName,
              ]
            );

            const lineItemId = i.id?.split('/').pop();

            // 🟢 Insert the Shopify line_item_id as a property row
            // Using orderId as the foreign key since order_items table uses order_id as primary key
            if (lineItemId) {
              try {
                await db.query(
                  `INSERT INTO order_item_properties (
                    line_item_id, prop_name, prop_value, store_id, order_id
                  ) VALUES (?, ?, ?, ?, ?)
                  ON DUPLICATE KEY UPDATE prop_value = VALUES(prop_value)`,
                  [
                    orderId,  // Use order ID as foreign key (matches order_items table primary key)
                    'shopify_line_item_id',
                    lineItemId,
                    store_id,
                    orderId
                  ]
                );
              } catch (propertyError) {
                console.error(`❌ Error inserting line item property for order ${orderId}:`, propertyError);
                errorLogs.push({
                  store: shop,
                  error: `Failed to insert line item property for order ${orderId}: ${propertyError instanceof Error ? propertyError.message : 'Unknown error'}`,
                  timestamp: new Date().toISOString()
                });
              }
            }

            // 🟢 Insert additional useful properties
            try {
              // Product variant ID if available
              if (i.variant?.id) {
                await db.query(
                  `INSERT INTO order_item_properties (
                    line_item_id, prop_name, prop_value, store_id, order_id
                  ) VALUES (?, ?, ?, ?, ?)
                  ON DUPLICATE KEY UPDATE prop_value = VALUES(prop_value)`,
                  [
                    lineItemId,
                    'variant_id',
                    i.variant.id.split('/').pop(),
                    store_id,
                    orderId
                  ]
                );
              }

              // Product ID if available
              if (i.product?.id) {
                await db.query(
                  `INSERT INTO order_item_properties (
                    line_item_id, prop_name, prop_value, store_id, order_id
                  ) VALUES (?, ?, ?, ?, ?)
                  ON DUPLICATE KEY UPDATE prop_value = VALUES(prop_value)`,
                  [
                    lineItemId,
                    'product_id',
                    i.product.id.split('/').pop(),
                    store_id,
                    orderId
                  ]
                );
              }

              // SKU if available
              if (i.sku) {
                await db.query(
                  `INSERT INTO order_item_properties (
                    line_item_id, prop_name, prop_value, store_id, order_id
                  ) VALUES (?, ?, ?, ?, ?)
                  ON DUPLICATE KEY UPDATE prop_value = VALUES(prop_value)`,
                  [
                    lineItemId,
                    'sku',
                    i.sku,
                    store_id,
                    orderId
                  ]
                );
              }
            } catch (additionalPropError) {
              console.error(`❌ Error inserting additional properties for line item ${lineItemId}:`, additionalPropError);
              errorLogs.push({
                store: shop,
                error: `Failed to insert additional properties for line item ${lineItemId}: ${additionalPropError instanceof Error ? additionalPropError.message : 'Unknown error'}`,
                timestamp: new Date().toISOString()
              });
            }

            // 🟢 Insert custom attributes as properties
            if (Array.isArray(i.customAttributes) && i.customAttributes.length > 0) {
              for (const attr of i.customAttributes) {
                try {
                  await db.query(
                    `INSERT INTO order_item_properties (
                      line_item_id, prop_name, prop_value, store_id, order_id
                    ) VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE prop_value = VALUES(prop_value)`,
                    [
                      lineItemId,
                      attr.key,
                      attr.value,
                      store_id,
                      orderId
                    ]
                  );
                } catch (attrError) {
                  console.error(`❌ Error inserting custom attribute for line item ${lineItemId}:`, attrError);
                  errorLogs.push({
                    store: shop,
                    error: `Failed to insert custom attribute for line item ${lineItemId}: ${attrError instanceof Error ? attrError.message : 'Unknown error'}`,
                    timestamp: new Date().toISOString()
                  });
                }
              }
            }

            // 👉 Step 6: Insert Customers
            const customerId = o.customer?.id?.split('/').pop();
            if (customerId) {
              await db.query(
                `INSERT INTO order_customer (
      order_id, customer_id, store_id
    ) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      customer_id = VALUES(customer_id),
      store_id = VALUES(store_id)`,
                [
                  orderId,
                  customerId,
                  store_id
                ]
              );
            }
          } catch (itemError) {
            console.error(`❌ Error processing line item for order ${orderId}:`, itemError);
            errorLogs.push({
              store: shop,
              error: `Failed to process line item for order ${orderId}: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`,
              timestamp: new Date().toISOString()
            });
        }

        for (const f of fulfillments) {
          const tracking = f.trackingInfo?.[0] || {};
          await db.query(
            `INSERT INTO order_fulfillments (
      fulfillment_id, order_id, store_id,
      tracking_company, tracking_number, tracking_url
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      tracking_number = VALUES(tracking_number),
      tracking_company = VALUES(tracking_company),
      tracking_url = VALUES(tracking_url)`,
            [
              f.id.split("/").pop(),
              o.id.split("/").pop(),
              store_id,
              tracking.company || null,
              tracking.number || null,
              tracking.url || null,
            ]
          );
        }


        // 👉 Insert billing address
        const billing = o.billingAddress;
        if (billing) {
          await db.query(
            `INSERT INTO order_billing (
        order_id, store_id, first_name, last_name, address1, phone,
        city, zip, province, country, address2, company, latitude, longitude,
        name, country_code, province_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        phone = VALUES(phone),
        city = VALUES(city),
        zip = VALUES(zip),
        country = VALUES(country)`,
            [
              orderId,
              store_id,
              billing.firstName || null,
              billing.lastName || null,
              billing.address1 || null,
              billing.phone || null,
              billing.city || null,
              billing.zip || null,
              billing.province || null,
              billing.country || null,
              billing.address2 || null,
              billing.company || null,
              billing.latitude || null,
              billing.longitude || null,
              billing.name || null,
              billing.countryCodeV2 || null,
              billing.provinceCode || null,
            ]
          );
        }

        // 👉 Insert shipping address
        const shipping = o.shippingAddress;
        if (shipping) {
          await db.query(
            `INSERT INTO order_shipping (
        order_id, store_id, first_name, last_name, address1, phone,
        city, zip, province, country, address2, company, latitude, longitude,
        name, country_code, province_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        phone = VALUES(phone),
        city = VALUES(city),
        zip = VALUES(zip),
        country = VALUES(country)`,
            [
              orderId,
              store_id,
              shipping.firstName || null,
              shipping.lastName || null,
              shipping.address1 || null,
              shipping.phone || null,
              shipping.city || null,
              shipping.zip || null,
              shipping.province || null,
              shipping.country || null,
              shipping.address2 || null,
              shipping.company || null,
              shipping.latitude || null,
              shipping.longitude || null,
              shipping.name || null,
              shipping.countryCodeV2 || null,
              shipping.provinceCode || null,
            ]
          );
        }

      }
      for (const order of ordersData.edges) {
        const o = order.node;
        const orderId = o.id.split('/').pop();

        // Only process transactions for orders that were successfully inserted
        if (!successfullyInsertedOrders.has(orderId)) {
          console.log(`⚠️ Skipping transactions for order ${orderId} - order was not successfully inserted`);
          continue;
        }

        // Fetch transactions for this order
        let transactions = [];
        try {
          transactions = await getOrderTransactions(shop, accessToken, orderId);
        } catch (err) {
          console.error("Failed to fetch transactions for order", orderId, err);
          continue;
        }

        // Insert each transaction into the DB
        for (const t of transactions) {
          try {
            await db.query(
              `INSERT INTO order_transaction (
      transaction_id, order_id, store_id, amount, currency, kind, status, gateway, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      created_at = VALUES(created_at)`,
              [
                t.id,
                orderId,
                store_id,
                t.amount,
                t.currency,
                t.kind,
                t.status,
                t.gateway,
                t.created_at,
              ]
            );
          } catch (transactionError) {
            console.error(`❌ Error inserting transaction for order ${orderId}:`, transactionError);
            errorLogs.push({
              store: shop,
              error: `Failed to insert transaction for order ${orderId}: ${transactionError instanceof Error ? transactionError.message : 'Unknown error'}`,
              timestamp: new Date().toISOString()
            });
          }
        }
        try {
          const refunds = await getOrderReturns(shop, accessToken, orderId);

          for (const refund of refunds) {
            const return_id = refund.id;
            const created_at = refund.created_at;

            const refund_line_items = refund.refund_line_items || [];

            for (const item of refund_line_items) {
              const refund_amount = parseFloat(item.subtotal || '0');

              try {
                await db.query(
                  `INSERT INTO order_returns (
            order_id, store_id, return_id, return_reason, refund_amount, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            refund_amount = VALUES(refund_amount),
            created_at = VALUES(created_at)`,
                  [orderId, store_id, return_id, 'N/A', refund_amount, created_at]
                );
              } catch (refundError) {
                console.error(`❌ Error inserting refund for order ${orderId}:`, refundError);
                errorLogs.push({
                  store: shop,
                  error: `Failed to insert refund for order ${orderId}: ${refundError instanceof Error ? refundError.message : 'Unknown error'}`,
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
        } catch (refundsError) {
          console.error(`❌ Error fetching refunds for order ${orderId}:`, refundsError);
          errorLogs.push({
            store: shop,
            error: `Failed to fetch refunds for order ${orderId}: ${refundsError instanceof Error ? refundsError.message : 'Unknown error'}`,
            timestamp: new Date().toISOString()
          });
        }

      }


      
      // 👉 Step 5: Insert Products
      for (const product of productsData.edges) {
        const p = product.node;

        await db.query(
          `INSERT INTO products (
            product_id, store_id, title, handle, vendor,
            product_type, status, variant_count, created_at, updated_at, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            synced_at = NOW()`,
          [
            p.id.split('/').pop(),
            store_id,
            p.title,
            p.handle,
            p.vendor,
            p.productType,
            p.status,
    p.variants?.edges.length || 0,
            p.createdAt,
            p.updatedAt
          ]
        );


        const variants = p.variants?.edges || [];
        for (const variantEdge of variants) {
          const v = variantEdge.node;

            await db.query(
              `INSERT INTO product_variants (
        variant_id, product_id, store_id, title, sku, price,
      inventory_quantity, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        sku = VALUES(sku),
        price = VALUES(price),
        inventory_quantity = VALUES(inventory_quantity),
      updated_at = VALUES(updated_at)`,
              [
                v.id.split('/').pop(),
                p.id.split('/').pop(),
                store_id,
                v.title,
                v.sku || null,
              parseFloat(v.price || 0),
                v.inventoryQuantity || 0,
                v.createdAt,
                v.updatedAt
              ]
            );
        }

      }
      



      
      for (const product of productsData.edges) {
        const p = product.node;
        const productId = p.id.split('/').pop();

        const variants = p.variants?.edges || [];
        for (const variant of variants) {
          const v = variant.node;
          const variantId = v.id?.split('/').pop() || null;
          const sku = v.sku || '';
          const shopifyProductId = p.id;
          const shopifyVariantId = v.id;

          if (!sku) continue; // Skip variants without a SKU

          // Use SKU as the sku_code (you can change this if needed)
          await db.query(
            `INSERT INTO sku_mapping (
        store_id, sku_code, shopify_product_id, shopify_variant_id, shopify_sku
      ) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        shopify_product_id = VALUES(shopify_product_id),
        shopify_variant_id = VALUES(shopify_variant_id),
        shopify_sku = VALUES(shopify_sku)`,
            [
              store_id,
              sku,
              shopifyProductId,
              shopifyVariantId,
              sku,
            ]
          );
        }

      }

      // 👉 Log final summary
        allStoresData.push({
          shop,
          store_id,
          total_orders: ordersData.edges.length,
          total_products: productsData.edges.length,
          total_customers: customersData.edges.length,

        });

      // console.log(`✅ ${shop} sync complete d`);
    } // Close the main try block
    } catch (error) {
      console.error(`❌ Error syncing data for ${shop}:`, error);
      errorLogs.push({
        store: shop,
        error: error && typeof error === 'object' && 'message' in error ? (error as { message: string }).message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  const hasErrors = errorLogs.length > 0;
  const message = hasErrors 
    ? `Sync completed with ${errorLogs.length} error(s)` 
    : "Sync completed successfully!";
    
  return new NextResponse(
    JSON.stringify({
      message,
      summary: {
        orders: allStoresData[0]?.total_orders || 0,
        customers: allStoresData[0]?.total_customers || 0,
        products: allStoresData[0]?.total_products || 0,
      },
      data: allStoresData,
      errors: errorLogs,
      hasErrors
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );


}

