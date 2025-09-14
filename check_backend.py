#!/usr/bin/env python3
"""
Check if backend server is running and provide instructions
"""

import requests
import subprocess
import time
import sys
import os

def check_backend():
    """Check if backend server is running"""
    try:
        response = requests.get('http://localhost:10000/api/health', timeout=5)
        if response.status_code == 200:
            print("✅ Backend server is running!")
            return True
    except requests.exceptions.RequestException:
        print("❌ Backend server is not running")
        return False

def start_backend():
    """Start the backend server"""
    print("🚀 Starting backend server...")
    
    # Change to backend directory
    backend_dir = os.path.join(os.getcwd(), 'backend')
    
    try:
        # Start the server in background
        process = subprocess.Popen(
            ['npm', 'run', 'dev'],
            cwd=backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        print("⏳ Waiting for server to start...")
        time.sleep(3)
        
        # Check if it's running now
        if check_backend():
            print("✅ Backend server started successfully!")
            return True
        else:
            print("❌ Backend server failed to start")
            return False
            
    except Exception as e:
        print(f"❌ Error starting backend: {e}")
        return False

def main():
    print("🔍 Checking backend server status...")
    
    if check_backend():
        print("🎉 Backend is ready!")
        return
    
    print("\n📋 Backend server is not running. Here's what you need to do:")
    print("1. Open a new terminal/command prompt")
    print("2. Navigate to the backend directory:")
    print("   cd lifemaps/backend")
    print("3. Start the server:")
    print("   npm run dev")
    print("\nOr run this command in the backend directory:")
    print("npm run dev")
    
    # Ask if user wants to start it automatically
    try:
        choice = input("\nWould you like me to try starting the backend server? (y/n): ").lower()
        if choice in ['y', 'yes']:
            start_backend()
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")

if __name__ == "__main__":
    main()
