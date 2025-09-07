#!/usr/bin/env python3
"""
Test script for native host collector functionality
Tests all available actions
"""

import json
import struct
import subprocess
import os
from pathlib import Path

def send_and_receive(process, message):
    """Send a message and receive response"""
    # Encode message
    encoded_message = json.dumps(message).encode('utf-8')
    message_length = struct.pack('I', len(encoded_message))
    
    # Send message
    process.stdin.write(message_length)
    process.stdin.write(encoded_message)
    process.stdin.flush()
    
    # Read response length
    raw_length = process.stdout.read(4)
    if not raw_length or len(raw_length) != 4:
        print("Error: Could not read response length")
        return None
    
    # Unpack response length
    response_length = struct.unpack('I', raw_length)[0]
    
    # Read response
    response = process.stdout.read(response_length).decode('utf-8')
    return json.loads(response)

def test_all_actions():
    """Test all native host actions"""
    
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
    
    try:
        print("=" * 60)
        print("Testing Native Host Collector")
        print("=" * 60)
        
        # Test 1: Ping
        print("\n1. Testing ping...")
        response = send_and_receive(process, {"action": "ping"})
        if response and response.get('action') == 'pong':
            print("   ✅ Ping successful")
        else:
            print("   ❌ Ping failed")
            print(f"   Response: {response}")
        
        # Test 2: Empty action (should return error)
        print("\n2. Testing empty action...")
        response = send_and_receive(process, {})
        if response and not response.get('success'):
            print("   ✅ Empty action handled correctly")
            print(f"   Error message: {response.get('error')}")
        else:
            print("   ❌ Empty action not handled properly")
        
        # Test 3: Collect jobs
        print("\n3. Testing job collection...")
        response = send_and_receive(process, {
            "action": "collect_jobs",
            "url": "https://www.upwork.com/nx/find-work/"
        })
        if response and response.get('success'):
            jobs = response.get('jobs', [])
            print(f"   ✅ Collected {len(jobs)} jobs")
            if jobs:
                print(f"   First job: {jobs[0].get('title', 'No title')}")
        else:
            print("   ❌ Job collection failed")
            print(f"   Response: {response}")
        
        # Test 4: Run collector (alias)
        print("\n4. Testing run_collector action...")
        response = send_and_receive(process, {
            "action": "run_collector"
        })
        if response and response.get('success'):
            print(f"   ✅ Collector ran successfully")
            print(f"   Jobs count: {response.get('count', 0)}")
        else:
            print("   ❌ Collector failed")
        
        # Test 5: Import HAR (if file exists)
        print("\n5. Testing HAR import...")
        har_path = r"C:\Users\TT\upwork2\www.upwork.com.har"
        if os.path.exists(har_path):
            response = send_and_receive(process, {
                "action": "import_har",
                "har_path": har_path
            })
            if response and response.get('success'):
                print(f"   ✅ HAR imported successfully")
                print(f"   Jobs count: {response.get('count', 0)}")
            else:
                print("   ❌ HAR import failed")
                print(f"   Response: {response}")
        else:
            print(f"   ⚠️  HAR file not found at {har_path}")
        
        # Test 6: Analyze job
        print("\n6. Testing job analysis...")
        response = send_and_receive(process, {
            "action": "analyze_job",
            "job": {
                "title": "Web Scraping Expert Needed",
                "description": "Need Python developer for scraping project",
                "skills": ["Python", "Scrapy", "BeautifulSoup"]
            }
        })
        if response and response.get('success'):
            analysis = response.get('analysis', {})
            print(f"   ✅ Job analyzed successfully")
            print(f"   Score: {analysis.get('score', 'N/A')}")
            print(f"   Match: {analysis.get('match_percentage', 'N/A')}%")
            print(f"   Recommendation: {analysis.get('recommendation', 'N/A')}")
        else:
            print("   ❌ Job analysis failed")
        
        print("\n" + "=" * 60)
        print("All tests completed!")
        print("=" * 60)
        
        # Terminate process
        process.terminate()
        return True
        
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        process.terminate()
        return False

if __name__ == "__main__":
    print("Testing Native Messaging Host Collector...")
    print("This will test all available actions\n")
    
    if test_all_actions():
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Some tests failed!")
        print("\nCheck the log file at: native/logs/native_host_*.log")
