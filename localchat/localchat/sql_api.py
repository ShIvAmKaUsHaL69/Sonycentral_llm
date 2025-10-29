#!/usr/bin/env python3
"""
Simple SQL API - Execute SQL queries and return results
"""

import json
import traceback
import os
import sys
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
import mysql.connector

# Add the current directory to Python path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from single_model_db_assistant import SingleModelDBAssistant

# Initialize FastAPI app
app = FastAPI(
    title="SQL Query API",
    description="Execute SQL queries against the database and return results",
    version="1.0.0"
)

# Global database connection
db_connection = None

# Initialize the SingleModelDBAssistant
assistant = None

def get_db_connection():
    """Get database connection using mysql.connector"""
    global db_connection
    if db_connection is None or not db_connection.is_connected():
        try:
            # Get connection details from environment or use defaults
            host = os.getenv("DB_HOST", "43.225.53.118")
            user = os.getenv("DB_USER", "staging_sony_centeral")
            password = os.getenv("DB_PASSWORD", "sony_centeralsony_centeral")
            database = os.getenv("DB_NAME", "staging_central_hub")
            
            db_connection = mysql.connector.connect(
                host=host,
                user=user,
                password=password,
                database=database,
                ssl_disabled=True
            )
            print("✅ Database connection established successfully!")
        except mysql.connector.Error as e:
            print(f"❌ Failed to connect to database: {e}")
            raise e
    return db_connection

@app.on_event("startup")
async def startup_event():
    """Initialize database connection and assistant on startup"""
    global assistant
    try:
        print("🔌 Initializing database connection...")
        get_db_connection()
        print("✅ Database connection established successfully!")
        
        print("🤖 Initializing SingleModelDBAssistant...")
        assistant = SingleModelDBAssistant(embedded_mode=True)
        print("✅ SingleModelDBAssistant initialized successfully!")
    except Exception as e:
        print(f"❌ Failed to initialize: {e}")
        raise e

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "SQL Query API is running!",
        "endpoints": {
            "/execute": "POST - Execute SQL query",
            "/health": "GET - Health check",
            "/docs": "GET - API documentation"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        if conn is None:
            return {"status": "error", "message": "Database not initialized"}
        
        # Test database connection
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        cursor.close()
        
        return {
            "status": "healthy",
            "database": "connected",
            "message": "API is running and database is accessible"
        }
    except Exception as e:
        return {
            "status": "error",
            "database": "disconnected",
            "message": f"Database connection failed: {str(e)}"
        }

def run_query(query: str) -> List[Dict[str, Any]]:
    """Execute SQL query and return results as list of dictionaries"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)  # dictionary=True gives column names
        cursor.execute(query)
        results = cursor.fetchall()
        cursor.close()
        return results
    except mysql.connector.Error as e:
        print(f"MySQL Error: {e}")
        raise e

@app.post("/execute")
async def execute_sql(query_data: Dict[str, Any]):
    """Execute SQL query and return results"""
    try:
        # Extract SQL query from request
        sql_query = query_data.get("query", "").strip()
        if not sql_query:
            raise HTTPException(status_code=400, detail="No SQL query provided")
        
        # Basic security check - only allow SELECT queries
        sql_upper = sql_query.upper().strip()
        if not sql_upper.startswith("SELECT"):
            raise HTTPException(
                status_code=400, 
                detail="Only SELECT queries are allowed for security reasons"
            )
        
        print(f"🔍 Executing SQL: {sql_query}")
        
        # Execute query using direct MySQL connector
        results = run_query(sql_query)
        
        # Extract columns from first result if available
        columns = []
        if results:
            columns = list(results[0].keys())
        
        print(f"✅ Query executed successfully, returned {len(results)} rows")
        
        return {
            "success": True,
            "query": sql_query,
            "columns": columns,
            "row_count": len(results),
            "data": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"SQL execution failed: {str(e)}"
        print(f"❌ {error_msg}")
        print(f"Traceback: {traceback.format_exc()}")
        
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": error_msg,
                "query": sql_query if 'sql_query' in locals() else "Unknown"
            }
        )

@app.post("/ask")
async def ask_question(request_data: Dict[str, Any]):
    """Ask a natural language question and get SQL results with context"""
    global assistant
    try:
        if assistant is None:
            raise HTTPException(status_code=500, detail="Assistant not initialized")
        
        question = request_data.get("q", "").strip()
        preview_rows = request_data.get("preview_rows", 20)
        
        if not question:
            raise HTTPException(status_code=400, detail="No question provided")
        
        # Use the assistant to process the question with context
        result = assistant.ask(question, show_rows=preview_rows)
        
        if "error" in result:
            return JSONResponse(
                status_code=500,
                content={"error": result["error"]}
            )
        
        # Format the response similar to the original API
        return {
            "preview": f"🤖 Processing: {question}\n\n📝 Generated SQL:\n{result.get('sql', 'N/A')}\n\n🚀 Executing query via API...\n\n📊 Query Results ({result.get('row_count', 0)} rows):\n{result.get('formatted_results', 'No results')}",
            "sql": result.get("sql"),
            "columns": result.get("columns", []),
            "row_count": result.get("row_count", 0),
            "data": result.get("rows", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Failed to process question: {str(e)}"
        print(f"❌ {error_msg}")
        print(f"Traceback: {traceback.format_exc()}")
        
        return JSONResponse(
            status_code=500,
            content={"error": error_msg}
        )

if __name__ == "__main__":
    print("🚀 Starting SQL Query API...")
    print("🌐 API will be available at: http://localhost:8000")
    print("📚 Documentation: http://localhost:8000/docs")
    print("=" * 50)
    
    uvicorn.run(
        "sql_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
