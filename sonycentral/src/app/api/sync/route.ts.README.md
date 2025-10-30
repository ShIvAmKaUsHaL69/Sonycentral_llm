# Shopify Data Synchronization API

## File: `src/app/api/sync/route.ts`

### Overview
This is the core synchronization API for the SonyCentral project. It handles the complete data synchronization between Shopify stores and the centralized MySQL database, including orders, products, customers, transactions, and refunds.

### Purpose
- **Multi-Store Sync**: Synchronize data from multiple Shopify stores
- **Complete Data Pipeline**: Handle orders, products, customers, transactions
- **Error Handling**: Robust error handling and logging
- **Data Integrity**: Ensure referential integrity and data consistency
- **Performance**: Efficient batch processing and pagination

### API Endpoints

#### GET `/api/sync`
- **Purpose**: Sync all active stores
- **Response**: Summary of sync results for all stores
- **Usage**: `GET http://localhost:3000/api/sync`

#### POST `/api/sync`
- **Purpose**: Sync specific store
- **Body**: `{ "shopUrl": "store.myshopify.com" }`
- **Response**: Sync results for specified store

### Key Components

#### 1. Store Management
```typescript
const stores = await getStoresFromDB();
```
- **Active Stores**: Only sync stores with `status = 'ACTIVE'`
- **Credentials**: Retrieve access tokens for each store
- **Batch Processing**: Process multiple stores efficiently

#### 2. Data Synchronization Pipeline
```typescript
async function syncStores(stores: { shop: string; accessToken: string }[])
```

**Sync Process:**
1. **Store Details**: Fetch store information
2. **Orders**: Sync order data with line items
3. **Products**: Sync product catalog and variants
4. **Customers**: Sync customer information
5. **Transactions**: Sync payment transactions
6. **Refunds**: Sync refund data
7. **SKU Mapping**: Create SKU to product mappings

#### 3. Order Processing
```typescript
// Insert orders with comprehensive data
await db.query(`INSERT INTO orders (...) VALUES (...)`)
```

**Order Data Includes:**
- **Basic Info**: Order ID, customer, status, currency
- **Financial**: Total price, subtotal, tax, discounts
- **Timestamps**: Created date, updated date
- **Line Items**: Individual order items with variants
- **Fulfillment**: Shipping and tracking information
- **Addresses**: Billing and shipping addresses

#### 4. Product Variant Handling
```typescript
// Insert ALL variants, regardless of SKU
await db.query(`INSERT INTO product_variants (...) VALUES (...)`)
```

**Variant Features:**
- **SKU Handling**: Insert variants with or without SKUs
- **Price Tracking**: Track variant prices and inventory
- **Relationship Mapping**: Link variants to products
- **SKU Mapping**: Create SKU to variant mappings

#### 5. Transaction Processing
```typescript
// Process transactions for successfully inserted orders
if (successfullyInsertedOrders.has(orderId)) {
    // Insert transactions
}
```

**Transaction Features:**
- **Order Validation**: Only process transactions for existing orders
- **Payment Data**: Track payment methods and amounts
- **Refund Processing**: Handle refund transactions
- **Gateway Information**: Store payment gateway details

### Data Flow

#### 1. Store Discovery
```typescript
const stores = await getStoresFromDB();
// Returns: [{ shop: "store.myshopify.com", accessToken: "token" }]
```

#### 2. Data Fetching
```typescript
// Fetch data from Shopify GraphQL API
const ordersData = await fetchAllPaginatedData(shop, accessToken, GET_ORDERS_QUERY);
const productsData = await fetchAllPaginatedData(shop, accessToken, GET_PRODUCTS_QUERY);
const customersData = await fetchAllPaginatedData(shop, accessToken, GET_CUSTOMERS_QUERY);
```

#### 3. Database Insertion
```typescript
// Insert with error handling and foreign key validation
try {
    await db.query(`INSERT INTO orders (...) VALUES (...)`);
    successfullyInsertedOrders.add(orderId);
} catch (error) {
    // Log error and continue
}
```

#### 4. Relationship Processing
```typescript
// Process related data only for successfully inserted records
if (successfullyInsertedOrders.has(orderId)) {
    // Process transactions, refunds, etc.
}
```

### Error Handling

