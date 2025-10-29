#!/usr/bin/env python3
"""
Startup script for the integrated SQL API + DB Assistant system
"""

import subprocess
import time
import requests
import sys
import os

def check_api_health(api_url="http://localhost:8000", timeout=30):
    """Check if the API is running and healthy"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(f"{api_url}/health", timeout=5)
            if response.status_code == 200:
                return True
        except:
            pass
        time.sleep(2)
    return False

def start_api():
    """Start the SQL API server"""
    print("🚀 Starting SQL API server...")
    try:
        # Start API in background
        api_process = subprocess.Popen(
            [sys.executable, "sql_api.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Give the API a moment to start up
        print("⏳ Waiting for API to start...")
        time.sleep(3)  # Give it 3 seconds to initialize
        
        if check_api_health():
            print("✅ SQL API is running and healthy!")
            return api_process
        else:
            print("❌ API failed to start or is not responding")
            # Get error output for debugging
            stdout, stderr = api_process.communicate()
            if stderr:
                print(f"API Error: {stderr.decode()}")
            if stdout:
                print(f"API Output: {stdout.decode()}")
            api_process.terminate()
            return None
            
    except Exception as e:
        print(f"❌ Failed to start API: {e}")
        return None

def start_assistant():
    """Start the DB Assistant"""
    print("\n🤖 Starting DB Assistant...")
    try:
        # Use embedded mode to avoid external LLM connection issues
        subprocess.run([sys.executable, "-c", """
from single_model_db_assistant import SingleModelDBAssistant
import sys

assistant = SingleModelDBAssistant(embedded_mode=True)
print('✅ Connected! Using model:', assistant.model_name, '| Database:', assistant.database_name)
print('\\n💡 Type a question, or \\'exit\\' to quit.\\n')

while True:
    try:
        question = input('You: ')
        if not question.strip():
            continue
        if question.strip().lower() in ['exit', 'quit']:
            break
        assistant.ask(question, show_rows=30)
    except EOFError:
        break
    except KeyboardInterrupt:
        break
    except Exception as e:
        print(f'❌ Error: {e}')
"""])
    except KeyboardInterrupt:
        print("\n👋 Assistant stopped by user")
    except Exception as e:
        print(f"❌ Failed to start assistant: {e}")

def main():
    """Main startup function"""
    print("=" * 60)
    print("🚀 Starting Integrated SQL API + DB Assistant System")
    print("=" * 60)
    
    # Check if API is already running
    if check_api_health(timeout=5):
        print("✅ SQL API is already running!")
        start_assistant()
        return
    
    # Start API
    api_process = start_api()
    if not api_process:
        print("\n❌ Cannot start assistant without API. Exiting.")
        return
    
    try:
        # Start assistant
        start_assistant()
    finally:
        # Clean up API process
        if api_process:
            print("\n🛑 Stopping API server...")
            api_process.terminate()
            api_process.wait()

if __name__ == "__main__":
    main()
