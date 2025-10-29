#!/usr/bin/env python3
"""
Simple client for SQL API
"""

import requests
import json
from typing import Dict, Any, List

class SQLAPIClient:
    """Client for SQL API"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
    
    def health_check(self) -> Dict[str, Any]:
        """Check API health"""
        response = requests.get(f"{self.base_url}/health")
        return response.json()
    
    def execute_sql(self, sql_query: str) -> Dict[str, Any]:
        """Execute SQL query"""
        response = requests.post(
            f"{self.base_url}/execute",
            json={"query": sql_query}
        )
        return response.json()
    
    def get_tables(self) -> List[str]:
        """Get list of tables in the database"""
        result = self.execute_sql("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'staging_central_hub'
            ORDER BY table_name
        """)
        
        if result.get("success"):
            return [row["table_name"] for row in result["data"]]
        else:
            print(f"Error getting tables: {result.get('error')}")
            return []
    
    def describe_table(self, table_name: str) -> Dict[str, Any]:
        """Get table structure"""
        result = self.execute_sql(f"""
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_schema = 'staging_central_hub' 
            AND table_name = '{table_name}'
            ORDER BY ordinal_position
        """)
        
        return result

def main():
    """Example usage"""
    client = SQLAPIClient()
    
    print("🔍 Testing SQL API Client")
    print("=" * 40)
    
    # Health check
    print("1. Health Check:")
    health = client.health_check()
    print(json.dumps(health, indent=2))
    
    # Get tables
    print("\n2. Getting Tables:")
    tables = client.get_tables()
    print(f"Found {len(tables)} tables: {tables[:5]}...")
    
    # Execute a simple query
    print("\n3. Simple Query:")
    result = client.execute_sql("SELECT 1 as test, 'hello' as message")
    print(json.dumps(result, indent=2))
    
    # Describe a table (if any exist)
    if tables:
        print(f"\n4. Describe Table '{tables[0]}':")
        table_info = client.describe_table(tables[0])
        print(json.dumps(table_info, indent=2))

if __name__ == "__main__":
    main()
