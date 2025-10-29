# Database Assistant API

## Overview
`db_assistant_api.py` is the main FastAPI application that provides AI-powered database querying capabilities. It serves as the backend API for natural language database interactions.

## Functionality
- **Natural Language Queries**: Convert user questions to SQL queries
- **Data Export**: Export query results to Excel/CSV formats
- **Query Explanation**: Provide detailed explanations of generated SQL
- **Result Preview**: Show limited preview of large datasets
- **File Downloads**: Serve exported files to users

## Key Features

### 🔍 Query Processing
- Accepts natural language questions via GET/POST endpoints
- Generates SQL queries using AI models
- Executes queries against the database
- Returns formatted results with preview limits

### 📊 Data Export
- Automatically exports large result sets to Excel files
- Provides download links for exported files
- Handles file serving through `/downloads/{filename}` endpoint

### 🤖 AI Integration
- Uses `ThreeModelDBAssistant` for query processing
- Supports multiple AI models via Ollama
- Provides fallback mechanisms for AI failures

## API Endpoints

### GET `/ask`
- **Purpose**: Process natural language database queries
- **Parameters**: 
  - `q` (string): Natural language question
  - `preview_rows` (int, optional): Number of rows to preview (1-100, default: 20)
- **Returns**: JSON with preview text and optional download link

### POST `/ask`
- **Purpose**: Same as GET but accepts JSON payload
- **Body**: `{"q": "question", "preview_rows": 20}`
- **Returns**: Same as GET endpoint

### GET `/ask_explain`
- **Purpose**: Get detailed explanation of query processing
- **Parameters**: Same as `/ask`
- **Returns**: Detailed explanation with SQL and reasoning

### POST `/ask_explain`
- **Purpose**: Same as GET but accepts JSON payload
- **Body**: `{"q": "question", "preview_rows": 20}`
- **Returns**: Detailed explanation with download link

### GET `/downloads/{filename}`
- **Purpose**: Download exported files
- **Parameters**: `filename` - Name of the exported file
- **Returns**: File download or 404 if not found

## Dependencies

### Core Dependencies
- **FastAPI**: Web framework for API endpoints
- **ThreeModelDBAssistant**: AI-powered database assistant
- **Pydantic**: Data validation and serialization

### Related Files
- `localchat/localchat/three_model_db_assistant.py` - Core AI assistant
- `localchat/localchat/dynamic_database_config.py` - Database configuration
- `localchat/localchat/llm_config.py` - AI model configuration

## Configuration

### Environment Variables
- `OLLAMA_BASE_URL`: Base URL for Ollama AI service
- Database connection handled by `ThreeModelDBAssistant`

### AI Model Configuration
- Model: `qwen3:4b` (configurable)
- Temperature: 0.1
- Max tokens: 4096

## Error Handling

### Fallback Mechanisms
1. **Primary Path**: AI-powered query processing
2. **Fallback Path**: Direct SQL generation without AI summarization
3. **Error Response**: JSON error messages with status codes

### Error Types
- Database connection errors
- SQL generation failures
- AI model unavailability
- File export errors

## Usage Examples

### Basic Query
```bash
curl "http://localhost:8000/ask?q=Show me all customers from last month"
```

### With Preview Limit
```bash
curl "http://localhost:8000/ask?q=List all orders&preview_rows=50"
```

### POST Request
```bash
curl -X POST "http://localhost:8000/ask" \
  -H "Content-Type: application/json" \
  -d '{"q": "What are the top selling products?", "preview_rows": 10}'
```

## Response Format

### Successful Query
```json
{
  "preview": "Preview (list):\n- 1. customer_id: 123; name: John Doe; email: john@example.com\n...",
  "download_link": "/downloads/export_20241201_143022.xlsx"
}
```

### Error Response
```json
{
  "error": "Database connection failed"
}
```

## File Relationships

### Imports
- `ThreeModelDBAssistant` from `localchat.localchat.three_model_db_assistant`
- FastAPI components for web framework
- Pydantic for data models

### Exports
- FastAPI app instance
- Database assistant instance
- File download functionality

## Performance Considerations

### Query Optimization
- Preview limits prevent large result sets from overwhelming the system
- Automatic export for datasets exceeding preview limits
- Connection pooling handled by database assistant

### Memory Management
- Results stored temporarily for export
- File cleanup handled by the system
- Connection management through database assistant

## Security

### File Access
- Only serves files from designated exports directory
- Validates file existence before serving
- Prevents directory traversal attacks

### Input Validation
- Pydantic models validate all inputs
- SQL injection prevention through parameterized queries
- Preview row limits prevent resource exhaustion

## Monitoring and Logging

### Logging Points
- Database connection status
- Query execution times
- Export file generation
- Error occurrences

### Metrics
- Query success rate
- Average response time
- Export file generation time
- Error frequency by type

## Development

### Adding New Endpoints
1. Define Pydantic models for request/response
2. Create FastAPI route handlers
3. Implement business logic
4. Add error handling
5. Update documentation

### Testing
- Unit tests for individual functions
- Integration tests for API endpoints
- Load testing for performance
- Error scenario testing

## Deployment

### Production Setup
1. Configure environment variables
2. Set up Ollama service
3. Configure database connections
4. Set up file storage for exports
5. Configure reverse proxy

### Scaling
- Multiple worker processes
- Load balancing
- Database connection pooling
- File storage optimization