#### Database Errors
```typescript
try {
    await db.query(`INSERT INTO orders (...) VALUES (...)`);
} catch (error) {
    console.error(`❌ Error inserting order ${orderId}:`, error);
    errorLogs.push({
        store: shop,
        error: `Failed to insert order ${orderId}: ${error.message}`,
        timestamp: new Date().toISOString()
    });
    continue; // Skip to next order
}
```

#### Foreign Key Constraints
```typescript
// Only process transactions for successfully inserted orders
if (!successfullyInsertedOrders.has(orderId)) {
    console.log(`⚠️ Skipping transactions for order ${orderId} - order not found`);
    continue;
}
```

#### API Errors
```typescript
try {
    const data = await fetchShopifyGraphQL({ shop, accessToken, query });
} catch (error) {
    console.error(`❌ Error fetching data for ${shop}:`, error);
    // Continue with next store
}
```

### Performance Optimizations

#### Batch Processing
- **Pagination**: Process large datasets in chunks
- **Parallel Processing**: Process multiple stores simultaneously
- **Connection Pooling**: Efficient database connections

#### Memory Management
- **Streaming**: Process data in streams to avoid memory issues
- **Cleanup**: Clean up resources after processing
- **Limits**: Set reasonable limits on data processing

### Data Validation

#### Order Validation
```typescript
// Validate order data before insertion
if (!orderId || !store_id) {
    console.error("Invalid order data");
    continue;
}
```

#### SKU Validation
```typescript
// Handle variants with and without SKUs
const sku = v.sku || null;
if (!sku) {
    console.log(`⚠️ Variant ${v.id} has no SKU (this is normal)`);
}
```

### Logging and Monitoring

#### Progress Tracking
```typescript
console.log(`📦 Processing ${productsData.edges.length} products for ${shop}`);
console.log(`✅ Inserted ${totalVariantsInserted} product variants for ${shop}`);
```

#### Error Logging
```typescript
errorLogs.push({
    store: shop,
    error: error.message,
    timestamp: new Date().toISOString()
});
```

#### Summary Reporting
```typescript
return new NextResponse(JSON.stringify({
    message: hasErrors ? `Sync completed with ${errorLogs.length} error(s)` : "Sync completed successfully!",
    summary: {
        orders: totalOrders,
        customers: totalCustomers,
        products: totalProducts
    },
    data: allStoresData,
    errors: errorLogs,
    hasErrors
}));
```

### File Relationships

#### **Imported By:**
- Frontend components that trigger sync
- Admin panels for data management
- Monitoring systems for sync status

#### **Imports:**
- `@/lib/db` - Database connection
- `@/lib/shopify/store/stores` - Store management
- `@/lib/shopify/graphql/*` - GraphQL queries
- `@/lib/shopify/rest/*` - REST API calls

### Configuration

#### Environment Variables
```bash
# Database configuration
DB_HOST=localhost
DB_USER=username
DB_PASSWORD=password
DB_NAME=sonycentral

# Shopify configuration
SHOPIFY_API_VERSION=2023-10
```

#### Sync Settings
```typescript
// Pagination settings
const PAGINATION_LIMIT = 100;

// Error handling
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
```

### Security Considerations

#### Data Protection
- **Access Tokens**: Secure storage of Shopify access tokens
- **Database Credentials**: Environment variable protection
- **SQL Injection**: Parameterized queries only
- **Rate Limiting**: Respect Shopify API limits

#### Error Information
- **Sensitive Data**: Don't log sensitive information
- **Error Details**: Provide useful error messages
- **Audit Trail**: Log all sync operations

### Troubleshooting

#### Common Issues
1. **Foreign Key Errors**: Check order insertion before processing transactions
2. **API Rate Limits**: Implement delays between requests
3. **Memory Issues**: Process data in smaller batches
4. **Connection Timeouts**: Increase timeout settings

#### Debug Mode
```typescript
// Enable detailed logging
console.log(`🔄 GET /api/sync - Found ${stores.length} stores to sync`);
console.log(`🏪 Starting sync for store: ${shop}`);
```

### Future Enhancements
- **Incremental Sync**: Only sync changed data
- **Real-time Updates**: WebSocket-based real-time sync
- **Conflict Resolution**: Handle data conflicts
- **Performance Metrics**: Detailed performance monitoring

### Related Files
- `src/lib/shopify/store/stores.ts` - Store management
- `src/lib/shopify/graphql/queries/*` - GraphQL queries
- `src/lib/shopify/rest/*` - REST API calls
- `src/lib/db.ts` - Database connection
- `src/app/api/sync0/route.ts` - Alternative sync implementation
