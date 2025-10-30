#!/usr/bin/env python3
"""
Startup script for the complete chat system with middleware
This script starts the LocalChat system and provides instructions for the Next.js server
"""

import subprocess
import time
import requests
import sys
import os
from pathlib import Path

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

def start_localchat_system():
    """Start the LocalChat system (SQL API + Assistant)"""
    print("🚀 Starting LocalChat System...")
    print("=" * 50)
    
    # Change to localchat directory
    localchat_dir = Path(__file__).parent.parent / "localchat" / "localchat"
    os.chdir(localchat_dir)
    
    # Check if API is already running
    if check_api_health(timeout=5):
        print("✅ SQL API is already running!")
        return True
    
    # Start SQL API
    print("📡 Starting SQL API server...")
    try:
        api_process = subprocess.Popen(
            [sys.executable, "sql_api.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for API to be ready
        print("⏳ Waiting for SQL API to start...")
        if check_api_health():
            print("✅ SQL API is running and healthy!")
            return True
        else:
            print("❌ SQL API failed to start or is not responding")
            api_process.terminate()
            return False
            
    except Exception as e:
        print(f"❌ Failed to start SQL API: {e}")
        return False

def main():
    """Main startup function"""
    print("🎯 Chat System with Middleware Integration")
    print("=" * 60)
    print("This will start the LocalChat system (SQL API + Assistant)")
    print("Then you can start the Next.js server separately")
    print("=" * 60)
    
    # Start LocalChat system
    if start_localchat_system():
        print("\n🎉 LocalChat system is running!")
        print("\n📋 Next steps:")
        print("1. Open a new terminal")
        print("2. Navigate to the sonycentral directory")
        print("3. Run: npm run dev")
        print("4. Open http://localhost:3000/chat in your browser")
        print("\n🔗 System Architecture:")
        print("Chat → Middleware → LocalChat Assistant → SQL API → Database")
        print("\n⏹️  Press Ctrl+C to stop the LocalChat system")
        
        try:
            # Keep the process running
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n👋 Stopping LocalChat system...")
    else:
        print("\n❌ Failed to start LocalChat system")
        print("Please check the error messages above and try again")

if __name__ == "__main__":
    main()
