"""
Single-Model DB Assistant

Simplified pipeline that uses one LLM to:
- Read schema context from `dynamic_database_config`
- Generate a single MySQL SQL query for a user question
- Execute safely and present results
"""

from __future__ import annotations

import json
import requests
from typing import Any, Dict, List, Optional, Tuple

from dynamic_database_config import (
    get_database_description_prompt,
)
from llm_config import LLM_CONFIG, get_single_llm


class SingleModelDBAssistant:
    def __init__(self, model: Optional[str] = None, base_url: Optional[str] = None, temperature: float = 0.1, api_url: str = "http://localhost:8000", embedded_mode: bool = False) -> None:
        self.api_url = api_url
        self.embedded_mode = embedded_mode
        self.model_name = model or LLM_CONFIG.get("model")
        self.base_url = base_url or LLM_CONFIG.get("base_url")
        self.temperature = temperature
        self.llm = get_single_llm(self.model_name, self.base_url, self.temperature)
        if self.llm is None:
            raise RuntimeError("langchain_ollama is not available. Please install langchain and langchain-ollama.")
        
        # Conversation memory for context-aware behavior
        self.conversation_history = []
        self.user_preferences = {
            "show_all_rows": False,  # User's preference for showing all rows
            "last_full_detail_request": None  # Track when user last asked for full details
        }
        
        # Test API connection only if not in embedded mode
        if not embedded_mode and not self._test_api_connection():
            raise RuntimeError(f"SQL API not accessible at {self.api_url}. Please start the API server first.")
        
        # Discover current database name for user visibility
        if embedded_mode:
            # In embedded mode, we'll get the database name from the database connection
            self.database_name = self._get_database_name_embedded() or "(unknown)"
        else:
            self.database_name = self._get_database_name() or "(unknown)"
        
        try:
            if embedded_mode:
                print(f"Model '{self.model_name}' initialized in embedded mode (Database: '{self.database_name}').")
            else:
                print(f"Model '{self.model_name}' connected to SQL API at '{self.api_url}' (Database: '{self.database_name}').")
        except Exception:
            pass

    def _test_api_connection(self) -> bool:
        """Test if the SQL API is accessible"""
        try:
            response = requests.get(f"{self.api_url}/health", timeout=5)
            return response.status_code == 200
        except Exception:
            return False

    def _get_database_name(self) -> Optional[str]:
        try:
            response = requests.post(
                f"{self.api_url}/execute",
                json={"query": "SELECT DATABASE() AS db"},
                timeout=10
            )
            if response.status_code == 200:
                result = response.json()
                if result.get("success") and result.get("data"):
                    db_name = result["data"][0].get("db")
                    return str(db_name) if db_name else None
        except Exception:
            pass
        return None

    def _get_database_name_embedded(self) -> Optional[str]:
        """Get the current database name in embedded mode"""
        try:
            # Import the database connection from the sql_api module
            import os
            database = os.getenv("DB_NAME", "staging_central_hub")
            return database
        except Exception:
            pass
        return None

    def _auto_fix_sql(self, sql: str, error_message: str) -> str:
        """Heuristic fixes for common MySQL column/table issues.
        - Map variant_count to products alias if used from variants alias
        - Prefer p.variant_count over pv.variant_count
        - Fix common column name mistakes
        - Avoid selecting sensitive columns
        """
        fixed = sql
        try:
            lower_err = (error_message or "").lower()
            
            # Fix wrong alias for variant_count
            if "unknown column" in lower_err and "variant_count" in lower_err:
                fixed = fixed.replace("pv.variant_count", "p.variant_count")
                fixed = fixed.replace("product_variants.variant_count", "products.variant_count")
            
            # Fix common column name mistakes
            if "unknown column" in lower_err:
                # Fix 'total' -> 'total_price' in orders table
                if "o.total" in fixed and "orders" in fixed.lower():
                    fixed = fixed.replace("o.total", "o.total_price")
                    fixed = fixed.replace("orders.total", "orders.total_price")
                
                # Fix 'name' -> 'first_name'/'last_name' in customers table
                if "c.name" in fixed and "customers" in fixed.lower():
                    fixed = fixed.replace("c.name", "CONCAT(c.first_name, ' ', c.last_name) AS name")
                
                # Fix 'id' -> proper primary key names
                if "o.id" in fixed and "orders" in fixed.lower():
                    fixed = fixed.replace("o.id", "o.order_id")
                if "c.id" in fixed and "customers" in fixed.lower():
                    fixed = fixed.replace("c.id", "c.customer_id")
                if "p.id" in fixed and "products" in fixed.lower():
                    fixed = fixed.replace("p.id", "p.product_id")

                # Map product name/title confusion
                # Use products.title (not products.name)
                if "products.name" in fixed or "p.name" in fixed:
                    fixed = fixed.replace("products.name", "products.title")
                    fixed = fixed.replace("p.name", "p.title")

                # Map order name/title confusion
                # Use orders.name (not orders.title)
                if "orders.title" in fixed or "o.title" in fixed:
                    fixed = fixed.replace("orders.title", "orders.name")
                    fixed = fixed.replace("o.title", "o.name")

                # Remove references to non-existent products.product_type
                try:
                    import re
                    # Remove from SELECT lists
                    fixed = re.sub(r"\s*,\s*(?:p\.|products\.)?product_type\b", "", fixed)
                    fixed = re.sub(r"\b(?:p\.|products\.)?product_type\s*,\s*", "", fixed)
                    # Replace bare occurrences to keep SQL valid
                    fixed = re.sub(r"\b(?:p\.|products\.)?product_type\b", "'' AS product_type", fixed)
                    # Strip WHERE predicates on product_type
                    fixed = re.sub(r"\s+(AND|WHERE)\s+(?:p\.|products\.)?product_type\s*=\s*('[^']*'|\d+)(\s|$)", r" \1 1=1 \3", fixed, flags=re.IGNORECASE)
                    # Clean WHERE 1=1 if it's the only condition
                    fixed = re.sub(r"WHERE\s+1=1\s*(ORDER BY|GROUP BY|LIMIT|$)", r"\1", fixed, flags=re.IGNORECASE)
                except Exception:
                    pass
            
            # Fix SQL syntax errors
            if "syntax error" in lower_err or "error in your sql syntax" in lower_err:
                import re
                
                # Fix INTERVAL syntax - remove quotes around numbers and fix spacing
                fixed = re.sub(r"INTERVAL\s+'(\d+)\s+(month|months|day|days|year|years)'", r"INTERVAL \1 \2", fixed, flags=re.IGNORECASE)
                # Also fix cases where there are extra spaces
                fixed = re.sub(r"INTERVAL\s+(\d+)\s+(month|months|day|days|year|years)", r"INTERVAL \1 \2", fixed, flags=re.IGNORECASE)
                
                # Fix CURRENT_TIMESTAMP to NOW() for better compatibility
                fixed = fixed.replace("CURRENT_TIMESTAMP", "NOW()")
                
                # Fix common MySQL syntax issues
                if "near 'GROUP BY" in lower_err or "GROUP BY" in fixed:
                    # Fix line break issues in GROUP BY and ORDER BY
                    fixed = re.sub(r"\n\s*GROUP BY\s*\n", " GROUP BY ", fixed)
                    fixed = re.sub(r"\n\s*ORDER BY\s*\n", " ORDER BY ", fixed)
                    # Also fix cases where there are line breaks in the middle
                    fixed = re.sub(r"GROUP BY\s*\n\s*", "GROUP BY ", fixed)
                    fixed = re.sub(r"ORDER BY\s*\n\s*", "ORDER BY ", fixed)
                
                # Simplify complex queries that might cause syntax errors
                if "UNION ALL" in fixed and "GROUP BY" in fixed:
                    # Extract just the first SELECT statement before UNION ALL
                    first_select = fixed.split("UNION ALL")[0].strip()
                    if first_select:
                        fixed = first_select
                        # Add ORDER BY if not present
                        if "ORDER BY" not in fixed:
                            fixed += "\nORDER BY customer_count DESC"
            
            # Guard against selecting sensitive columns
            if "access_token" in fixed:
                fixed = fixed.replace("stores.access_token,", "").replace(", stores.access_token", "")
                fixed = fixed.replace("stores.access_token", "")
            
            return fixed
        except Exception:
            return sql

    def _schema_prompt(self) -> str:
        # Prefer dynamic live schema; append snapshot only as supplemental context
        try:
            dynamic = get_database_description_prompt()
        except Exception:
            dynamic = ""
        snapshot = ""
        try:
            with open("schema_snapshot.txt", "r", encoding="utf-8") as f:
                snapshot = f.read().strip()
        except Exception:
            snapshot = ""
        if dynamic and snapshot:
            return dynamic + "\n\n-- supplemental snapshot (may be stale) --\n" + snapshot
        return dynamic or snapshot

    def _reference_examples(self) -> str:
        try:
            from reference_questions import REFERENCE_QUESTIONS
            # Flatten key categories useful for schema reasoning
            cats = ["schema_meta", "schema_queries", "basics", "filters", "aggregations", "joins"]
            lines = []
            for c in cats:
                qs = REFERENCE_QUESTIONS.get(c, [])
                if not qs:
                    continue
                lines.append(f"- {c}:")
                for q in qs[:12]:  # cap to avoid overly long prompts
                    lines.append(f"  • {q}")
            return "\n".join(lines)
        except Exception:
            return ""

    def _extract_sql(self, text: str) -> str:
        if not text:
            return ""
        start = text.find("```sql")
        if start == -1:
            start = text.find("```")
        if start == -1:
            return text.strip()
        end = text.find("```", start + 3)
        if end == -1:
            return text[start + 3 :].strip()
        body = text[start:end]
        body = body.replace("```sql", "").replace("```", "").strip()
        return body

    def _build_prompt(self, question: str) -> str:
        schema = self._schema_prompt()
        refs = self._reference_examples()
        return (
            "You are an elite MySQL query generator. Follow the deliberate process strictly.\n\n"
            "THINK (high-level intent):\n"
            "- Restate the user's goal in 1 short sentence.\n"
            "- Identify which tables are relevant and why.\n\n"
            "THINK (schema mapping):\n"
            "- Map needed fields to exact table.column names from the schema.\n"
            "- Choose correct join paths (orders → order_customer → customers, orders → order_items → products).\n\n"
            "THINK (query plan):\n"
            "- Select columns (avoid SELECT * when possible).\n"
            "- Filters, grouping, ordering, and safe limits if large.\n\n"
            "GENERATE (single MySQL query):\n"
            "- Output exactly one executable SQL in a fenced sql block. No prose before or after.\n"
            "- Only SELECT statements are allowed. Do NOT use SHOW, DESCRIBE, INSERT, UPDATE, DELETE, CREATE, DROP, or ALTER.\n"
            "- The SQL MUST start with SELECT.\n"
            "- Exclude admin/chat_messages and any sensitive columns (e.g., stores.access_token).\n\n"
            f"SCHEMA (read-me-first):\n{schema}\n\n"
            + (f"REFERENCE QUESTIONS (guide your thinking, do not echo):\n{refs}\n\n" if refs else "")
            + f"USER QUESTION:\n{question}\n\n"
            "Return only a single fenced sql code block."
        )

    def _build_forced_sql_prompt(self, question: str) -> str:
        schema = self._schema_prompt()
        return (
            "Output exactly one valid MySQL SQL query that answers the user's request.\n"
            "Rules:\n"
            "- Use ONLY the provided schema.\n"
            "- Only SELECT statements are allowed. Do NOT use SHOW, DESCRIBE, INSERT, UPDATE, DELETE, CREATE, DROP, or ALTER.\n"
            "- The SQL MUST start with SELECT.\n"
            "- Do NOT explain.\n"
            "- Return a single fenced sql block and nothing else.\n\n"
            f"SCHEMA:\n{schema}\n\n"
            f"USER QUESTION:\n{question}\n\n"
            "Return only a single fenced sql code block."
        )

    def _intent_fallback_sql(self, question: str) -> Optional[str]:
        q = (question or "").lower()
        # Count tables
        if any(k in q for k in ["how many tables", "count tables", "no. of tables", "number of tables"]):
            return (
                "SELECT COUNT(*) AS total_tables\n"
                "FROM information_schema.tables\n"
                "WHERE table_schema = DATABASE();"
            )
        # Row counts per table
        if any(k in q for k in ["rows per table", "rows present in each table", "table row counts", "rows in each table"]):
            return (
                "SELECT table_name, table_rows AS approx_rows\n"
                "FROM information_schema.tables\n"
                "WHERE table_schema = DATABASE()\n"
                "ORDER BY approx_rows DESC;"
            )
        # List tables
        if any(k in q for k in ["list tables", "all tables", "show tables", "give the name of the tables"]):
            return (
                "SELECT table_name\n"
                "FROM information_schema.tables\n"
                "WHERE table_schema = DATABASE()\n"
                "ORDER BY table_name;"
            )
        return None

    def generate_sql(self, question: str) -> str:
        # Pass 1: deliberate prompt
        prompt = self._build_prompt(question)
        raw = str(self.llm.invoke(prompt))
        sql = self._extract_sql(raw).strip()
        # If empty or not SELECT, try a constrained re-prompt
        if not sql or not sql.lower().startswith("select"):
            raw2 = str(self.llm.invoke(self._build_forced_sql_prompt(question)))
            sql2 = self._extract_sql(raw2).strip()
            if sql2 and sql2.lower().startswith("select"):
                return sql2
            # If still not valid, synthesize deterministic SQL for known intents
            fallback = self._intent_fallback_sql(question)
            if fallback:
                return fallback
            # Last resort: if we got something, enforce SELECT by wrapping as a harmless count
            return "SELECT 0 AS no_valid_sql_generated LIMIT 1;"
        return sql

    def execute_sql(self, sql: str) -> Tuple[List[str], List[Tuple[Any, ...]]]:
        if not sql or not sql.strip().lower().startswith("select"):
            raise ValueError("Only SELECT queries are allowed.")
        
        if self.embedded_mode:
            # In embedded mode, execute directly using the database connection
            return self._execute_sql_embedded(sql)
        else:
            # In API mode, use the existing API call logic
            return self._execute_sql_api(sql)
    
    def _execute_sql_embedded(self, sql: str) -> Tuple[List[str], List[Tuple[Any, ...]]]:
        """Execute SQL directly in embedded mode"""
        try:
            # Import the database connection function from sql_api
            import mysql.connector
            import os
            
            # Get connection details
            host = os.getenv("DB_HOST", "43.225.53.118")
            user = os.getenv("DB_USER", "staging_sony_centeral")
            password = os.getenv("DB_PASSWORD", "sony_centeralsony_centeral")
            database = os.getenv("DB_NAME", "staging_central_hub")
            
            # Connect to database
            conn = mysql.connector.connect(
                host=host,
                user=user,
                password=password,
                database=database,
                ssl_disabled=True
            )
            
            cursor = conn.cursor(dictionary=True)
            cursor.execute(sql)
            results = cursor.fetchall()
            cursor.close()
            conn.close()
            
            if not results:
                return [], []
            
            # Extract columns and convert to tuple format
            columns = list(results[0].keys())
            rows = []
            for row in results:
                row_tuple = tuple(row.get(col, None) for col in columns)
                rows.append(row_tuple)
            
            return columns, rows
            
        except Exception as e:
            # Attempt auto-fix in embedded mode
            try:
                fixed_sql = self._auto_fix_sql(sql, str(e))
                if fixed_sql and fixed_sql.strip() != sql.strip():
                    print(f"🔄 Auto-fixing SQL and retrying...")
                    print(f"📝 Fixed SQL: {fixed_sql}")
                    return self._execute_sql_embedded(fixed_sql)
            except Exception:
                pass
            raise Exception(f"SQL execution failed: {str(e)}")
    
    def _execute_sql_api(self, sql: str) -> Tuple[List[str], List[Tuple[Any, ...]]]:
        """Execute SQL via API (original method)"""
        try:
            # Execute query via API
            response = requests.post(
                f"{self.api_url}/execute",
                json={"query": sql},
                timeout=30
            )
            
            if response.status_code != 200:
                raise Exception(f"API request failed with status {response.status_code}: {response.text}")
            
            result = response.json()
            
            if not result.get("success"):
                error_msg = result.get("error", "Unknown API error")
                print(f"⚠️  SQL Error: {error_msg}")
                
                # Attempt a single auto-fix and retry once
                fixed_sql = self._auto_fix_sql(sql, error_msg)
                if fixed_sql and fixed_sql.strip() != sql.strip():
                    print(f"🔄 Auto-fixing SQL and retrying...")
                    print(f"📝 Fixed SQL: {fixed_sql}")
                    
                    response = requests.post(
                        f"{self.api_url}/execute",
                        json={"query": fixed_sql},
                        timeout=30
                    )
                    if response.status_code == 200:
                        result = response.json()
                        if result.get("success"):
                            print("✅ Auto-fix successful!")
                            sql = fixed_sql  # propagate fixed SQL for downstream parsing
                        else:
                            raise Exception(f"Auto-fix failed: {result.get('error', 'Unknown error')}")
                    else:
                        raise Exception(f"API request failed with status {response.status_code}: {response.text}")
                else:
                    raise Exception(f"SQL execution failed: {error_msg}")
            
            # Extract data from API response
            data = result.get("data", [])
            columns = result.get("columns", [])
            
            if not data:
                return columns, []
            
            # Convert to tuple format for compatibility
            rows = []
            for row in data:
                if isinstance(row, dict):
                    row_tuple = tuple(row.get(col, None) for col in columns)
                    rows.append(row_tuple)
                else:
                    rows.append(tuple(row))
            
            return columns, rows
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"API connection failed: {str(e)}")
        except Exception as e:
            raise Exception(f"SQL execution failed: {str(e)}")

    def summarize_result(self, question: str, columns: List[str], objects: List[Dict[str, Any]]) -> str:
        try:
            llm = self.llm or get_single_llm(self.model_name, self.base_url, self.temperature)
        except Exception:
            llm = None
        # Prepare compact payload
        preview = objects[:15]
        payload = {
            "question": question,
            "columns": columns,
            "preview": preview,
            "count": len(objects),
        }
        prompt = (
            "You are a business analyst. Given a user question and SQL result rows,\n"
            "write a concise, user-facing summary of the findings.\n"
            "Rules:\n"
            "- Do NOT include SQL.\n"
            "- Keep it 3-5 sentences max.\n"
            "- Mention key counts, trends, or notable items.\n"
            "- If only a count is returned, report it directly.\n\n"
            f"DATA:\n{json.dumps(payload, ensure_ascii=False)}\n\n"
            "Return only the summary in natural language."
        )
        try:
            if llm is None:
                # Fallback heuristic summary
                if len(columns) == 1 and payload["count"] >= 0:
                    return f"Returned {payload['count']} rows for column '{columns[0]}'."
                return f"Returned {payload['count']} rows across {len(columns)} columns."
            return str(llm.invoke(prompt)).strip()
        except Exception:
            return f"Returned {payload['count']} rows across {len(columns)} columns."

    def _add_to_conversation(self, question: str, response: Dict[str, Any]) -> None:
        """Add question and response to conversation history."""
        self.conversation_history.append({
            "question": question,
            "response": response,
            "timestamp": __import__("time").time()
        })
        # Keep only last 10 conversations to avoid memory bloat
        if len(self.conversation_history) > 10:
            self.conversation_history = self.conversation_history[-10:]

    def _extract_user_preferences(self, question: str) -> None:
        """Extract and remember user preferences from the question."""
        q = question.lower().strip()
        
        # Check for full detail requests
        full_detail_phrases = [
            "full list", "complete list", "all details", "show all", "entire list",
            "full details", "complete details", "all data", "everything", "full data",
            "complete data", "entire data", "all records", "full records", "complete records",
            "no limit", "unlimited", "all rows", "full rows", "complete rows"
        ]
        
        if any(phrase in q for phrase in full_detail_phrases):
            self.user_preferences["show_all_rows"] = True
            self.user_preferences["last_full_detail_request"] = __import__("time").time()
        elif any(phrase in q for phrase in ["limit", "first", "top", "few", "some"]):
            # User explicitly wants limited results
            self.user_preferences["show_all_rows"] = False

    def _get_context_from_history(self, question: str) -> str:
        """Extract context from previous conversation to understand what the user is referring to."""
        if not self.conversation_history:
            return question
        
        # Get the most recent conversation
        last_conversation = self.conversation_history[-1]
        last_question = last_conversation.get("question", "")
        last_response = last_conversation.get("response", {})
        last_sql = last_response.get("sql", "")
        
        q = question.lower().strip()
        
        # Check for continuation phrases
        continuation_phrases = [
            "more", "next", "continue", "rest", "remaining", "additional",
            "50 more", "20 more", "10 more", "5 more", "100 more",
            "show more", "get more", "give me more"
        ]
        
        # Check for full detail phrases
        vague_phrases = [
            "full list", "complete list", "all details", "show all", "entire list",
            "full details", "complete details", "all data", "everything", "full data",
            "complete data", "entire data", "all records", "full records", "complete records",
            "no limit", "unlimited", "all rows", "full rows", "complete rows",
            "the full list", "give me the full list", "show me the full list"
        ]
        
        # If asking for more/continuation of previous data
        if any(phrase in q for phrase in continuation_phrases):
            if last_sql and "SELECT" in last_sql.upper():
                # Extract WHERE clause from previous SQL to preserve context
                where_clause = ""
                if "WHERE" in last_sql.upper():
                    where_part = last_sql.upper().split("WHERE")[1].strip()
                    # Remove ORDER BY, GROUP BY, LIMIT clauses that might come after WHERE
                    for clause in ["ORDER BY", "GROUP BY", "LIMIT"]:
                        if clause in where_part:
                            where_part = where_part.split(clause)[0].strip()
                    where_clause = f" WHERE {where_part}"
                
                # Extract the main table and columns from the last SQL
                if "customers" in last_sql.lower() and "country" in last_sql.lower():
                    # Check if the previous query was filtering by country
                    if "country" in where_clause.lower():
                        return f"get me {question} customers{where_clause.lower()}"
                    else:
                        return f"get me {question} customer countries"
                elif "customers" in last_sql.lower():
                    return f"get me {question} customers{where_clause.lower()}"
                elif "products" in last_sql.lower():
                    return f"get me {question} products{where_clause.lower()}"
                elif "orders" in last_sql.lower():
                    return f"get me {question} orders{where_clause.lower()}"
                else:
                    return f"get me {question} {last_question}"
        
        # If asking for full details
        elif any(phrase in q for phrase in vague_phrases):
            if last_sql and "SELECT" in last_sql.upper():
                # Generic approach: simply append "full list" to the previous question
                # This works for any type of query - orders, customers, products, etc.
                return f"{last_question} full list"
        
        return question

    def _is_vague_question(self, question: str) -> bool:
        """Detect incomplete/vague prompts that are likely to confuse the LLM."""
        try:
            q = (question or "").strip().lower()
            if not q:
                return True
            words = q.split()

            # Intent cues that indicate a concrete ask
            intent_cues = {
                "how many", "count", "list", "show", "get", "find", "give", "top", "recent", "latest"
            }
            if any(cue in q for cue in intent_cues):
                intent_present = True
            else:
                intent_present = False

            # Vague pronouns or continuations
            vague_tokens = {
                "this", "that", "those", "these", "it", "them",
                "more", "next", "continue", "rest", "remaining",
                "others", "like before", "same as before"
            }
            has_vague_tokens = any(tok in q for tok in vague_tokens)

            # Domain hints (expanded with common synonyms)
            domain_tokens = {
                "orders", "order", "products", "product", "customers", "customer",
                "stores", "store", "variants", "variant", "sales", "sold", "tv", "tvs",
                "television", "televisions", "sku", "skus", "items", "item"
            }
            has_domain = any(tok in q for tok in domain_tokens)

            # Very short questions with no domain and no intent are vague
            if len(words) <= 2 and not has_domain and not intent_present:
                return True

            # If we have intent or domain, do not treat as vague
            if intent_present or has_domain:
                return False

            # Only vague tokens and no concrete domain → vague
            if has_vague_tokens and not has_domain:
                return True

            return False
        except Exception:
            return False

    def _should_show_all_rows(self, question: str) -> bool:
        """Check if user wants all rows based on current question and conversation history."""
        q = question.lower().strip()
        
        # First, update preferences based on current question
        self._extract_user_preferences(question)
        
        # Check if current question explicitly asks for full details
        full_detail_phrases = [
            "full list", "complete list", "all details", "show all", "entire list",
            "full details", "complete details", "all data", "everything", "full data",
            "complete data", "entire data", "all records", "full records", "complete records",
            "no limit", "unlimited", "all rows", "full rows", "complete rows"
        ]
        
        if any(phrase in q for phrase in full_detail_phrases):
            return True
        
        # Check for continuation requests - these should show all remaining rows
        continuation_phrases = [
            "more", "next", "continue", "rest", "remaining", "additional",
            "50 more", "20 more", "10 more", "5 more", "100 more",
            "show more", "get more", "give me more"
        ]
        
        if any(phrase in q for phrase in continuation_phrases):
            return True
        
        # If current question doesn't specify, check if user has a preference for full details
        # and the question is vague (doesn't specify limits)
        if self.user_preferences["show_all_rows"]:
            # Check if question is vague (doesn't specify any limits)
            limit_indicators = ["limit", "first", "top", "few", "some", "last", "recent"]
            if not any(indicator in q for indicator in limit_indicators):
                return True
        
        return False

    def reset_preferences(self) -> None:
        """Reset user preferences to default."""
        self.user_preferences = {
            "show_all_rows": False,
            "last_full_detail_request": None
        }
        print("🔄 User preferences reset to default")

    def show_preferences(self) -> None:
        """Show current user preferences."""
        print(f"\n📋 Current Preferences:")
        print(f"   • Show all rows: {self.user_preferences['show_all_rows']}")
        if self.user_preferences['last_full_detail_request']:
            import time
            time_ago = time.time() - self.user_preferences['last_full_detail_request']
            print(f"   • Last full detail request: {int(time_ago)} seconds ago")
        print(f"   • Conversation history: {len(self.conversation_history)} entries")

    def ask(self, question: str, show_rows: int = 20) -> Dict[str, Any]:
        """Generate SQL, execute via API, and return results."""
        # First, get context-aware question
        context_question = self._get_context_from_history(question)
        
        print(f"\n🤖 Processing: {question}")
        if context_question != question:
            print(f"🔄 Context-aware interpretation: {context_question}")
        
        # If prompt is vague/incomplete, ask for confirmation instead of generating random SQL
        if self._is_vague_question(question):
            msg = (
                "Your request seems incomplete or ambiguous.\n"
                f"Would you like me to run this based on previous context instead?\n\n→ {context_question}\n\n"
                "Please confirm or rephrase your question."
            )
            print(f"\n❓ Clarification needed\n{msg}")
            result = {
                "clarification_required": True,
                "suggested_question": context_question,
                "formatted_results": msg,
                "sql": "",
                "columns": [],
                "rows": [],
                "row_count": 0,
            }
            self._add_to_conversation(question, result)
            return result

        # Check if user wants full details - override show_rows limit
        should_show_all = self._should_show_all_rows(question)
        if should_show_all:
            show_rows = float('inf')  # Show all rows
            if any(phrase in question.lower() for phrase in ["full", "complete", "all", "entire", "everything"]):
                print("📋 User requested full details - showing all available rows")
            else:
                print("📋 Using previous preference for full details - showing all available rows")
        
        # Generate SQL using context-aware question
        sql = self.generate_sql(context_question)
        print(f"\n📝 Generated SQL:\n{sql}")
        
        try:
            # Execute SQL via API
            print(f"\n🚀 Executing query via API...")
            columns, rows = self.execute_sql(sql)
            
            # Display results
            if rows:
                print(f"\n📊 Query Results ({len(rows)} rows):")
                print("=" * 80)
                
                # Create table display
                from tabulate import tabulate
                display_rows = rows[:show_rows] if show_rows != float('inf') else rows
                table = tabulate(display_rows, headers=columns, tablefmt="fancy_grid")
                print(table)
                
                # Only show truncation message if we're actually limiting rows
                if show_rows != float('inf') and len(rows) > show_rows:
                    print(f"\n... and {len(rows) - show_rows} more rows (showing first {show_rows})")
                
                # Skip summary generation - user only wants query results
                
            else:
                print("\n📊 Query executed successfully but returned no results.")
            
            # Create formatted results for API
            formatted_results = ""
            if rows:
                from tabulate import tabulate
                display_rows = rows[:show_rows] if show_rows != float('inf') else rows
                formatted_results = tabulate(display_rows, headers=columns, tablefmt="fancy_grid")
                if show_rows != float('inf') and len(rows) > show_rows:
                    formatted_results += f"\n\n... and {len(rows) - show_rows} more rows (showing first {show_rows})"
            else:
                formatted_results = "No results found."
            
            # Store conversation for context
            result = {
                "sql": sql,
                "columns": columns,
                "rows": rows,
                "row_count": len(rows),
                "formatted_results": formatted_results
            }
            self._add_to_conversation(question, result)
            
            return result
            
        except Exception as e:
            print(f"\n❌ Error executing query: {str(e)}")
            error_result = {
                "sql": sql,
                "error": str(e)
            }
            self._add_to_conversation(question, error_result)
            return error_result


