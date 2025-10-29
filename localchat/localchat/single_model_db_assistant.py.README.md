# Single Model Database Assistant

## File: `single_model_db_assistant.py`

### Overview
This is the core module of the SonyCentral AI database assistant. It provides a simplified pipeline that uses a single LLM to understand natural language queries, generate SQL, execute queries safely, and present results in a user-friendly format.

### Purpose
- **Natural Language to SQL**: Convert user questions to SQL queries
- **Safe Query Execution**: Execute SQL with safety checks
- **Result Presentation**: Format results for easy understanding
- **Export Capabilities**: Export results to Excel/CSV formats
- **Learning Integration**: Integrate with learning system for improvement

### Key Components

#### 1. SingleModelDBAssistant Class
```python
class SingleModelDBAssistant:
    def __init__(self, model=None, base_url=None, temperature=0.1, api_url="http://localhost:8000", embedded_mode=False):
        # Initialize LLM and database connections
        # Set up configuration
        # Prepare for query processing
```

**Core Features:**
- **LLM Integration**: Uses configured language model
- **Database Connection**: Connects to MySQL database
- **Safety Checks**: Validates SQL before execution
- **Export Support**: Generates Excel/CSV exports

#### 2. Query Processing Pipeline
```python
def ask(self, question, show_sql=False, show_rows=20, include_json=False, json_only=False):
    """Main method to process natural language queries"""
```

**Processing Steps:**
1. **Question Analysis**: Understand user intent
2. **SQL Generation**: Convert to SQL using LLM
3. **Safety Validation**: Check SQL for safety
4. **Execution**: Run SQL against database
5. **Result Formatting**: Present results clearly
6. **Export Generation**: Create downloadable files

#### 3. SQL Generation
```python
def generate_sql(self, question):
    """Generate SQL from natural language question"""
```

**Generation Process:**
- **Context Building**: Include database schema context
- **Prompt Construction**: Create detailed prompts
- **LLM Processing**: Use language model to generate SQL
- **Validation**: Check SQL syntax and safety

#### 4. Result Processing
```python
def execute_sql(self, sql):
    """Execute SQL and return formatted results"""
```

**Execution Features:**
- **Safe Execution**: Prevent dangerous operations
- **Error Handling**: Graceful error management
- **Result Formatting**: Clean, readable output
- **Data Export**: Support for Excel/CSV export

### Key Methods

#### 1. Main Query Interface
```python
def ask(self, question, show_sql=False, show_rows=20, include_json=False, json_only=False):
    """Process natural language database queries"""
```

**Parameters:**
- `question`: Natural language question
- `show_sql`: Display generated SQL
- `show_rows`: Number of rows to display
- `include_json`: Include JSON format
- `json_only`: Return only JSON

#### 2. Explained Queries
```python
def ask_explained(self, question, show_rows=20):
    """Get detailed explanation of query and results"""
```

**Features:**
- **Step-by-Step**: Explain each query step
- **SQL Explanation**: Describe what SQL does
- **Result Analysis**: Interpret results
- **Learning Integration**: Feed back to learning system

#### 3. Export Functionality
```python
def _export_full_results_to_excel(self):
    """Export full results to Excel file"""
```

**Export Options:**
- **Excel Format**: `.xlsx` files with formatting
- **CSV Format**: `.csv` files for data processing
- **Full Results**: All rows, not just preview
- **Automatic Naming**: Timestamped filenames

### Database Integration

#### Supported Operations
- **SELECT Queries**: Data retrieval
- **Aggregations**: COUNT, SUM, AVG, etc.
- **Joins**: Multi-table queries
- **Filtering**: WHERE clauses
- **Sorting**: ORDER BY clauses
- **Grouping**: GROUP BY operations

#### Safety Features
- **Read-Only**: Only SELECT statements allowed
- **SQL Injection Prevention**: Parameterized queries
- **Query Validation**: Check for dangerous operations
- **Timeout Protection**: Prevent long-running queries

### Usage Examples

