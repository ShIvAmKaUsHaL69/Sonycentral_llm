import { db, initChatTable } from '../src/lib/db';

async function main() {
  try {
    console.log('Initializing database...');
    await initChatTable();
    console.log('Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

main(); 