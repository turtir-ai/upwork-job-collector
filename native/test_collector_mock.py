#!/usr/bin/env python3
"""
Test the collector with mock data
"""

import json
import struct
import subprocess
import os
from pathlib import Path

def test_collector():
    """Test the collector with mock data"""
    
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
    
    # Prepare test message - use test action to get mock data
    test_message = {
        "action": "test"
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
        print(f"\nResponse has 'ok': {response_data.get('ok')}")
        print(f"Number of jobs returned: {len(response_data.get('jobs', []))}")
        
        if response_data.get('jobs'):
            print("\nFirst job:")
            print(json.dumps(response_data['jobs'][0], indent=2))
        
        if response_data.get('note'):
            print(f"\nNote: {response_data['note']}")
        
        # Terminate process
        process.terminate()
        
        return response_data.get('ok') == True and len(response_data.get('jobs', [])) > 0
        
    except Exception as e:
        print(f"Error during test: {e}")
        process.terminate()
        return False

if __name__ == "__main__":
    print("Testing collector with mock data...")
    print("=" * 50)
    if test_collector():
        print("\n✅ Collector is working correctly with mock data!")
        print("\nNext steps:")
        print("1. Restart Chrome")
        print("2. Open the Upwork AI Assistant extension")
        print("3. Click 'Run Collector (Python)' button")
        print("4. The collector will now run the improved Playwright script")
    else:
        print("\n❌ Collector test failed!")
        print("\nTroubleshooting:")
        print("1. Check if Python is installed correctly")
        print("2. Check the scripts/collect_upwork_data.py file exists")
        print("3. Check the error messages above")
