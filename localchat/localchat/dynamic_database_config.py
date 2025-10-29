"""
Dynamic Database Configuration Module for LocalChat Assistant
This module provides dynamic database schema understanding through prompts and descriptions.
"""

import os
import ssl
import time
import re
from typing import List, Dict, Any, Tuple
from langchain_community.utilities import SQLDatabase
from tabulate import tabulate


class DynamicDatabaseManager:
    """Manages database connections with dynamic schema understanding"""

    def __init__(self, connection_string=None):
        """Initialize dynamic database manager"""
        self.connection_string = connection_string or self._get_default_connection()
        self.db = None
        self.schema_info = None
        self._connect()
        if self.db:
            self._analyze_schema()

    def _get_default_connection(self):
        """Get default database connection string (env or fallback)"""
        return os.getenv(
            "DATABASE_URL",
            "mysql+mysqlconnector://staging_sony_centeral:sony_centeralsony_centeral@43.225.53.118/staging_central_hub?ssl_disabled=True"
            #  "mysql+mysqlconnector://root:@localhost/sonycentral?ssl_disabled=True"
        )

    def _connect(self):
        """Establish database connection"""
        try:
            self.db = SQLDatabase.from_uri(
                self.connection_string,
                sample_rows_in_table_info=15,   # More rows for schema understanding
                include_tables=None,
                max_string_length=5000          # Prevent truncation
            )
            print("[OK] Database connection established successfully!")
        except Exception as e:
            print(f"[ERROR] Database connection failed: {e}")
            self.db = None

    def _analyze_schema(self):
        """Analyze database schema to understand table structures"""
        try:
            table_info = self.db.get_table_info()
            self.schema_info = self._extract_schema_details(table_info)
            print("[OK] Database schema analyzed successfully!")
        except Exception as e:
            print(f"[ERROR] Schema analysis failed: {e}")
            self.schema_info = self._create_fallback_schema()

    def _extract_schema_details(self, table_info):
        """Extract detailed schema information from table info"""
        schema_details = {}
        try:
            lines = table_info.split('\n')
            current_table, current_structure = None, []

            for line in lines:
                line = line.strip()
                if line.startswith('CREATE TABLE'):
                    if current_table and current_structure:
                        schema_details[current_table] = {
                            'structure': '\n'.join(current_structure),
                            'description': self._generate_table_description(current_table, current_structure)
                        }
                    table_name = line.split('`')[1] if '`' in line else line.split()[2]
                    current_table, current_structure = table_name, [line]
                elif current_table and line:
                    current_structure.append(line)

            if current_table and current_structure:
                schema_details[current_table] = {
                    'structure': '\n'.join(current_structure),
                    'description': self._generate_table_description(current_table, current_structure)
                }

        except Exception as e:
            print(f"[WARN] Schema parsing warning: {e}")
            schema_details = self._create_fallback_schema()
        return schema_details

    def _generate_table_description(self, table_name, structure):
        """Generate a natural language description of a table"""
        table_name_lower = table_name.lower()
        specific_descriptions = {
            
            'orders': 'Contains order records including order_id, shopify_id, store_id, customer info, status, currency, pricing, and timestamps',
            'order_items': 'Contains individual order line items including product_id, variant_id, quantity, SKU, price, and discounts',
            'order_billing': 'Contains billing information for orders including payment details',
            'order_customer': 'Contains customer details linked to orders',
            'order_fulfillments': 'Contains order fulfillment details including shipping and delivery info',
            'order_returns': 'Contains order return records with reasons and status',
            'order_shipping': 'Contains shipping details for orders including addresses, method, tracking',
            'order_transaction': 'Contains payment transactions for orders (amount, currency, gateway, status)',
            'order_item_properties': 'Contains additional attributes and properties for order items',
            'customers': 'Contains customer records including customer_id, name, email, phone, country, created_at',
            'products': 'Contains product records including product_id, title, vendor, product_type, status, and timestamps',
            'product_variants': 'Contains product variant records including variant_id, product_id, sku, price, inventory_quantity',
            'sku_mapping': 'Contains SKU mappings to product and variant IDs',
            'stores': 'Contains store records including store_id, store_name, shop_url, status, synced_at, and aggregate counts',
            'admin': 'Contains administrative user accounts',
            'chat_messages': 'Contains chat message logs for conversations'

            
        }
        return specific_descriptions.get(table_name_lower, f"Stores {table_name} records")

    def _create_fallback_schema(self):
        """Fallback schema if parsing fails"""
        return {
            'stores': {
                'description': 'Contains store records including store_id, store_name, shop_url, status, synced_at, and counts',
                'structure': """
                CREATE TABLE stores (
                    store_id VARCHAR(100) PRIMARY KEY,
                    shopify_id VARCHAR(255),
                    store_name VARCHAR(255),
                    shop_url VARCHAR(255),
                    status VARCHAR(50),
                    created_at DATETIME,
                    synced_at DATETIME,
                    total_products INT,
                    total_customers INT,
                    total_orders INT
                )"""
            },
            'products': {
                'description': 'Contains product records',
                'structure': "CREATE TABLE products (product_id VARCHAR(100), store_id VARCHAR(100), title VARCHAR(255), vendor VARCHAR(255))"
            },
            'customers': {
                'description': 'Contains customer records',
                'structure': "CREATE TABLE customers (customer_id VARCHAR(100), store_id VARCHAR(100), first_name VARCHAR(100), last_name VARCHAR(100), email VARCHAR(255))"
            },
            'orders': {
                'description': 'Contains order records',
                'structure': "CREATE TABLE orders (order_id VARCHAR(100), store_id VARCHAR(100), customer_id VARCHAR(100), total_price DECIMAL(10,2), created_at DATETIME)"
            },
        }

    def get_database(self):
        """Get the database connection"""
        return self.db

    def is_connected(self):
        """Check if database is connected"""
        return self.db is not None

    def get_schema_info(self):
        """Get the analyzed schema information"""
        return self.schema_info

    def _generate_schema_description(self):
        """Generate a schema description for LLM prompting"""
        if not self.schema_info:
            return "Database schema unavailable"

        # Exclude sensitive/non-analytic tables from prompts
        excluded_tables = {"admin", "chat_messages"}

        schema_desc = ["The database contains the following tables (excluding admin/chat_messages):"]
        for table_name, table_info in self.schema_info.items():
            if table_name in excluded_tables:
                continue
            schema_desc.append(f"\n📋 **{table_name}**: {table_info.get('description', 'Contains data')}")

        schema_desc.append("\n## TABLE RELATIONSHIPS:")
        schema_desc.append("- stores → customers (via store_id)")
        schema_desc.append("- stores → products (via store_id)")
        schema_desc.append("- products → product_variants (via product_id)")
        schema_desc.append("- orders → stores (via store_id)")
        schema_desc.append("- order_customer: order_id ↔ orders.order_id; customer_id ↔ customers.customer_id")
        schema_desc.append("- orders → order_items (via order_id)")
        schema_desc.append("- orders → order_transaction (via order_id)")

        return "\n".join(schema_desc)

    def get_database_description_prompt(self):
        """Generate the comprehensive database description prompt for LLM training"""
        schema_text = self._generate_schema_description()
        prompt = f"""
## DATABASE SCHEMA
{schema_text}


## SENSITIVE/EXCLUDED TABLES AND COLUMNS
- Do NOT query 'admin' or 'chat_messages' tables
- Do NOT select or expose 'stores.access_token'

## FEW-SHOT LEARNING EXAMPLES
User: "How many customers do we have?"
Assistant: SELECT COUNT(*) AS total_customers FROM customers;

User: "Show me the list of countries"
Assistant: SELECT DISTINCT country FROM customers WHERE country IS NOT NULL ORDER BY country;

User: "Get customer count by country"
Assistant: SELECT country, COUNT(*) AS customer_count FROM customers WHERE country IS NOT NULL GROUP BY country ORDER BY customer_count DESC;

User: "Show recent orders"
Assistant: SELECT order_id, customer_id, total_price, created_at FROM orders ORDER BY created_at DESC LIMIT 10;

User: "What products are available?"
Assistant: SELECT product_id, title, vendor, status FROM products LIMIT 20;

## INSTRUCTIONS
1. ALWAYS examine the schema before generating SQL
2. Use ONLY the actual column names in the schema
3. Use LIMIT for large result sets (default: 20)
4. Use JOINs when combining tables
5. Always return a **single, executable SQL query** in a fenced ```sql block
6. Exclude sensitive fields (passwords, tokens, keys)
7. Do NOT use 'admin' or 'chat_messages' tables; do NOT select 'stores.access_token'
8. To join orders with customers, use the link table 'order_customer'
9. If execution returns ZERO rows, REGENERATE a new SQL with an alternative valid join/path (e.g.,
   - prefer using orders.name/email for customer info on orders when customer table is not required,
   - or join via order_customer to reach customers when needed), then execute again.
10. If an error mentions an unknown column or table, REVISE the SQL to match this schema and try again (e.g.,
    replace customers.name with orders.name; never use orders.customer_id; add missing aliases).
11. Do NOT present raw SQL as the final answer; you must execute and present tabular results.

## CRITICAL RULES
- NEVER invent fake values (❌ 'The Tables Above', 'unknown', 'dummy')
- ONLY use values explicitly provided by the user (e.g., 'PAID')
- If the query is about a specific domain (orders, customers, products, stores), the relevant table(s) MUST be included
- SQL must be syntactically valid for MySQL
 - Never join orders to customers directly on a non-existent key; use order_customer for the relation
"""
        return prompt

    def safe_execute(self, query: str, max_rows: int = 20):
        """
        Validate and execute SQL safely with pretty results.
        - Ensures only SELECT queries
        - Pretty-prints tables
        - Summarizes if result set is large
        """
        valid, checked_query = self.validate_sql(query)
        if not valid:
            print(checked_query)
            return {"error": checked_query}

        result = self.execute_query(checked_query)
        if not result:
            print("[WARN] No results found.")
            return {"error": "No results found."}

        # Format result
        try:
            headers = result[0].keys() if isinstance(result, list) else []
            rows = [list(r.values()) for r in result]

            # Limit to max_rows
            display_rows = rows[:max_rows]
            table_output = tabulate(display_rows, headers=headers, tablefmt="fancy_grid")

            if len(rows) > max_rows:
                summary_note = f"\n[WARN] Showing top {max_rows} rows out of {len(rows)} total."
                table_output += summary_note

            print(table_output)
            return table_output  # Return the formatted table directly instead of wrapped in dict

        except Exception as e:
            print(f"[ERROR] Result formatting failed: {e}")
            return {"error": str(e)}

        
    def get_table_suggestions(self, user_query):
        """Get relevant table suggestions based on user query"""
        if not self.schema_info:
            return []

        query_lower = user_query.lower()
        relevant_tables = []
        keyword_mapping = {
            'customer': ['customers'],
            'order': ['orders', 'order_items'],
            'product': ['products', 'product_variants'],
            'store': ['stores'],
            'transaction': ['order_transaction'],
            'chat': ['chat_messages']
        }

        for keyword, tables in keyword_mapping.items():
            if keyword in query_lower:
                for table in tables:
                    if table in self.schema_info:
                        relevant_tables.append({
                            'table': table,
                            'description': self.schema_info[table]['description'],
                            'relevance': 'high'
                        })

        seen, unique_tables = set(), []
        for table_info in relevant_tables:
            if table_info['table'] not in seen:
                seen.add(table_info['table'])
                unique_tables.append(table_info)
        return unique_tables[:5]

    def validate_sql(self, query: str) -> Tuple[bool, str]:
        """
        Validate LLM-generated SQL against known schema.
        ✅ Only allow SELECT queries
        ✅ Ensure referenced tables exist in schema
        ✅ Ensure referenced columns exist in those tables
        """
        if not query.strip().lower().startswith("select"):
            return False, "[ERROR] Only SELECT queries are allowed."

        query_clean = query.strip().rstrip(";")

        if not self.schema_info:
            return False, "[ERROR] Schema information unavailable for validation."

        # --- Extract tables ---
        used_tables = re.findall(
            r"\bfrom\s+([a-zA-Z0-9_]+)|\bjoin\s+([a-zA-Z0-9_]+)", 
            query_clean, re.IGNORECASE
        )
        used_tables = {t for tup in used_tables for t in tup if t}

        for table in used_tables:
            if table not in self.schema_info:
                return False, f"[ERROR] Table '{table}' not found in schema."

        # --- Extract columns ---
        selected_cols = re.findall(
            r"select\s+(.*?)\s+from", query_clean, re.IGNORECASE | re.DOTALL
        )

        if selected_cols:
            cols = re.split(r",\s*", selected_cols[0])
            for col in cols:
                col = col.strip().split(" ")[0]  # remove aliases
                if col != "*" and not any(
                    col in self.schema_info[t]["structure"] for t in used_tables
                ):
                    return False, f"[ERROR] Column '{col}' not found in referenced tables."

        return True, query_clean

    def execute_query(self, query, max_retries=3):
        """Execute a SQL query with retry logic"""
        if not self.is_connected():
            print("[ERROR] Database not connected")
            return None

        attempts = 0
        while attempts < max_retries:
            try:
                result = self.db.run(query)
                # Print a concise raw preview for transparency (non-blocking)
                try:
                    preview = result
                    if isinstance(result, list):
                        preview = result[:3]
                    elif isinstance(result, str) and len(result) > 800:
                        preview = result[:800] + "... (truncated)"
                    print("[RAW] SQL result preview:", preview)
                except Exception:
                    pass
                # Normalize to list of dicts to avoid tuple-like rows upstream
                if isinstance(result, list) and result:
                    try:
                        headers = list(result[0].keys())
                        dict_rows = []
                        for r in result:
                            # Prefer values() if available (SQLDatabase row proxy/dict-like)
                            try:
                                values = list(r.values())
                            except Exception:
                                # Best-effort fallback: support tuple/list rows
                                values = list(r) if not isinstance(r, dict) else [r.get(h) for h in headers]
                            row_obj = {h: (values[i] if i < len(values) else None) for i, h in enumerate(headers)}
                            dict_rows.append(row_obj)
                        # Pretty print
                        rows_for_print = [[row_obj.get(h) for h in headers] for row_obj in dict_rows]
                        print(tabulate(rows_for_print, headers=headers, tablefmt="fancy_grid"))
                        return dict_rows
                    except Exception:
                        # Fall back to original behavior if normalization fails
                        pass
                # If not a non-empty list, return as-is
                return result
            except Exception as e:
                message = str(e)
                is_ssl_error = (
                    isinstance(e, ssl.SSLError)
                    or "DECRYPTION_FAILED_OR_BAD_RECORD_MAC" in message
                    or "bad record mac" in message.lower()
                )
                attempts += 1
                if is_ssl_error and attempts < max_retries:
                    print(f"[RETRY] SSL error detected, retrying... (attempt {attempts}/{max_retries})")
                    time.sleep(0.8 * attempts)
                    continue
                else:
                    print(f"[ERROR] Query execution failed: {e}")
                    return None
        return None


# --- Global helper functions ---

dynamic_db_manager = DynamicDatabaseManager()

def get_dynamic_db():
    return dynamic_db_manager.get_database()

def is_dynamic_db_connected():
    return dynamic_db_manager.is_connected()

def get_schema_info():
    return dynamic_db_manager.get_schema_info()

def get_database_description_prompt():
    return dynamic_db_manager.get_database_description_prompt()

def get_table_suggestions(user_query: str):
    return dynamic_db_manager.get_table_suggestions(user_query)

def execute_dynamic_sql(query: str):
    """Execute SQL and return properly formatted results instead of JSON wrapper"""
    result = dynamic_db_manager.safe_execute(query)
    
    # If result is a dict with 'error' key, return the error message
    if isinstance(result, dict) and 'error' in result:
        return f"Error: {result['error']}"
    
    # Otherwise return the result as-is (now it should be the formatted table directly)
    return result
