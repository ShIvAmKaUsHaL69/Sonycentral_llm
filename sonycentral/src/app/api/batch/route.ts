export const dynamic = "force-dynamic";

import { db } from '@/lib/db';


import { NextRequest, NextResponse } from 'next/server'
import { getStoresFromDB } from '@/lib/shopify/store/stores'
import { fetchShopifyGraphQL } from '@/lib/shopify/graphql/fetchGraphQl';
import { fetchAllPaginatedData } from '@/lib/shopify/graphql/fetchAllPaginated';
import { GET_ORDERS_QUERY } from '@/lib/shopify/graphql/queries/getOrders';
import { GET_PRODUCTS_QUERY, GET_PRODUCTS_MIN_QUERY } from '@/lib/shopify/graphql/queries/getProducts';
import { GET_CUSTOMERS_QUERY } from '@/lib/shopify/graphql/queries/getCustomers';
import { GET_STORE_DETAILS_QUERY } from '@/lib/shopify/graphql/queries/getStoreDetails';
import { getOrderTransactions } from '@/lib/shopify/rest/getOrderTransactions';
import { getOrderReturns } from '@/lib/shopify/rest/getOrderReturns'

// Add this helper at the top of the file
async function batchInsert(sqlBase: string, values: any[][], batchSize = 500, connection?: any) {
  if (!values || values.length === 0) return;
  const executor = connection ? connection : db;
  for (let i = 0; i < values.length; i += batchSize) {
    const batch = values.slice(i, i + batchSize);
    const placeholders = batch.map((row: any[]) => '(' + row.map(() => '?').join(',') + ')').join(',');
    const sql = sqlBase.replace('??', placeholders);
    await executor.query(sql, batch.flat());
  }
}

export async function GET() {
  const stores = await getStoresFromDB();
  return await syncStores(stores);
}




export async function POST(req: NextRequest) {
  const body = await req.json();
  const { shopUrl, accessToken } = body;

  if (!shopUrl) {
    return NextResponse.json({ message: 'Missing shopUrl' }, { status: 400 });
  }

  console.log('🔍 Batch API called with:', { shopUrl, accessToken });
  
  // Look up accessToken for the given shopUrl
  const [rows] = await db.query<any[]>(
    'SELECT shop_url, access_token FROM stores WHERE shop_url = ?', [shopUrl]
  );
  console.log('🔍 Database lookup result:', rows);
  
  if (!rows.length) {
    console.log('❌ Store not found in database');
    return NextResponse.json({ message: 'Store not found' }, { status: 404 });
  }
  
  const { shop_url, access_token } = rows[0];
  console.log('🔍 Using store data:', { shop_url, access_token });
  
  // Use the accessToken from the request if provided, otherwise use from database
  const finalAccessToken = accessToken || access_token;
  console.log('🔍 Final access token:', finalAccessToken);
  
  return await syncStores([{ shop: shop_url, accessToken: finalAccessToken }]);
}