def main() -> None:
    print("🚀 Single-Model DB Assistant (MySQL via API)")
    print("=" * 60)
    print("📋 Prerequisites:")
    print("   1. Start the SQL API server: python sql_api.py")
    print("   2. Ensure the API is running on http://localhost:8000")
    print("=" * 60)
    
    try:
        assistant = SingleModelDBAssistant()
        print(f"\n✅ Connected! Using model: {assistant.model_name} | Database: {assistant.database_name}")
        print("\n💡 Type a question, or 'exit' to quit.\n")
        
        while True:
            try:
                q = input("You: ")
            except EOFError:
                break
            if not q:
                continue
            if q.strip().lower() in {"exit", "quit"}:
                break
            
            # Handle special commands
            q_lower = q.strip().lower()
            if q_lower in {"reset", "reset preferences"}:
                assistant.reset_preferences()
                continue
            elif q_lower in {"preferences", "show preferences", "status"}:
                assistant.show_preferences()
                continue
            elif q_lower in {"help", "commands"}:
                print("\n📚 Available Commands:")
                print("   • 'reset' or 'reset preferences' - Reset to default row limits")
                print("   • 'preferences' or 'status' - Show current preferences")
                print("   • 'help' or 'commands' - Show this help")
                print("   • 'exit' or 'quit' - Exit the program")
                print("\n💡 Tips:")
                print("   • Ask for 'full list' or 'all details' to see all rows")
                print("   • The system remembers your preference for future queries")
                print("   • Use 'first 10' or 'top 5' to limit specific queries")
                continue
            
            try:
                assistant.ask(q, show_rows=30)
            except Exception as e:
                print(f"❌ Error: {e}")
                
    except Exception as e:
        print(f"❌ Failed to initialize assistant: {e}")
        print("\n🔧 Troubleshooting:")
        print("   1. Make sure the SQL API is running: python sql_api.py")
        print("   2. Check if the API is accessible: http://localhost:8000/health")
        print("   3. Verify database connection in the API")


if __name__ == "__main__":
    main()


