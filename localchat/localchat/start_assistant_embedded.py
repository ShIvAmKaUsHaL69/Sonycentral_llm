#!/usr/bin/env python3
"""
Startup script for the integrated SQL API + DB Assistant system (Embedded Mode)
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

def main():
    """Main startup function"""
    print("=" * 60)
    print("🚀 Starting Integrated SQL API + DB Assistant System (Embedded Mode)")
    print("=" * 60)
    
    # Check if API is already running
    if check_api_health(timeout=5):
        print("✅ SQL API is already running!")
    else:
        # Start API
        api_process = start_api()
        if not api_process:
            print("\n❌ Cannot start assistant without API. Exiting.")
            return
    
    # Import and run the assistant in embedded mode
    try:
        from single_model_db_assistant import SingleModelDBAssistant
        
        print("\n🤖 Starting DB Assistant in embedded mode...")
        assistant = SingleModelDBAssistant(embedded_mode=True)
        print(f"✅ Connected! Using model: {assistant.model_name} | Database: {assistant.database_name}")
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
