#!/usr/bin/env python3
"""
Test script for native messaging host
Run this to verify the native host is working correctly
"""

import json
import struct
import subprocess
import os
from pathlib import Path

def test_native_host():
    """Test the native host by sending a ping message"""
    
    # Path to the batch file
    batch_file = Path(__file__).parent / "collector_runner.bat"
    
    if not batch_file.exists():
        print(f"Error: Batch file not found at {batch_file}")
        return False
    
    # Start the native host process
    process = subprocess.Popen(
        str(batch_file),
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=True
    )
    
    # Prepare test message
    test_message = {
        "action": "ping"
    }
    
    # Encode message
    encoded_message = json.dumps(test_message).encode('utf-8')
    message_length = struct.pack('I', len(encoded_message))
    
    try:
        # Send message
        process.stdin.write(message_length)
        process.stdin.write(encoded_message)
        process.stdin.flush()
        
        # Read response length
        raw_length = process.stdout.read(4)
        if not raw_length or len(raw_length) != 4:
            print("Error: Could not read response length")
            return False
        
        # Unpack response length
        response_length = struct.unpack('I', raw_length)[0]
        
        # Read response
        response = process.stdout.read(response_length).decode('utf-8')
        response_data = json.loads(response)
        
        print("Test successful!")
        print(f"Response: {json.dumps(response_data, indent=2)}")
        
        # Terminate process
        process.terminate()
        
        return response_data.get('action') == 'pong'
        
    except Exception as e:
        print(f"Error during test: {e}")
        process.terminate()
        return False

if __name__ == "__main__":
    print("Testing native messaging host...")
    if test_native_host():
        print("\n✅ Native host is working correctly!")
    else:
        print("\n❌ Native host test failed!")
        print("\nCheck the log file at: native/logs/native_host_*.log")
