# Corrected CSP Solution for Upwork Chrome Extension

## The Real Problem

Upwork's CSP policy includes `script-src 'none'` which means:
- NO inline scripts allowed
- NO external scripts allowed  
- NO eval() or Function() constructor
- NO blob: or data: URLs for scripts
- This is enforced in "Report Only" mode but still blocks execution

## Why the Document's Solution Won't Work

The research document suggests using `world: "MAIN"` will bypass CSP, but this is **incorrect**:
- Scripts injected with `world: "MAIN"` still run under the page's CSP
- Upwork's `script-src 'none'` will still block them
- The only scripts that can run are those already included in Upwork's HTML with proper nonces

## The Actual Working Solution

### Option 1: Stay in ISOLATED World (Recommended)
```javascript
// manifest.json
{
  "content_scripts": [{
    "matches": ["*://*.upwork.com/*"],
    "js": ["content-script.js"],
    "run_at": "document_start",
    "world": "ISOLATED" // NOT "MAIN"
  }]
}
```

Content scripts in ISOLATED world:
- Are NOT subject to page CSP
- Can access DOM but not page's JavaScript context
- Can communicate with page via CustomEvents or postMessage

### Option 2: Use MutationObserver for Data Extraction
Since we can't intercept fetch/XHR in the main world due to CSP, extract data from DOM:

```javascript
// content-script.js (ISOLATED world)
const jobObserver = new MutationObserver((mutations) => {
  // Look for job cards being added to DOM
  const jobElements = document.querySelectorAll('[data-test="job-tile"]');
  jobElements.forEach(extractJobData);
});

jobObserver.observe(document.body, {
  childList: true,
  subtree: true
});

function extractJobData(element) {
  const job = {
    title: element.querySelector('[data-test="job-title"]')?.textContent,
    description: element.querySelector('[data-test="job-description"]')?.textContent,
    budget: element.querySelector('[data-test="budget"]')?.textContent,
    // ... extract other fields
  };
  
  chrome.runtime.sendMessage({ 
    type: 'JOB_COLLECTED', 
    job 
  });
}
```

### Option 3: Intercept at Service Worker Level
Use declarativeNetRequest to monitor API calls:

```javascript
// manifest.json
{
  "permissions": ["declarativeNetRequest", "declarativeNetRequestFeedback"],
  "host_permissions": ["*://api.upwork.com/*"]
}

// background.js
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  if (info.request.url.includes('/graphql')) {
    // Can't get response body, but can track requests
    console.log('GraphQL request detected:', info.request);
  }
});
```

### Option 4: Use DevTools Protocol (Advanced)
For full network interception with response bodies:

```javascript
// background.js
chrome.debugger.attach({tabId}, "1.3", () => {
  chrome.debugger.sendCommand({tabId}, "Network.enable", {}, () => {
    chrome.debugger.onEvent.addListener((source, method, params) => {
      if (method === "Network.responseReceived") {
        const {requestId, response} = params;
        if (response.url.includes('/graphql')) {
          // Get response body
          chrome.debugger.sendCommand(
            {tabId}, 
            "Network.getResponseBody", 
            {requestId},
            (result) => {
              const jobs = JSON.parse(result.body);
              // Process jobs
            }
          );
        }
      }
    });
  });
});
```

## The Real Working Approach

### 1. Hybrid Strategy
- Use MutationObserver in content script (ISOLATED) for DOM data
- Use postMessage for limited communication with page
- Fall back to DOM scraping when network interception fails

### 2. Proper Script Injection (If CSP Allows)
Check if CSP has exceptions:
```javascript
// Check CSP headers
const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content;
if (!csp || !csp.includes("script-src 'none'")) {
  // Can inject scripts
  injectNetworkInterceptor();
} else {
  // Must use DOM extraction
  startDOMObserver();
}
```

### 3. Server-Side Proxy (Ultimate Solution)
If client-side is too restrictive:
- Route requests through your own server
- Server fetches Upwork data with proper auth
- Returns clean JSON to extension
- Avoids all CSP issues

## Specific Fixes for Current Extension

### 1. Remove MAIN world injection
```javascript
// DON'T DO THIS
"world": "MAIN" // Will be blocked by CSP

// DO THIS INSTEAD
"world": "ISOLATED" // Runs in extension context
```

### 2. Fix collector-injected.js
The external collector script won't work with `script-src 'none'`. Instead:

```javascript
// content-script.js
// Run in ISOLATED world, extract from DOM
function collectJobsFromDOM() {
  const jobs = [];
  
  // Option 1: Extract from visible elements
  document.querySelectorAll('[data-test*="job"]').forEach(el => {
    jobs.push(extractJobFromElement(el));
  });
  
  // Option 2: Find data in script tags (if any)
  document.querySelectorAll('script[type="application/json"]').forEach(script => {
    try {
      const data = JSON.parse(script.textContent);
      if (data.jobs) jobs.push(...data.jobs);
    } catch (e) {}
  });
  
  return jobs;
}
```

### 3. Network Interception Alternative
Since we can't override fetch/XHR due to CSP, monitor DOM for AJAX indicators:

```javascript
// Watch for loading states
const loadingObserver = new MutationObserver(() => {
  const isLoading = document.querySelector('[data-loading="true"]');
  if (!isLoading) {
    // Data has loaded, extract it
    setTimeout(collectJobsFromDOM, 100);
  }
});
```

## Summary

The research document's approach of using `world: "MAIN"` won't work with Upwork's strict CSP. Instead:

1. **Use ISOLATED world** for content scripts
2. **Extract data from DOM** instead of intercepting network
3. **Use MutationObserver** to detect when new jobs load
4. **Consider DevTools API** for full network access
5. **Implement fallback strategies** for when network interception fails

The key insight: **You cannot bypass CSP with extension APIs**. You must work within its constraints or extract data after it's rendered in the DOM.
