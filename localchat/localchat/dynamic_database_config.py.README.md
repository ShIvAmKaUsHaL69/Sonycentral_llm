# Dynamic Database Configuration Module

## File: `dynamic_database_config.py`

### Overview
This module provides intelligent database schema understanding and dynamic configuration for the SonyCentral project. It analyzes database structures, generates context-aware prompts, and enables natural language database interactions.

### Purpose
- **Schema Analysis**: Automatically understand database structure
- **Context Generation**: Create prompts with database context
- **Dynamic Queries**: Generate SQL based on schema understanding
- **Relationship Mapping**: Understand table relationships and constraints

### Key Components

#### 1. DynamicDatabaseManager Class
```python
class DynamicDatabaseManager:
    def __init__(self, connection_string=None):
        # Initialize with database connection
        # Analyze schema automatically
        # Generate context prompts
```

**Features:**
- **Auto-Connection**: Connects to database on initialization
- **Schema Analysis**: Analyzes table structures and relationships
- **Context Generation**: Creates rich database descriptions
- **Error Handling**: Graceful connection failure handling

#### 2. Database Connection
```python
def _get_default_connection(self):
    return os.getenv(
        "DATABASE_URL",
        "mysql+mysqlconnector://staging_sony_centeral:sony_centeralsony_centeral@43.225.53.118/staging_central_hub?ssl_disabled=True"
    )
```

**Connection Features:**
- **Environment Variables**: Configurable via `DATABASE_URL`
- **SSL Support**: Handles SSL connections
- **Connection Pooling**: Efficient connection management
- **Error Recovery**: Automatic reconnection attempts

#### 3. Schema Analysis
```python
def _analyze_schema(self):
    # Analyze table structures
    # Understand relationships
    # Generate context descriptions
    # Map constraints and indexes
```

**Analysis Capabilities:**
- **Table Discovery**: Find all tables and views
- **Column Analysis**: Understand data types and constraints
- **Relationship Mapping**: Foreign key relationships
- **Index Analysis**: Performance optimization insights

#### 4. Context Generation
```python
def get_database_description_prompt(self):
    # Generate comprehensive database description
    # Include table relationships
    # Add usage examples
    # Provide query patterns
```

**Context Features:**
- **Rich Descriptions**: Detailed table and column information
- **Relationship Mapping**: How tables connect
- **Usage Examples**: Common query patterns
- **Business Logic**: Domain-specific insights

### Database Schema Understanding

#### Supported Database Types
- **MySQL**: Primary database (SonyCentral)
- **PostgreSQL**: Supported via SQLAlchemy
- **SQLite**: Development and testing
- **SQL Server**: Enterprise environments

#### Schema Information Captured
```python
schema_info = {
    "tables": {
        "orders": {
            "columns": ["order_id", "customer_id", "total_price"],
            "relationships": ["customers", "order_items"],
            "constraints": ["PRIMARY KEY", "FOREIGN KEY"]
        }
    },
    "relationships": {
        "orders -> customers": "one-to-many",
        "orders -> order_items": "one-to-many"
    }
}
```

### Key Functions

#### 1. Database Description Generation
```python
def get_database_description_prompt(self):
    """Generate comprehensive database description for LLM context"""
```

**Output Format:**
- **Table Descriptions**: Each table with columns and purpose
- **Relationship Mapping**: How tables connect
- **Business Context**: Domain-specific information
- **Query Examples**: Common usage patterns

#### 2. Schema Analysis
```python
def _analyze_schema(self):
    """Analyze database schema and build understanding"""
```

**Analysis Steps:**
1. **Table Discovery**: Find all accessible tables
2. **Column Analysis**: Understand data types and constraints
3. **Relationship Detection**: Map foreign key relationships
4. **Index Analysis**: Identify performance optimizations
5. **Constraint Mapping**: Understand business rules

#### 3. Connection Management
```python
def _connect(self):
    """Establish database connection with error handling"""
```

