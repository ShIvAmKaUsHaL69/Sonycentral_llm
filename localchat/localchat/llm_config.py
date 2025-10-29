"""
LLM configuration for single-model pipeline.
Provides base URL and a single model name used across the app.
"""

# Base LLM connection/config
LLM_CONFIG = {
    "base_url": "https://43b7bb1d8123.ngrok-free.app", 
    "model": "qwen3:4b",
    "temperature": 0.1,
    "max_tokens": 4096,
}

# Lightweight agent/runtime toggles retained for compatibility
AGENT_CONFIG = {
    "max_iterations": 10,
    "return_intermediate_steps": False,
    "top_k": 5,
    "verbose": True,
    "early_stopping_method": "force",
    "max_execution_time": 120,
}

# Minimal helper to obtain an Ollama LLM instance where needed
try:
    from langchain_ollama import OllamaLLM  # type: ignore
except Exception:  # pragma: no cover
    OllamaLLM = None  # type: ignore


def get_single_llm(model: str | None = None, base_url: str | None = None, temperature: float | None = None):
    """Return a configured single LLM instance.
    Relies on langchain_ollama. Callers should handle None if not installed.
    """
    if OllamaLLM is None:
        return None
    cfg = LLM_CONFIG
    return OllamaLLM(
        model=model or cfg.get("model"),
        base_url=base_url or cfg.get("base_url"),
        temperature=temperature if temperature is not None else cfg.get("temperature", 0.1),
    )
