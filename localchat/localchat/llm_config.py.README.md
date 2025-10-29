# LLM Configuration Module

## File: `llm_config.py`

### Overview
This module provides centralized configuration for the Language Learning Model (LLM) used throughout the SonyCentral project. It manages connection settings, model parameters, and provides a unified interface for LLM initialization.

### Purpose
- **Centralized Configuration**: Single source of truth for LLM settings
- **Model Management**: Configure Ollama LLM instances
- **Environment Flexibility**: Support for different models and endpoints
- **Compatibility**: Maintains compatibility with LangChain ecosystem

### Key Components

#### 1. LLM Configuration (`LLM_CONFIG`)
```python
LLM_CONFIG = {
    "base_url": "https://7ab6cb2be8de.ngrok-free.app", 
    "model": "qwen3:4b",
    "temperature": 0.1,
    "max_tokens": 4096,
}
```
- **base_url**: Ollama server endpoint
- **model**: Default model name (qwen3:4b)
- **temperature**: Controls randomness (0.1 = more deterministic)
- **max_tokens**: Maximum response length

#### 2. Agent Configuration (`AGENT_CONFIG`)
```python
AGENT_CONFIG = {
    "max_iterations": 10,
    "return_intermediate_steps": False,
    "top_k": 5,
    "verbose": True,
    "early_stopping_method": "force",
    "max_execution_time": 120,
}
```
- **max_iterations**: Maximum agent execution steps
- **early_stopping_method**: How to handle timeouts
- **max_execution_time**: Timeout in seconds

#### 3. LLM Factory Function
```python
def get_single_llm(model: str | None = None, base_url: str | None = None, temperature: float | None = None):
```
- Creates configured Ollama LLM instances
- Supports parameter overrides
- Handles missing dependencies gracefully

### Dependencies
- `langchain_ollama`: Ollama integration for LangChain
- `langchain`: Core LangChain framework

### Usage Examples

#### Basic Usage
```python
from llm_config import get_single_llm

# Use default configuration
llm = get_single_llm()

# Override specific parameters
llm = get_single_llm(
    model="llama2:7b",
    temperature=0.3
)
```

#### In Database Assistant
```python
from llm_config import LLM_CONFIG, get_single_llm

# Access configuration
base_url = LLM_CONFIG["base_url"]
model = LLM_CONFIG["model"]

# Create LLM instance
llm = get_single_llm()
```

### File Relationships

#### **Imported By:**
- `single_model_db_assistant.py` - Main database assistant
- `dynamic_database_config.py` - Schema analysis
- `learning_system.py` - Learning components
- `db_assistant_api.py` - API endpoints

#### **Imports:**
- `langchain_ollama.OllamaLLM` - Core LLM class

### Configuration Options

#### Model Selection
- **qwen3:4b**: Fast, lightweight model (default)
- **llama2:7b**: Balanced performance
- **llama2:13b**: Higher quality, slower
- **codellama**: Code-specific model

#### Temperature Settings
- **0.0**: Completely deterministic
- **0.1**: Very consistent (default)
- **0.3**: Balanced creativity
- **0.7**: More creative responses

#### Base URL Options
- **Local**: `http://localhost:11434`
- **Remote**: `https://your-ollama-server.com`
- **Ngrok**: `https://tunnel.ngrok.io` (for development)

### Environment Variables
```bash
# Optional environment overrides
export OLLAMA_BASE_URL="http://localhost:11434"
export OLLAMA_MODEL="llama2:7b"
export OLLAMA_TEMPERATURE="0.3"
```

### Error Handling
- **Missing Dependencies**: Returns `None` if `langchain_ollama` not installed
- **Connection Errors**: Handled by calling code
- **Invalid Parameters**: Uses defaults for invalid values

### Performance Considerations
- **Model Size**: Larger models = better quality, slower responses
- **Temperature**: Lower = faster, more consistent
- **Max Tokens**: Higher = longer responses, more memory
- **Base URL**: Local = faster, Remote = more flexible

### Troubleshooting

#### Common Issues
1. **Import Error**: Install `langchain-ollama`
   ```bash
   pip install langchain-ollama
   ```

2. **Connection Error**: Check Ollama server
   ```bash
   curl http://localhost:11434/api/tags
   ```

3. **Model Not Found**: Pull the model
   ```bash
   ollama pull qwen3:4b
   ```

#### Debug Mode
```python
# Enable verbose logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Test connection
llm = get_single_llm()
if llm:
    print("LLM configured successfully")
else:
    print("LLM configuration failed")
```

### Security Considerations
- **Base URL**: Use HTTPS in production
- **Model Access**: Restrict model access as needed
- **API Keys**: Store securely if using cloud services
- **Rate Limiting**: Implement if using shared resources

### Future Enhancements
- **Model Switching**: Dynamic model selection
- **Load Balancing**: Multiple Ollama instances
- **Caching**: Response caching for common queries
- **Metrics**: Performance monitoring and logging

### Related Files
- `single_model_db_assistant.py` - Uses this configuration
- `dynamic_database_config.py` - Schema analysis with LLM
- `learning_system.py` - Learning with LLM
- `db_assistant_api.py` - API endpoints using LLM