// ✅ Shared sync logic used by GET and POST
async function syncStores(stores: { shop: string; accessToken: string }[]) {
  const allStoresData = [];
  const errorLogs = [];
  const skippedSummary = {
    orders: 0,
    variants_no_sku: 0,
  };

  for (const { shop, accessToken } of stores) {
    try {
      console.log('🔍 Fetching store details for:', shop);
      const storeDetailsRaw = await fetchShopifyGraphQL({
        shop,
        accessToken,
        query: GET_STORE_DETAILS_QUERY,
      });
      console.log('🔍 Store details response:', storeDetailsRaw);

      const storeDetails = storeDetailsRaw?.shop;
      if (!storeDetails) {
        console.log('❌ No store details found in response');
        throw new Error('Failed to fetch store details from Shopify');
      }
      
      const store_id = storeDetails.id.split('/').pop();
      console.log('🔍 Extracted store ID:', store_id);

      console.log(`🔄 Fetching data for store: ${shop}`);
      
      // Fetch data with individual error handling
      let ordersData: any = { edges: [] };
      let productsData: any = { edges: [] };
      let customersData: any = { edges: [] };
      
      try {
        ordersData = await fetchAllPaginatedData({
          shop,
          accessToken,
          query: GET_ORDERS_QUERY,
          extractor: (data) => data.orders || [],
        });
        console.log(`✅ Orders fetched successfully: ${ordersData.edges?.length || 0} orders`);
      } catch (error) {
        console.error(`❌ Error fetching orders:`, error);
        console.log(`⚠️ Continuing with empty orders data`);
        errorLogs.push({
          store: shop,
          error: `Failed to fetch orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        });
      }
      
      try {
        productsData = await fetchAllPaginatedData({
          shop,
          accessToken,
          query: GET_PRODUCTS_QUERY,
          extractor: (data) => data.products || [],
        });
        console.log(`✅ Products fetched successfully: ${productsData.edges?.length || 0} products`);
        if (!productsData?.edges?.length) {
          console.warn(`Products edges empty for ${shop}. Retrying with minimal products query.`);
          const fallback = await fetchAllPaginatedData({
            shop,
            accessToken,
            query: GET_PRODUCTS_MIN_QUERY,
            extractor: (data) => data.products || [],
          });
          if (fallback?.edges?.length) {
            console.log(`Products fallback succeeded with ${fallback.edges.length} items.`);
            productsData = fallback;
          }
        }
      } catch (error) {
        console.error(`❌ Error fetching products:`, error);
        console.log(`⚠️ Continuing with empty products data`);
        errorLogs.push({
          store: shop,
          error: `Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        });
      }
      
      try {
        customersData = await fetchAllPaginatedData({
          shop,
          accessToken,
          query: GET_CUSTOMERS_QUERY,
          extractor: (data) => data.customers || [],
        });
        console.log(`✅ Customers fetched successfully: ${customersData.edges?.length || 0} customers`);
      } catch (error) {
        console.error(`❌ Error fetching customers:`, error);
        console.log(`⚠️ Continuing with empty customers data`);
        errorLogs.push({
          store: shop,
          error: `Failed to fetch customers: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`📊 Data fetched for ${shop}:`);
      console.log(`  - Orders: ${ordersData.edges?.length || 0}`);
      console.log(`  - Products: ${productsData.edges?.length || 0}`);
      console.log(`  - Customers: ${customersData.edges?.length || 0}`);
      
      // Debug the actual data structure
      console.log('🔍 Orders data structure:', {
        hasData: !!ordersData,
        hasEdges: !!ordersData?.edges,
        edgesLength: ordersData?.edges?.length,
        firstOrder: ordersData?.edges?.[0]
      });
      
      console.log('🔍 Products data structure:', {
        hasData: !!productsData,
        hasEdges: !!productsData?.edges,
        edgesLength: productsData?.edges?.length,
        firstProduct: productsData?.edges?.[0]
      });
      
      console.log('🔍 Customers data structure:', {
        hasData: !!customersData,
        hasEdges: !!customersData?.edges,
        edgesLength: customersData?.edges?.length,
        firstCustomer: customersData?.edges?.[0]
      });

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


      // 1. Collect all values for each table
      const orderValues: any[] = [];
      const orderItemValues: any[] = [];
      const orderItemPropValues: any[] = [];
      const orderCustomerValues: any[] = [];
      const orderFulfillmentValues: any[] = [];
      const orderBillingValues: any[] = [];
      const orderShippingValues: any[] = [];
      const orderTransactionValues: any[] = [];
      const orderReturnValues: any[] = [];
      const productValues: any[] = [];
      const productVariantValues: any[] = [];
      const skuMappingValues: any[] = [];
      const customerValues: any[] = [];

      // 👉 Step 4.5: Insert Customers (basic info only, order count will be calculated later)
      for (const customer of customersData.edges) {
        const c = customer.node;
        customerValues.push([
          c.id.split('/').pop(),
          c.id,
          store_id,
          c.firstName,
          c.lastName,
          c.email,
          c.phone || 'NA',
          0, // Will be calculated later
          0, // Will be calculated later
          c.createdAt,
        ]);
      }

      // 👉 Step 4: Insert Orders
      for (const order of ordersData.edges) {
        const o = order.node;
        const orderId = o.id.split('/').pop();

        // Collect order main data
        orderValues.push([
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
        ]);

        const lineItems = o.lineItems?.edges || [];
        const fulfillments = o.fulfillments || [];
        // Use the first fulfillment's location for all items in this order
        let originLocationId: any = null;
        let originLocationName: any = null;
        if (fulfillments.length > 0 && fulfillments[0].location) {
          originLocationId = fulfillments[0].location.id?.split('/').pop() || null;
          originLocationName = fulfillments[0].location.name || null;
        }
        for (const item of lineItems) {
          const i = item.node;

          orderItemValues.push([
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
            i.discountedTotalSet?.shopMoney?.amount || null,
            parseFloat(i.discountAllocations?.[0]?.allocatedAmountSet?.shopMoney?.amount || '0'),
            originLocationId,
            originLocationName,
          ]);

          // order item properties
          const lineItemId = i.id?.split('/').pop();
          
          // Always insert the shopify_id property for every line item
          if (lineItemId) {
            orderItemPropValues.push([
              lineItemId,  // Use actual line item ID, not attr.id
              'shopify_id',
              lineItemId,
              store_id,
              orderId,
            ]);
          }
          
          // Insert additional useful properties
          // Product variant ID if available
          if (i.variant?.id) {
            orderItemPropValues.push([
              lineItemId,
              'variant_id',
              i.variant.id.split('/').pop(),
              store_id,
              orderId,
            ]);
          }

          // Product ID if available
          if (i.product?.id) {
            orderItemPropValues.push([
              lineItemId,
              'product_id',
              i.product.id.split('/').pop(),
              store_id,
              orderId,
            ]);
          }

          // SKU if available
          if (i.sku) {
            orderItemPropValues.push([
              lineItemId,
              'sku',
              i.sku,
              store_id,
              orderId,
            ]);
          }
          
          // Insert custom attributes as properties
          if (Array.isArray(i.customAttributes) && i.customAttributes.length > 0) {
            for (const attr of i.customAttributes) {
              orderItemPropValues.push([
                lineItemId,  // Use actual line item ID, not attr.id
                attr.key,
                attr.value,
                store_id,
                orderId,
              ]);
            }
          }

          // order-customer link
          const customerId = o.customer?.id?.split('/').pop();
          if (customerId) {
            orderCustomerValues.push([
              orderId,
              customerId,
              store_id,
            ]);
          }
        }

        for (const f of fulfillments) {
          const tracking = f.trackingInfo?.[0] || {};
          orderFulfillmentValues.push([
            f.id.split("/").pop(),
            o.id.split("/").pop(),
            store_id,
            tracking.company || null,
            tracking.number || null,
            tracking.url || null,
          ]);
        }

        // billing address
        const billing = o.billingAddress;
        if (billing) {
          orderBillingValues.push([
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
          ]);
        }

        // shipping address
        const shipping = o.shippingAddress;
        if (shipping) {
          orderShippingValues.push([
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
          ]);
        }
      }

      for (const order of ordersData.edges) {
        const o = order.node;
        const orderId = o.id.split('/').pop();

        // Fetch transactions for this order
        let transactions: any[] = [];
        try {
          transactions = await getOrderTransactions(shop, accessToken, orderId);
        } catch (err) {
          console.error("Failed to fetch transactions for order", orderId, err);
          errorLogs.push({
            store: shop,
            error: `Failed to fetch transactions for order ${orderId}: ${err instanceof Error ? err.message : 'Unknown error'}`,
            timestamp: new Date().toISOString()
          });
          continue;
        }

        // Collect each transaction into the array
        for (const t of transactions) {
          orderTransactionValues.push([
            t.id,
            orderId,
            store_id,
            t.amount,
            t.currency,
            t.kind,
            t.status,
            t.gateway,
            t.created_at,
          ]);
        }

        let refunds: any[] = [];
        try {
          refunds = await getOrderReturns(shop, accessToken, orderId);
        } catch (err) {
          console.error("Failed to fetch refunds for order", orderId, err);
          errorLogs.push({
            store: shop,
            error: `Failed to fetch refunds for order ${orderId}: ${err instanceof Error ? err.message : 'Unknown error'}`,
            timestamp: new Date().toISOString()
          });
          continue;
        }

        for (const refund of refunds) {
          const return_id = refund.id;
          const created_at = refund.created_at;

          const refund_line_items = refund.refund_line_items || [];

          for (const item of refund_line_items) {
            const refund_amount = parseFloat(item.subtotal || '0');
            orderReturnValues.push([orderId, store_id, return_id, 'N/A', refund_amount, created_at]);
          }
        }
      }

      // 👉 Step 5: Insert Products
      for (const product of productsData.edges) {
        const p = product.node;
        productValues.push([
          p.id.split('/').pop(),
          store_id,
          p.title,
          p.handle,
          p.vendor,
          p.productType,
          p.status,
          p.variants?.edges.length || 0,
          p.createdAt,
          p.updatedAt,
        ]);

        const variants = p.variants?.edges || [];
        for (const variantEdge of variants) {
          const v = variantEdge.node;
          productVariantValues.push([
            v.id.split('/').pop(),
            p.id.split('/').pop(),
            store_id,
            v.title,
            v.sku || null,
            parseFloat(v.price || 0),
            v.inventoryQuantity || 0,
            v.createdAt,
            v.updatedAt,
            new Date().toISOString().slice(0, 19).replace('T', ' '), // synced_at
          ]);
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
          skuMappingValues.push([
            store_id,
            sku,
            shopifyProductId,
            shopifyVariantId,
            sku,
            new Date().toISOString().slice(0, 19).replace('T', ' '), // synced_at
          ]);
        }
      }

      // Execute batched inserts inside a single transaction for this store
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        
        console.log(`📊 Batch inserting data for ${shop}:`);
        console.log(`  - Customers: ${customerValues.length}`);
        console.log(`  - Orders: ${orderValues.length}`);
        console.log(`  - Order Items: ${orderItemValues.length}`);
        console.log(`  - Order Item Properties: ${orderItemPropValues.length}`);
        console.log(`  - Order Customers: ${orderCustomerValues.length}`);
        console.log(`  - Order Fulfillments: ${orderFulfillmentValues.length}`);
        console.log(`  - Order Billing: ${orderBillingValues.length}`);
        console.log(`  - Order Shipping: ${orderShippingValues.length}`);
        console.log(`  - Order Transactions: ${orderTransactionValues.length}`);
        console.log(`  - Order Returns: ${orderReturnValues.length}`);
        console.log(`  - Products: ${productValues.length}`);
        console.log(`  - Product Variants: ${productVariantValues.length}`);
        console.log(`  - SKU Mappings: ${skuMappingValues.length}`);

        await batchInsert(
          `INSERT INTO customers (
            customer_id, shopify_id, store_id, first_name, last_name,
            email, phone, orders_count, total_spent, created_at
          ) VALUES ?? ON DUPLICATE KEY UPDATE 
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            email = VALUES(email),
            phone = VALUES(phone),
            synced_at = NOW()`,
          customerValues,
          500,
          connection
        );

        await batchInsert(
          `INSERT INTO orders (
            order_id, shopify_id, store_id, name, email, status, currency,
            total_price, subtotal_price, total_tax, total_discount, shipping_cost,
            created_at
          ) VALUES ?? ON DUPLICATE KEY UPDATE 
            status = VALUES(status),
            synced_at = NOW()`,
          orderValues,
          250,
          connection
        );

        await batchInsert(
          `INSERT INTO order_items (
            order_id, store_id, product_id, variant_id, title, quantity, sku,
            priceBeforeVat, vatAmount, vatPercentage, price, discount,
            origin_location_id, origin_location_name
          ) VALUES ?? ON DUPLICATE KEY UPDATE 
            quantity = VALUES(quantity),
            sku = VALUES(sku),
            price = VALUES(price),
            vatAmount = VALUES(vatAmount),
            vatPercentage = VALUES(vatPercentage),
            priceBeforeVat = VALUES(priceBeforeVat),
            discount = VALUES(discount),
            synced_at = NOW()`,
          orderItemValues,
          500,
          connection
        );

        await batchInsert(
          `INSERT INTO order_item_properties (
            line_item_id, prop_name, prop_value, store_id, order_id
          ) VALUES ?? ON DUPLICATE KEY UPDATE prop_value = VALUES(prop_value)`,
          orderItemPropValues,
          1000,
          connection
        );

        await batchInsert(
          `INSERT INTO order_customer (
            order_id, customer_id, store_id
          ) VALUES ?? ON DUPLICATE KEY UPDATE
            customer_id = VALUES(customer_id),
            store_id = VALUES(store_id)`,
          orderCustomerValues,
          500,
          connection
        );

        await batchInsert(
          `INSERT INTO order_fulfillments (
            fulfillment_id, order_id, store_id,
            tracking_company, tracking_number, tracking_url
          ) VALUES ?? ON DUPLICATE KEY UPDATE 
            tracking_number = VALUES(tracking_number),
            tracking_company = VALUES(tracking_company),
            tracking_url = VALUES(tracking_url)`,
          orderFulfillmentValues,
          250,
          connection
        );

        await batchInsert(
          `INSERT INTO order_billing (
            order_id, store_id, first_name, last_name, address1, phone,
            city, zip, province, country, address2, company, latitude, longitude,
            name, country_code, province_code
          ) VALUES ?? ON DUPLICATE KEY UPDATE
            phone = VALUES(phone),
            city = VALUES(city),
            zip = VALUES(zip),
            country = VALUES(country)`,
          orderBillingValues,
          250,
          connection
        );

        await batchInsert(
          `INSERT INTO order_shipping (
            order_id, store_id, first_name, last_name, address1, phone,
            city, zip, province, country, address2, company, latitude, longitude,
            name, country_code, province_code
          ) VALUES ?? ON DUPLICATE KEY UPDATE
            phone = VALUES(phone),
            city = VALUES(city),
            zip = VALUES(zip),
            country = VALUES(country)`,
          orderShippingValues,
          250,
          connection
        );

        await batchInsert(
          `INSERT INTO order_transaction (
            transaction_id, order_id, store_id, amount, currency, kind, status, gateway, created_at
          ) VALUES ?? ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            created_at = VALUES(created_at)`,
          orderTransactionValues,
          500,
          connection
        );

        await batchInsert(
          `INSERT INTO order_returns (
            order_id, store_id, return_id, return_reason, refund_amount, created_at
          ) VALUES ?? ON DUPLICATE KEY UPDATE
            refund_amount = VALUES(refund_amount),
            created_at = VALUES(created_at)`,
          orderReturnValues,
          500,
          connection
        );

        await batchInsert(
          `INSERT INTO products (
            product_id, store_id, title, handle, vendor,
            product_type, status, variant_count, created_at, updated_at
          ) VALUES ?? ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            synced_at = NOW()`,
          productValues,
          250,
          connection
        );

        await batchInsert(
          `INSERT INTO product_variants (
            variant_id, product_id, store_id, title, sku, price,
            inventory_quantity, created_at, updated_at, synced_at
          ) VALUES ?? ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            sku = VALUES(sku),
            price = VALUES(price),
            inventory_quantity = VALUES(inventory_quantity),
            updated_at = VALUES(updated_at),
            synced_at = NOW()`,
          productVariantValues,
          500,
          connection
        );

        await batchInsert(
          `INSERT INTO sku_mapping (
            store_id, sku_code, shopify_product_id, shopify_variant_id, shopify_sku, synced_at
          ) VALUES ?? ON DUPLICATE KEY UPDATE
            shopify_product_id = VALUES(shopify_product_id),
            shopify_variant_id = VALUES(shopify_variant_id),
            shopify_sku = VALUES(shopify_sku),
            synced_at = NOW()`,
          skuMappingValues,
          500,
          connection
        );

        await connection.commit();
        console.log(`✅ Batch insert completed successfully for ${shop}`);
      } catch (err) {
        await connection.rollback();
        console.error(`❌ Batch insert failed for ${shop}:`, err);
        errorLogs.push({
          store: shop,
          error: `Batch insert failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        });
        throw err;
      } finally {
        connection.release();
      }

      // 👉 Step 7: Recalculate order counts and total spent for all customers
      console.log(`🔄 Recalculating order counts and total spent for customers in ${shop}...`);
      try {
        await db.query(
          `UPDATE customers c
           SET 
             orders_count = (
               SELECT COUNT(*) 
               FROM order_customer oc 
               WHERE oc.customer_id = c.customer_id 
               AND oc.store_id = c.store_id
             ),
             total_spent = (
               SELECT COALESCE(SUM(o.total_price), 0)
               FROM order_customer oc
               JOIN orders o ON oc.order_id = o.order_id
               WHERE oc.customer_id = c.customer_id 
               AND oc.store_id = c.store_id
             )
           WHERE c.store_id = ?`,
          [store_id]
        );
        console.log(`✅ Order counts and total spent recalculated for ${shop}`);
      } catch (recalcError) {
        console.error(`❌ Error recalculating order counts for ${shop}:`, recalcError);
        errorLogs.push({
          store: shop,
          error: `Failed to recalculate order counts: ${recalcError instanceof Error ? recalcError.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        });
      }

      // 👉 Log final summary
      // Recalculate totals from DB to avoid zeroes when fetch edges are empty
      try {
        const [dbTotalsRows] = await db.query<any[]>(
          `SELECT 
             (SELECT COUNT(*) FROM products WHERE store_id = ?) AS total_products,
             (SELECT COUNT(*) FROM customers WHERE store_id = ?) AS total_customers,
             (SELECT COUNT(*) FROM orders WHERE store_id = ?) AS total_orders`,
          [store_id, store_id, store_id]
        );
        const dbTotals = dbTotalsRows?.[0] || { total_products: 0, total_customers: 0, total_orders: 0 };

        // Update store totals based on actual DB counts
        await db.query(
          `UPDATE stores SET 
             total_products = ?,
             total_customers = ?,
             total_orders = ?,
             synced_at = NOW()
           WHERE shop_url = ?`,
          [dbTotals.total_products, dbTotals.total_customers, dbTotals.total_orders, shop]
        );

        const storeSummary = {
          shop,
          store_id,
          total_orders: dbTotals.total_orders,
          total_products: dbTotals.total_products,
          total_customers: dbTotals.total_customers,
        };

        console.log(`✅ ${shop} sync completed:`, storeSummary);
        allStoresData.push(storeSummary);
      } catch (totalsErr) {
        console.error(`❌ Failed to compute/update store totals for ${shop}:`, totalsErr);
        const storeSummary = {
          shop,
          store_id,
          total_orders: ordersData.edges.length,
          total_products: productsData.edges.length,
          total_customers: customersData.edges.length,
        };
        allStoresData.push(storeSummary);
      }
    } catch (error) {
      console.error(`❌ Error syncing data for ${shop}:`, error);
      errorLogs.push({
        store: shop,
        error: `Store sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      });
    }
  }
  const hasErrors = errorLogs.length > 0;
  const message = hasErrors 
    ? `Sync completed with ${errorLogs.length} error(s)` 
    : "Sync completed successfully!";
    
  const responseData = {
    message,
    summary: {
      orders: allStoresData[0]?.total_orders || 0,
      customers: allStoresData[0]?.total_customers || 0,
      products: allStoresData[0]?.total_products || 0,
    },
    data: allStoresData,
    errors: errorLogs,
    hasErrors,
    skipped: skippedSummary
  };
  
  console.log('Final response data:', responseData);
  console.log('allStoresData length:', allStoresData.length);
  console.log('allStoresData[0]:', allStoresData[0]);
  
  return new NextResponse(
    JSON.stringify(responseData),
    {
      headers: { "Content-Type": "application/json" },
    }
  );


}

