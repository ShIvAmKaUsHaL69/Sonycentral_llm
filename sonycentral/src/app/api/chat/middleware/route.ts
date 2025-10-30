import { NextRequest, NextResponse } from 'next/server';
import { db, initChatTable } from '@/lib/db';
import { DataFormatter } from '@/lib/data-formatter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// SQL Client for communicating with the LocalChat system
class SQLClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async executeSQL(query: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) {
        throw new Error(`SQL API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to execute SQL: ${error}`);
    }
  }

  async processWithAssistant(prompt: string): Promise<any> {
    try {
      // Call the start_assistant endpoint (if it exists) or use the three-model assistant
      const response = await fetch(`${this.baseUrl}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: prompt, preview_rows: 20 })
      });
      
      if (!response.ok) {
        throw new Error(`Assistant API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to process with assistant: ${error}`);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, message, route } = body;

    if (!chatId || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields: chatId and message' 
      }, { status: 400 });
    }

    // Initialize chat table if it doesn't exist
    await initChatTable();

    // Save user message to database
    await db.execute(
      'INSERT INTO chat_messages (chat_id, message, sender, route) VALUES (?, ?, ?, ?)',
      [chatId, message, 'user', route || 'general']
    );

    // Initialize SQL Client
    const sqlClient = new SQLClient();
    
    // Check if SQL API is available
    const isHealthy = await sqlClient.healthCheck();
    if (!isHealthy) {
      throw new Error('SQL API is not available. Please start the LocalChat system.');
    }

    let botResponse = '';
    let downloadLink: string | null = null;

    try {
      console.log('Processing message through SQL Client middleware:', message);
      
      // Step 1: Process with assistant to get SQL query
      const assistantResult = await sqlClient.processWithAssistant(message);
      
      if (assistantResult.error) {
        throw new Error(`Assistant error: ${assistantResult.error}`);
      }

      // Step 2: Extract SQL from assistant result
      let sqlQuery = '';
      if (assistantResult.sql) {
        sqlQuery = assistantResult.sql;
      } else if (assistantResult.preview) {
        // Try to extract SQL from preview text
        const sqlMatch = assistantResult.preview.match(/```sql\s*([\s\S]*?)\s*```/i);
        if (sqlMatch) {
          sqlQuery = sqlMatch[1].trim();
        }
      }

      if (!sqlQuery) {
        // If no SQL found, return the assistant's response directly
        botResponse = assistantResult.preview || 'No response generated';
      } else {
        // Step 3: Execute the SQL query
        console.log('Executing SQL query:', sqlQuery);
        const sqlResult = await sqlClient.executeSQL(sqlQuery);
        
        if (sqlResult.success) {
          // Format the results using the interactive formatter
          const columns = sqlResult.columns || [];
          const rows = sqlResult.data || [];
          const rowCount = sqlResult.row_count || 0;
          
          // Determine table type based on query or columns
          let tableType = 'records';
          if (columns.some(col => ['customer_id', 'first_name', 'last_name', 'email'].includes(col))) {
            tableType = 'customers';
          } else if (columns.some(col => ['product_id', 'product_name', 'price'].includes(col))) {
            tableType = 'products';
          } else if (columns.some(col => ['order_id', 'order_date', 'total_price'].includes(col))) {
            tableType = 'orders';
          }
          
          // Check if user asked for full list
          const isFullListRequest = message.toLowerCase().includes('full list') || 
                                   message.toLowerCase().includes('complete list') ||
                                   message.toLowerCase().includes('all details') ||
                                   message.toLowerCase().includes('show all');
          
          // Use the simple formatter (no summary/insights) for frontend display
          botResponse = DataFormatter.createSimpleFormattedResponse(rows, columns, rowCount, tableType, isFullListRequest);
          
          // Add download link if there are many rows
          if (rowCount > 20) {
            downloadLink = `${process.env.FASTAPI_URL || 'http://localhost:8000'}/downloads/export.xlsx`;
          }
        } else {
          throw new Error(`SQL execution failed: ${sqlResult.error}`);
        }
      }
      
    } catch (error: any) {
      console.error('SQL Client middleware error:', error);
      botResponse = `Error: ${error.message}`;
    }

    // Save bot response to database
    await db.execute(
      'INSERT INTO chat_messages (chat_id, message, sender, route) VALUES (?, ?, ?, ?)',
      [chatId, botResponse, 'bot', route || 'general']
    );

    return NextResponse.json({ 
      output: botResponse,
      download_link: downloadLink
    });
  } catch (error) {
    console.error('Chat Middleware Error:', error);
    return NextResponse.json({ 
      output: "Sorry, an error occurred while processing your message.",
      error: process.env.NODE_ENV === 'development' && error && typeof error === 'object' && 'message' in error ? (error as { message: string }).message : undefined
    }, { status: 500 });
  }
}
