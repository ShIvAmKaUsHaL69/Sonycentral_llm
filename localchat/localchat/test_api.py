#!/usr/bin/env python3
"""
Simple test script to check API status
"""

import requests
import time

def test_api():
    try:
        print("Testing API connection...")
        response = requests.get("http://localhost:8000/health", timeout=5)
        print(f"API Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return True
    except Exception as e:
        print(f"API not accessible: {e}")
        return False

if __name__ == "__main__":
    test_api()
