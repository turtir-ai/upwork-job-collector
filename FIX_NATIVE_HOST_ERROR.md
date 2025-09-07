# Fix for "Native host error: Unknown action"

## Problem
The extension is sending a message to the native host without an `action` field, causing the error:
"Native host error: Unknown action: . Please run install script."

## Solution

The native host is working correctly (verified by tests). The issue is in how the extension sends messages.

## What's Working ✅
- Native host is installed and registered correctly
- Native host responds to all test actions:
  - `ping` - Returns pong
  - `collect_jobs` - Returns mock jobs
  - `run_collector` - Collects jobs
  - `import_har` - Imports from HAR file
  - `analyze_job` - Analyzes job data

## How to Fix the Extension

When the "Run Collector (Python)" button is clicked, the extension should send:

```javascript
// Correct message format
chrome.runtime.sendNativeMessage('com.upwork.ai.collector', {
    action: 'run_collector',  // REQUIRED FIELD
    url: window.location.href  // Optional
}, function(response) {
    if (response && response.success) {
        console.log('Jobs collected:', response.jobs);
        // Display jobs in UI
    } else {
        console.error('Error:', response.error);
    }
});
```

## Available Actions

### 1. Collect Jobs
```javascript
{
    action: 'collect_jobs',
    url: 'https://www.upwork.com/nx/find-work/'
}
```

### 2. Run Collector (same as collect_jobs)
```javascript
{
    action: 'run_collector'
}
```

### 3. Import HAR File
```javascript
{
    action: 'import_har',
    har_path: 'C:\\Users\\TT\\upwork2\\www.upwork.com.har'
}
```

### 4. Analyze Job
```javascript
{
    action: 'analyze_job',
    job: {
        title: 'Job Title',
        description: 'Job Description',
        skills: ['Python', 'Scrapy']
    }
}
```

## Testing the Native Host

Run the comprehensive test to verify everything works:
```bash
cd C:\Users\TT\upwork2\native
python test_collector.py
```

All tests should pass ✅

## Current Status
- Native Host: ✅ Working
- Extension Communication: ❌ Needs fix (missing 'action' field)

## Quick Fix for Extension

If you can't modify the extension source, the native host already handles this gracefully by returning an error message. The extension should check for errors and display them to the user.

## For Developers

To fix this in the extension's content script or service worker:

1. Always include an `action` field in messages
2. Handle error responses from the native host
3. Display appropriate feedback to the user

Example error handling:
```javascript
function runCollector() {
    const message = {
        action: 'run_collector',  // THIS IS REQUIRED!
        url: window.location.href
    };
    
    chrome.runtime.sendNativeMessage('com.upwork.ai.collector', message, 
        function(response) {
            if (chrome.runtime.lastError) {
                console.error('Native host error:', chrome.runtime.lastError);
                showError('Failed to connect to native host');
                return;
            }
            
            if (!response) {
                showError('No response from native host');
                return;
            }
            
            if (response.success) {
                showSuccess(`Collected ${response.count} jobs`);
                displayJobs(response.jobs);
            } else {
                showError(response.error || 'Unknown error');
            }
        }
    );
}
```

## Logs Location

Check native host logs for debugging:
```
C:\Users\TT\upwork2\native\logs\native_host_20250907.log
```

The logs show exactly what messages are being received and sent.
