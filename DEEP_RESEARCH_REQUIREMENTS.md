# Deep Research Requirements for Upwork Chrome Extension Network Interception

## Problem Statement
Chrome extension is not capturing job data from Upwork's API calls despite:
- Content script loading successfully
- Collector script initializing
- No CSP errors
- DOM extraction working partially

## Research Areas Needed

### 1. Upwork API Analysis
**Research Goal**: Understand Upwork's exact API structure and data flow

**What to find**:
- Exact API endpoints Upwork uses for job listings (GraphQL or REST)
- Request/response structure and headers
- Authentication mechanisms and tokens
- Pagination and data loading patterns
- WebSocket connections if any
- How Upwork's Vue.js app (SUIT2) loads data

**How to research**:
1. Open Chrome DevTools Network tab on Upwork job pages
2. Filter by XHR/Fetch requests
3. Look for patterns like:
   - `/api/` endpoints
   - GraphQL endpoints (usually `/graphql`)
   - JSON responses with job data
4. Document exact URL patterns, request methods, and response structures

### 2. Network Interception Timing Issues
**Research Goal**: Understand when and how to intercept requests

**What to find**:
- Does Upwork use Service Workers that might interfere?
- Are requests made before our script loads?
- Does Upwork use custom fetch wrappers?
- Any request signing or encryption?

**Key questions**:
- When does Upwork load job data? (initial load vs dynamic loading)
- Are there race conditions with script injection?
- Does Upwork detect and block interception attempts?

### 3. Chrome Extension Manifest V3 Limitations
**Research Goal**: Understand current limitations and workarounds

**What to find**:
- Best practices for network interception in Manifest V3
- Differences between content script and injected script contexts
- How to properly intercept both fetch and XMLHttpRequest
- Alternative approaches (declarativeNetRequest, webRequest in service worker)

### 4. Upwork's Anti-Bot Measures
**Research Goal**: Identify any detection or blocking mechanisms

**What to find**:
- Does Upwork use fingerprinting libraries?
- Are there rate limiting mechanisms?
- Any detection of browser automation?
- Headers or tokens that validate requests?

### 5. Vue.js and Vuex State Management
**Research Goal**: Access data directly from Vue/Vuex store

**What to find**:
- How to access Vue instance from injected script
- Vuex store structure for job data
- Event hooks for data updates
- Direct access to component data

## Specific Technical Information Needed

### Network Request Details
```javascript
// Need to capture:
{
  url: "exact API endpoint",
  method: "GET/POST",
  headers: {
    // All headers especially:
    "Authorization": "...",
    "X-Requested-With": "...",
    "Content-Type": "..."
  },
  body: "request payload structure",
  response: {
    // Response structure with job data location
  }
}
```

### Vue Instance Access
```javascript
// Need to find:
- window.__VUE__ or similar global
- How to access: vm.$store.state
- Vuex modules structure
- Component data paths
```

### Timing and Lifecycle
```javascript
// Need to understand:
- DOMContentLoaded vs load vs Vue mounted
- When API calls are made
- How to ensure our script runs first
- Race condition solutions
```

## Research Methods

1. **Manual Testing**:
   - Open Upwork in incognito mode
   - Record HAR file of full session
   - Document all network requests
   - Note timing of each request

2. **Code Analysis**:
   - Inspect Upwork's JavaScript bundles
   - Look for API call functions
   - Find data processing logic
   - Identify state management patterns

3. **Community Research**:
   - Search for other Upwork extensions
   - Check GitHub for similar projects
   - Look for Upwork API documentation (official or reverse-engineered)
   - Check browser extension forums for similar issues

4. **Testing Different Approaches**:
   - Try MutationObserver for DOM changes
   - Test Service Worker interception
   - Experiment with different injection timings
   - Try hooking into Vue lifecycle

## Output Requirements

After research, provide:
1. Exact API endpoints and request formats
2. Correct interception method for Manifest V3
3. Timing solution to catch all requests
4. Alternative data extraction methods
5. Complete working code example

## Priority Questions to Answer

1. **What exact URL pattern does Upwork use for job data?**
   - Is it `/api/jobs/...`?
   - Is it GraphQL at `/graphql`?
   - Multiple endpoints?

2. **When are these requests made?**
   - Page load?
   - Scroll events?
   - User interactions?

3. **What's in the response?**
   - JSON structure
   - Where job data is located
   - How to parse it

4. **Why isn't our current interception working?**
   - Wrong timing?
   - Wrong method?
   - Being blocked?

5. **What's the best alternative if network interception fails?**
   - Vue store access?
   - DOM mutation observation?
   - Service worker approach?
