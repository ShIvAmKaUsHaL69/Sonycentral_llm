# SQL Query API

A simple FastAPI-based API that accepts SQL queries and returns database results in JSON format.

## 🚀 Features

- **SQL Query Execution**: Execute SELECT queries against the database
- **Security**: Only allows SELECT queries for safety
- **JSON Response**: Returns structured data in JSON format
- **Health Check**: Monitor API and database status
- **Error Handling**: Comprehensive error handling and logging

## 📋 Requirements

Install the required dependencies:

```bash
pip install -r requirements_sql_api.txt
```

## 🏃‍♂️ Running the API

Start the API server:

```bash
python sql_api.py
```

The API will be available at:
- **API**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 📡 API Endpoints

### 1. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "message": "API is running and database is accessible"
}
```

### 2. Execute SQL Query
```http
POST /execute
Content-Type: application/json

{
  "query": "SELECT * FROM your_table LIMIT 10"
}
```

**Response:**
```json
{
  "success": true,
  "query": "SELECT * FROM your_table LIMIT 10",
  "columns": ["id", "name", "email"],
  "row_count": 10,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  ]
}
```

## 🧪 Testing

### Using Python
```bash
python test_api_simple.py
```

### Using PowerShell
```powershell
# Health check
Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET

# Execute query
Invoke-WebRequest -Uri "http://localhost:8000/execute" -Method POST -ContentType "application/json" -Body '{"query": "SELECT 1 as test_value"}'
```

### Using curl
```bash
# Health check
curl http://localhost:8000/health

# Execute query
curl -X POST http://localhost:8000/execute \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT 1 as test_value"}'
```

## 🔒 Security Features

- **SELECT Only**: Only SELECT queries are allowed
- **SQL Injection Protection**: Uses parameterized queries
- **Error Sanitization**: Sensitive information is not exposed in errors

## 📊 Example Queries

```sql
-- Get table count
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'staging_central_hub'

-- List tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'staging_central_hub'

-- Get table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'staging_central_hub' 
AND table_name = 'your_table'
```

## 🛠️ Client Usage

Use the provided `sql_client.py` for easy integration:

```python
from sql_client import SQLAPIClient

client = SQLAPIClient("http://localhost:8000")

# Health check
health = client.health_check()

# Execute query
result = client.execute_sql("SELECT 1 as test")

# Get tables
tables = client.get_tables()

# Describe table
table_info = client.describe_table("your_table")
```

## 📝 Error Handling

The API returns appropriate HTTP status codes:

- **200**: Success
- **400**: Bad Request (invalid query, non-SELECT query)
- **500**: Internal Server Error (database connection issues)

Error responses include:
```json
{
  "success": false,
  "error": "Error message",
  "query": "SELECT * FROM invalid_table"
}
```

## 🔧 Configuration

The API uses the existing `DynamicDatabaseManager` from `dynamic_database_config.py` for database connections. Make sure your database configuration is properly set up.

## 📁 Files

- `sql_api.py` - Main API server
- `test_api_simple.py` - Test script
- `sql_client.py` - Python client
- `requirements_sql_api.txt` - Dependencies
- `SQL_API_README.md` - This documentation
