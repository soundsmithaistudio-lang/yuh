#!/usr/bin/env python3
"""
Desktop launcher for Lambeck LLM Studio.

This script starts the FastAPI server and automatically opens the web interface
in the user's default browser. It's designed to be used as the entry point
for the PyInstaller-built desktop application.
"""

import os
import sys
import time
import threading
import webbrowser
from pathlib import Path

import uvicorn


def get_app_directory():
    """Get the directory where the application files are located.
    
    When running as a PyInstaller bundle, this will be the temporary directory
    where files are extracted. When running as a script, it's the parent directory.
    """
    if getattr(sys, 'frozen', False):
        # Running as PyInstaller bundle
        return Path(sys._MEIPASS)
    else:
        # Running as script
        return Path(__file__).parent.parent


def start_server():
    """Start the FastAPI server."""
    app_dir = get_app_directory()
    
    # Change to the app directory so relative paths work correctly
    os.chdir(app_dir)
    
    # Add the app directory to Python path
    sys.path.insert(0, str(app_dir))
    
    try:
        # Import the FastAPI app
        from app import app
        
        # Start the server
        uvicorn.run(
            app,
            host="127.0.0.1",
            port=8000,
            log_level="info",
            access_log=False
        )
    except ImportError as e:
        print(f"Error importing app: {e}")
        print(f"Current directory: {os.getcwd()}")
        print(f"Python path: {sys.path}")
        input("Press Enter to exit...")
        sys.exit(1)
    except Exception as e:
        print(f"Error starting server: {e}")
        input("Press Enter to exit...")
        sys.exit(1)


def open_browser():
    """Open the web interface in the default browser after a short delay."""
    time.sleep(2)  # Wait for server to start
    
    url = "http://127.0.0.1:8000"
    print(f"Opening browser to {url}")
    
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"Could not open browser automatically: {e}")
        print(f"Please open your browser and navigate to {url}")


def main():
    """Main entry point for the desktop launcher."""
    print("=" * 50)
    print("  Lambeck's Large Language Model : Label")
    print("  Desktop Launcher")
    print("  Publisher: Lambeck Inc")
    print("  Version: 12.112.2")
    print("=" * 50)
    print()
    
    print("Starting LLM Studio...")
    print("Server will start on http://127.0.0.1:8000")
    print()
    
    # Start browser opening in a separate thread
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    # Start the server (this will block)
    try:
        start_server()
    except KeyboardInterrupt:
        print("\nShutting down...")
    except Exception as e:
        print(f"Unexpected error: {e}")
        input("Press Enter to exit...")


if __name__ == "__main__":
    main()