#### Basic Query
```python
from single_model_db_assistant import SingleModelDBAssistant

# Initialize assistant
assistant = SingleModelDBAssistant()

# Ask a question
result = assistant.ask("How many orders do we have?")
print(result)
```

#### Detailed Explanation
```python
# Get detailed explanation
explanation = assistant.ask_explained("What are our top customers?")
print(explanation)
```

#### Export Results
```python
# Ask question with export
result = assistant.ask("Show me all customers", show_rows=100)

# Check if export was created
if result.get("download_link"):
    print(f"Download: {result['download_link']}")
```

### File Relationships

#### **Imported By:**
- `db_assistant_api.py` - FastAPI endpoints
- `sql_api.py` - SQL API endpoints
- `learning_system.py` - Learning integration

#### **Imports:**
- `dynamic_database_config` - Database schema context
- `llm_config` - LLM configuration
- `json`, `requests` - Data processing
- `typing` - Type hints

### Configuration Options

#### LLM Configuration
```python
# Model settings
model = "qwen3:4b"           # Model name
base_url = "http://localhost:11434"  # Ollama server
temperature = 0.1            # Response creativity
```

#### Database Settings
```python
# Database connection
api_url = "http://localhost:8000"  # Database API
embedded_mode = False              # Standalone mode
```

#### Query Settings
```python
# Query parameters
show_sql = True              # Show generated SQL
show_rows = 20              # Number of rows to display
include_json = False        # Include JSON format
json_only = False           # Return only JSON
```

### Error Handling

#### Query Errors
```python
try:
    result = assistant.ask("Invalid question")
except Exception as e:
    print(f"Query failed: {e}")
    # Handle gracefully
```

#### Database Errors
```python
# Check database connection
if not assistant._is_connected():
    print("Database not connected")
    return None
```

#### LLM Errors
```python
# Check LLM availability
if assistant.llm is None:
    print("LLM not configured")
    return None
```

### Performance Considerations

#### Query Optimization
- **Row Limits**: Limit result sets for performance
- **Index Usage**: Encourage index usage in queries
- **Timeout Settings**: Prevent long-running queries
- **Connection Pooling**: Efficient database connections

#### LLM Performance
- **Model Size**: Larger models = better quality, slower
- **Temperature**: Lower = faster, more consistent
- **Context Length**: Longer context = better understanding, slower

### Security Features

#### SQL Injection Prevention
- **Parameterized Queries**: Use placeholders for values
- **Input Validation**: Validate user input
- **Query Sanitization**: Clean dangerous characters
- **Read-Only Access**: Only SELECT statements allowed

#### Data Protection
- **Sensitive Data**: Avoid exposing sensitive information
- **Access Control**: Limit database access
- **Audit Logging**: Log all queries for security
- **Result Filtering**: Filter sensitive results

### Troubleshooting

#### Common Issues
1. **LLM Not Responding**: Check Ollama server status
2. **Database Connection Failed**: Verify database credentials
3. **SQL Generation Errors**: Check database schema
4. **Export Failures**: Verify file permissions

#### Debug Mode
```python
# Enable verbose logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Test components
assistant = SingleModelDBAssistant()
print(f"LLM configured: {assistant.llm is not None}")
print(f"Database connected: {assistant._is_connected()}")
```

### Learning Integration

#### Query Learning
```python
# Feed successful queries to learning system
if result["success"]:
    learning_system.learn_from_query(question, sql, result)
```

#### Pattern Recognition
```python
# Learn from user patterns
learning_system.analyze_query_patterns(queries)
```

### Future Enhancements
- **Multi-Model Support**: Support multiple LLMs
- **Query Caching**: Cache common queries
- **Advanced Analytics**: Statistical analysis of results
- **Real-time Learning**: Continuous improvement from usage

### Related Files
- `dynamic_database_config.py` - Database schema context
- `llm_config.py` - LLM configuration
- `learning_system.py` - Learning and improvement
- `db_assistant_api.py` - API endpoints
- `sql_api.py` - SQL execution API
