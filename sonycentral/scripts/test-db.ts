import { db, initChatTable, testConnection } from '../src/lib/db';

async function testDatabase() {
  console.log('Testing database connection...');
  
  try {
    // Test basic connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }
    
    console.log('✅ Database connection successful');
    
    // Test table initialization
    console.log('Testing table initialization...');
    await initChatTable();
    console.log('✅ Table initialization successful');
    
    // Test a simple query
    console.log('Testing simple query...');
    const [rows] = await db.execute('SELECT COUNT(*) as count FROM chat_messages') as [any[], any];
    console.log('✅ Query successful, message count:', rows[0]?.count || 0);
    
    console.log('🎉 All database tests passed!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

testDatabase(); 