import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

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

// Initialize chat_messages table
export async function initChatTable() {
  try {
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
    console.log('Chat messages table initialized successfully');
  } catch (error) {
    console.error('Error initializing chat table:', error);
    throw error;
  }
}

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
