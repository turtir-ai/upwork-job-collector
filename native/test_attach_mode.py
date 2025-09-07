#!/usr/bin/env python3
"""
Test the collector with attach mode (simulating what the extension sends)
"""

import json
import struct
import subprocess
import os
from pathlib import Path

def test_attach_mode():
    """Test the collector with attach mode message"""
    
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
    
    # This is likely what the extension is sending
    test_message = {
        "mode": "attach",
        "list_scroll": 4,
        "details": 5
        # Note: No CDP endpoint, which was causing the error
    }
    
    print(f"Testing with message: {json.dumps(test_message, indent=2)}")
    
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
        
        print("\nResponse received:")
        print(json.dumps(response_data, indent=2))
        
        # Terminate process
        process.terminate()
        
        return response_data.get('ok', False)
        
    except Exception as e:
        print(f"Error during test: {e}")
        process.terminate()
        return False

if __name__ == "__main__":
    print("Testing attach mode (what extension sends)...")
    print("=" * 50)
    if test_attach_mode():
        print("\n✅ Attach mode handled correctly!")
        print("The collector will now run in fresh mode automatically")
    else:
        print("\n❌ Test failed!")
        print("Check the error message above")
