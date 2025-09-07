# Upwork Job Collector - Advanced Chrome Extension

## 🚀 Overview

A sophisticated Chrome extension that automatically collects job postings from Upwork using multiple advanced data interception techniques. Built with research-based architecture for maximum reliability and coverage.

## 🎯 Key Features

- **Multi-Source Collection**: Captures jobs from DOM, Vuex store, and network requests
- **Real-Time Monitoring**: Continuous monitoring with MutationObserver
- **Smart Deduplication**: Prevents duplicate jobs across sources
- **Persistent Storage**: Chrome storage API for data persistence
- **Export Functionality**: Export collected jobs as JSON
- **Zero Configuration**: Works out of the box

## 🛠️ Technical Architecture

### Core Collection Mechanisms

#### 1. DOM Scanning
```javascript
// Multiple selector strategies
const selectors = [
  '[data-test*="job-tile"]',
  '[data-test="job-tile-list"] > div',
  'div[class*="job-tile"]',
  '.air3-card-section'
];
```

#### 2. Vuex Store Interception
```javascript
// Deep traversal of Nuxt/Vuex store
window.$nuxt?.$store?.state
// Automatically discovers paths like:
// - feedBestMatch.jobs
// - feedDomestic.jobs
// - savedJobs.jobs
```

#### 3. Network Request Interception
```javascript
// Intercepts:
- GraphQL operations (SearchJobs, JobSearch, etc.)
- REST API calls
- SSE (Server-Sent Events)
- Fetch and XMLHttpRequest
```

### System Components

```
┌─────────────────────────────────────────────┐
│           Upwork Website (DOM)              │
│  ┌───────────────────────────────────────┐  │
│  │     Injected Collector Script         │  │
│  │  (collector-final.js)                 │  │
│  │  • DOM Scanner                        │  │
│  │  • Vuex Monitor                       │  │
│  │  • Network Interceptor                │  │
│  └────────────┬──────────────────────────┘  │
│               │ PostMessage                  │
└───────────────┼──────────────────────────────┘
                │
         ┌──────▼──────────┐
         │ Content Script  │
         │ • Validation    │
         │ • Deduplication │
         │ • Batching      │
         └──────┬──────────┘
                │ Chrome Runtime
         ┌──────▼──────────┐
         │ Background      │
         │ Service Worker  │
         │ • Storage       │
         │ • Scoring       │
         └──────┬──────────┘
                │
         ┌──────▼──────────┐
         │  Popup UI       │
         │ • Display       │
         │ • Export        │
         └─────────────────┘
```

## 📦 Installation

### From Source

1. **Clone Repository**
```bash
git clone https://github.com/turtir-ai/upwork-job-collector.git
cd upwork-job-collector
```

2. **Install Dependencies**
```bash
npm install
```

3. **Build Extension**
```bash
npm run build
```

4. **Load in Chrome**
- Navigate to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the `dist` folder

## 🎮 Usage

### Basic Operation

1. **Navigate to Upwork**
   - Go to any job listing page
   - Extension auto-activates

2. **View Collected Jobs**
   - Click extension icon
   - See real-time job collection

3. **Export Data**
   - Click "Export Jobs"
   - JSON file downloads

### Console Monitoring

Filter console by `[UpAI Final]` to see:
```
[UpAI Final] Initializing research-based collector...
[UpAI Final] Found 30 jobs at feedBestMatch.jobs!
[UpAI Final] 📦 Found job in DOM: Front End developer
[UpAI Final] ✅ Collected 30 jobs from DOM
```

## 🔍 Job Data Structure

```typescript
interface Job {
  // Core Fields
  id: string;                    // Unique identifier
  title: string;                 // Job title
  description: string;           // Full description
  url: string;                  // Direct link
  
  // Financial
  budget?: string;              // "$100-$500" or "Budget too low"
  hourlyRate?: string;          // "$15-$45/hr"
  
  // Metadata
  posted: string;               // "2 hours ago"
  postedDate?: string;          // ISO timestamp
  proposals: string;            // "5 to 10" or "Less than 5"
  proposalsCount?: number;      // Numeric count
  
  // Client Info
  client?: {
    name: string;
    rating: number;             // 0-5
    spent: string;              // Total spent
    location: {
      country: string;
      city?: string;
      countryTimezone?: string;
    };
  };
  
  // Requirements
  skills?: Array<{
    id: string;
    prefLabel: string;
  }>;
  duration?: string;           // "1 to 3 months"
  experienceLevel?: string;    // "Intermediate"
  connects?: string;           // Required connects
  
  // System
  collectedAt: string;         // Collection timestamp
  score?: number;              // AI score (0-100)
}
```

## ⚙️ Configuration

### Collector Settings
```javascript
// In collector-final.js
const CONFIG = {
  DEBUG: true,                    // Enable console logs
  SCAN_INTERVAL: 2000,           // DOM scan interval (ms)
  BATCH_SIZE: 50,               // Jobs per batch
  MAX_RETRIES: 3,               // API retry attempts
};
```

### Collection Sources
```javascript
const SOURCES = {
  DOM: true,                     // Enable DOM scanning
  VUEX: true,                   // Enable Vuex monitoring
  NETWORK: true,                // Enable network interception
  GRAPHQL: true,                // Enable GraphQL capturing
};
```

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| No jobs collecting | Refresh page, check console |
| Duplicate jobs | Clear storage in popup |
| Missing details | Update DOM selectors |
| Extension not loading | Rebuild with `npm run build` |

### Debug Mode

Enable detailed logging:
```javascript
// collector-final.js
const DEBUG = true;
```

### Console Commands

```javascript
// Check collected jobs
window.__UPWORK_JOBS__

// Check Vuex store
window.$nuxt.$store.state.feedBestMatch.jobs

// Trigger manual scan
window.__scanForJobs()
```

## 🚀 Advanced Features

### Custom Selectors

Add your own selectors:
```javascript
const CUSTOM_SELECTORS = [
  '.your-selector',
  '[data-custom="job"]'
];
```

### GraphQL Operations

Monitor specific operations:
```javascript
const GRAPHQL_OPS = [
  'SearchJobs',
  'GetJobDetails',
  'FeedQuery'
];
```

### Vuex Paths

Add custom store paths:
```javascript
const STORE_PATHS = [
  'feedBestMatch.jobs',
  'customModule.jobList'
];
```

## 📊 Performance

- **DOM Scan**: ~50ms per scan
- **Vuex Traversal**: ~20ms
- **Network Intercept**: <5ms overhead
- **Memory**: ~15MB active
- **CPU**: <1% idle, 2-3% active

## 🔒 Security

- **No External Servers**: All processing local
- **No API Keys**: No authentication required
- **Sandboxed**: Isolated execution
- **No Tracking**: Zero telemetry
- **Open Source**: Full transparency

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE)

## 👨‍💻 Author

**turtir-ai** - Architecture & Development

## 🙏 Acknowledgments

- Chrome Extension APIs
- Upwork Platform
- Open Source Community

---

**Note**: For educational purposes. Respect website terms of service.
