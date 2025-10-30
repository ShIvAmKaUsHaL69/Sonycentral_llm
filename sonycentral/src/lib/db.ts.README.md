# Database Connection Module

## File: `src/lib/db.ts`

### Overview
This module provides the centralized database connection and utilities for the SonyCentral Next.js application. It manages MySQL connections, handles connection pooling, and provides database initialization functions.

### Purpose
- **Connection Management**: Centralized database connection handling
- **Connection Pooling**: Efficient connection pool management
- **Database Initialization**: Set up required database tables
- **Connection Testing**: Health checks and connection validation
- **Error Handling**: Graceful connection error management

### Key Components

#### 1. Database Connection Pool
```typescript
export const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});
```

**Pool Configuration:**
- **Connection Limit**: Maximum 10 concurrent connections
- **Queue Management**: No queue limit for connection requests
- **Character Set**: UTF8MB4 for full Unicode support
- **Auto-Reconnect**: Automatic reconnection on connection loss

#### 2. Chat Messages Table Initialization
```typescript
export async function initChatTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      chat_id VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      sender ENUM('user', 'bot') NOT NULL,
      route VARCHAR(100) DEFAULT 'general',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_chat_id (chat_id),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}
```

**Table Features:**
- **Auto-increment ID**: Primary key with auto-increment
- **Chat Tracking**: Track conversations by chat_id
- **Message Storage**: Store user and bot messages
- **Route Classification**: Categorize messages by route
- **Indexing**: Optimized indexes for performance
- **Unicode Support**: Full UTF8MB4 character support

#### 3. Connection Testing
```typescript
export async function testConnection() {
  try {
    const connection = await db.getConnection();
    await connection.ping();
    connection.release();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
```

**Health Check Features:**
- **Ping Test**: Verify database connectivity
- **Connection Validation**: Test actual connection
- **Error Logging**: Log connection failures
- **Resource Cleanup**: Proper connection release

### Database Schema

#### Chat Messages Table
```sql
CREATE TABLE chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  sender ENUM('user', 'bot') NOT NULL,
  route VARCHAR(100) DEFAULT 'general',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_id (chat_id),
  INDEX idx_created_at (created_at)
);
```

**Column Descriptions:**
- **id**: Auto-increment primary key
- **chat_id**: Unique identifier for chat sessions
- **message**: The actual message content
- **sender**: Whether message is from user or bot
- **route**: Message category (general, sync, etc.)
- **created_at**: Timestamp of message creation

#### Indexes
- **idx_chat_id**: Fast lookups by chat session
- **idx_created_at**: Efficient timestamp-based queries

### Usage Examples

#### Basic Connection
```typescript
import { db } from '@/lib/db';

// Execute a query
const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
```

#### Table Initialization
```typescript
import { initChatTable } from '@/lib/db';

// Initialize chat table
await initChatTable();
```

#### Connection Testing
```typescript
import { testConnection } from '@/lib/db';

// Test database connection
const isConnected = await testConnection();
if (!isConnected) {
  console.error('Database connection failed');
}
```

### File Relationships

#### **Imported By:**
- All API routes (`src/app/api/*/route.ts`)
- Database utilities (`src/lib/shopify/store/stores.ts`)
- Chat components (`src/app/chat/page.tsx`)
- Admin panels (`src/components/admin-panel/*`)

#### **Imports:**
- `mysql2/promise` - MySQL connection library
- `dotenv` - Environment variable management

### Configuration

#### Environment Variables
```bash
# Database configuration
DB_HOST=localhost
DB_USER=username
DB_PASSWORD=password
DB_NAME=sonycentral
```

#### Connection Pool Settings
```typescript
{
  waitForConnections: true,    // Wait for available connections
  connectionLimit: 10,         // Maximum connections
  queueLimit: 0,               // No queue limit
  charset: 'utf8mb4'           // Full Unicode support
}
```

### Error Handling

#### Connection Errors
```typescript
try {
  const [rows] = await db.query('SELECT * FROM table');
} catch (error) {
  console.error('Database query failed:', error);
  // Handle error gracefully
}
```

#### Pool Exhaustion
```typescript
// Handle pool exhaustion
if (error.code === 'ER_CON_COUNT_ERROR') {
  console.error('Too many database connections');
  // Implement retry logic or increase pool size
}
```

### Performance Considerations

#### Connection Pooling
- **Pool Size**: 10 connections for optimal performance
- **Queue Management**: No queue limit for immediate processing
- **Connection Reuse**: Reuse connections for efficiency
- **Timeout Handling**: Automatic connection cleanup

#### Query Optimization
- **Prepared Statements**: Use parameterized queries
- **Index Usage**: Leverage database indexes
- **Connection Management**: Proper connection release

### Security Features

#### SQL Injection Prevention
```typescript
// Use parameterized queries
const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

// Avoid string concatenation
// ❌ Bad: `SELECT * FROM users WHERE id = ${userId}`
// ✅ Good: `SELECT * FROM users WHERE id = ?`
```

#### Connection Security
- **Environment Variables**: Store credentials securely
- **SSL Support**: Use SSL connections in production
- **Access Control**: Limit database user permissions

### Monitoring and Logging

#### Connection Health
```typescript
// Regular health checks
setInterval(async () => {
  const isHealthy = await testConnection();
  if (!isHealthy) {
    console.error('Database health check failed');
  }
}, 30000); // Check every 30 seconds
```

#### Query Logging
```typescript
// Log slow queries
const start = Date.now();
const [rows] = await db.query('SELECT * FROM large_table');
const duration = Date.now() - start;

if (duration > 1000) {
  console.warn(`Slow query detected: ${duration}ms`);
}
```

### Troubleshooting

#### Common Issues
1. **Connection Refused**: Check database server status
2. **Authentication Failed**: Verify credentials
3. **Pool Exhaustion**: Increase connection limit
4. **Timeout Errors**: Check network connectivity

#### Debug Mode
```typescript
// Enable MySQL debug logging
const db = mysql.createPool({
  // ... other options
  debug: process.env.NODE_ENV === 'development'
});
```

### Production Considerations

#### Connection Pool Tuning
```typescript
// Production settings
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20,        // Increase for production
  queueLimit: 0,
  acquireTimeout: 60000,     // 60 second timeout
  timeout: 60000,            // 60 second timeout
  charset: 'utf8mb4'
});
```

#### SSL Configuration
```typescript
// SSL connection for production
const db = mysql.createPool({
  // ... other options
  ssl: {
    rejectUnauthorized: false
  }
});
```

### Future Enhancements
- **Connection Monitoring**: Real-time connection metrics
- **Automatic Failover**: Handle database failures
- **Query Caching**: Cache frequently used queries
- **Performance Metrics**: Detailed performance monitoring

### Related Files
- `src/app/api/sync/route.ts` - Uses database for sync operations
- `src/lib/shopify/store/stores.ts` - Store management with database
- `src/app/chat/page.tsx` - Chat functionality with database
- `src/components/admin-panel/*` - Admin interfaces with database