**Connection Features:**
- **Automatic Retry**: Retry failed connections
- **SSL Configuration**: Handle SSL connections
- **Connection Pooling**: Efficient resource usage
- **Error Logging**: Detailed error information

### Usage Examples

#### Basic Usage
```python
from dynamic_database_config import DynamicDatabaseManager

# Initialize with default connection
db_manager = DynamicDatabaseManager()

# Get database description
description = db_manager.get_database_description_prompt()
print(description)
```

#### Custom Connection
```python
# Use custom connection string
connection_string = "mysql+mysqlconnector://user:pass@host/db"
db_manager = DynamicDatabaseManager(connection_string)
```

#### Schema Analysis
```python
# Analyze specific tables
db_manager._analyze_schema()

# Get table information
tables = db_manager.schema_info.get("tables", {})
for table_name, table_info in tables.items():
    print(f"Table: {table_name}")
    print(f"Columns: {table_info['columns']}")
```

### File Relationships

#### **Imported By:**
- `single_model_db_assistant.py` - Main database assistant
- `learning_system.py` - Learning components
- `db_assistant_api.py` - API endpoints

#### **Imports:**
- `langchain_community.utilities.SQLDatabase` - Database utilities
- `tabulate` - Table formatting
- `os`, `ssl`, `time`, `re` - System utilities

### Configuration Options

#### Database Connection
```python
# Environment variable
DATABASE_URL="mysql+mysqlconnector://user:pass@host/db"

# Connection parameters
{
    "sample_rows_in_table_info": 15,  # Rows for schema understanding
    "include_tables": None,           # All tables
    "max_string_length": 5000         # Prevent truncation
}
```

#### Schema Analysis Settings
```python
# Analysis parameters
{
    "sample_rows": 15,        # Rows to sample per table
    "max_string_length": 5000, # Maximum string length
    "include_views": True,    # Include database views
    "analyze_indexes": True   # Analyze database indexes
}
```

### Error Handling

#### Connection Errors
```python
try:
    db_manager = DynamicDatabaseManager()
except Exception as e:
    print(f"Database connection failed: {e}")
    # Handle gracefully
```

#### Schema Analysis Errors
```python
if db_manager.db is None:
    print("Database not connected")
    return None
```

### Performance Considerations

#### Schema Analysis
- **Sample Size**: More rows = better understanding, slower analysis
- **Table Count**: More tables = longer analysis time
- **Relationship Complexity**: Complex relationships = more processing

#### Connection Management
- **Pool Size**: Larger pools = better concurrency
- **Timeout Settings**: Balance between responsiveness and reliability
- **SSL Overhead**: SSL connections are slower but more secure

### Security Considerations

#### Database Access
- **Credentials**: Store securely in environment variables
- **SSL**: Use SSL connections in production
- **Permissions**: Limit database user permissions
- **Network**: Restrict network access

#### Schema Information
- **Sensitive Data**: Avoid exposing sensitive column names
- **Business Logic**: Don't expose proprietary business rules
- **Access Control**: Limit schema access to authorized users

### Troubleshooting

#### Common Issues
1. **Connection Failed**: Check database credentials and network
2. **SSL Errors**: Configure SSL properly or disable if not needed
3. **Schema Analysis Slow**: Reduce sample rows or table count
4. **Memory Issues**: Limit max_string_length

#### Debug Mode
```python
# Enable detailed logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Test connection
db_manager = DynamicDatabaseManager()
if db_manager.db:
    print("Database connected successfully")
else:
    print("Database connection failed")
```

### Future Enhancements
- **Caching**: Cache schema analysis results
- **Incremental Updates**: Update schema changes incrementally
- **Multi-Database**: Support multiple database connections
- **Schema Versioning**: Track schema changes over time

### Related Files
- `single_model_db_assistant.py` - Uses schema context
- `learning_system.py` - Learns from schema patterns
- `db_assistant_api.py` - Exposes schema via API
- `llm_config.py` - LLM configuration for schema understanding
