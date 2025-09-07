// Upwork AI Final Collector - Based on Deep Research
// Targets Upwork's specific GraphQL operations
(function() {
  'use strict';
  
  console.log('[UpAI Final] Initializing research-based collector...');
  
  // Known Upwork GraphQL operations from research
  const UPWORK_OPERATIONS = [
    'MarketplaceJobPostingsSearch',
    'marketplaceJobPostingsSearch',
    'marketplaceJobPosting',
    'FindWorkHome',
    'FindWorkHomeNuxt',
    'jobPostings',
    'searchResults',
    'SearchTalentQuery',
    'BestMatches'
  ];
  
  // Store collected jobs
  const collectedJobs = new Map();
  let jobBatch = [];
  
  // Send jobs to content script
  function sendJobs() {
    if (jobBatch.length > 0) {
      console.log(`[UpAI Final] Sending ${jobBatch.length} jobs to extension`);
      window.postMessage({
        type: 'UPWORK_JOBS_COLLECTED',
        source: 'final-collector',
        jobs: jobBatch,
        timestamp: Date.now()
      }, '*');
      jobBatch = [];
    }
  }
  
  // Process Upwork GraphQL response structure
  function extractUpworkJobs(data) {
    const jobs = [];
    
    // Handle GraphQL response structure from research
    // Path: data.marketplaceJobPostingsSearch.edges[].node
    if (data?.data?.marketplaceJobPostingsSearch?.edges) {
      console.log('[UpAI Final] Found marketplaceJobPostingsSearch with', data.data.marketplaceJobPostingsSearch.edges.length, 'edges');
      data.data.marketplaceJobPostingsSearch.edges.forEach(edge => {
        if (edge.node) {
          const job = processJobNode(edge.node);
          if (job) jobs.push(job);
        }
      });
    }
    
    // Check for results directly
    if (data?.data?.marketplaceJobPostingsSearch?.results) {
      console.log('[UpAI Final] Found results array with', data.data.marketplaceJobPostingsSearch.results.length, 'items');
      data.data.marketplaceJobPostingsSearch.results.forEach(item => {
        const job = processJobNode(item);
        if (job) jobs.push(job);
      });
    }
    
    // Alternative paths
    const searchPaths = [
      { path: data?.data?.search?.jobs, name: 'search.jobs' },
      { path: data?.data?.marketplace?.postings, name: 'marketplace.postings' },
      { path: data?.data?.jobPostings?.edges, name: 'jobPostings.edges' },
      { path: data?.data?.findWork?.edges, name: 'findWork.edges' },
      { path: data?.data?.findWorkHomeNuxt?.edges, name: 'findWorkHomeNuxt.edges' },
      { path: data?.data?.bestMatches?.edges, name: 'bestMatches.edges' }
    ];
    
    searchPaths.forEach(({ path, name }) => {
      if (Array.isArray(path)) {
        console.log(`[UpAI Final] Found ${path.length} items at ${name}`);
        path.forEach(item => {
          const job = processJobNode(item.node || item);
          if (job) jobs.push(job);
        });
      }
    });
    
    // Also check if data itself is an array (non-GraphQL response)
    if (Array.isArray(data)) {
      console.log('[UpAI Final] Data is array with', data.length, 'items');
      data.forEach(item => {
        const job = processJobNode(item);
        if (job) jobs.push(job);
      });
    }
    
    return jobs;
  }
  
  // Process a job node based on Upwork's structure
  function processJobNode(node) {
    if (!node || !node.title) return null;
    
    return {
      id: node.id || node.uid || node.ciphertext || '',
      title: node.title || '',
      description: node.description || node.publicDescription || '',
      url: node.ciphertext ? `https://www.upwork.com/jobs/~${node.ciphertext}` : (node.jobPostingUrl || ''),
      budget: formatBudget(node.budgetRange || node.budget),
      hourlyRate: formatHourlyRate(node.hourlyBudget || node.hourlyRate),
      skills: (node.skills || []).map(s => s.name || s),
      client: {
        name: node.client?.name || '',
        location: node.client?.location || node.buyer?.location?.country || '',
        rating: node.client?.totalFeedback || '',
        spent: node.client?.totalSpent?.amount || ''
      },
      postedDate: node.postedDate || node.publishedOn || '',
      proposalsCount: node.proposalsCount || node.applicants || 0,
      connects: node.connectsRequired || node.connects || '',
      duration: node.duration || node.estimatedDuration || '',
      experienceLevel: node.tier || node.contractorTier || ''
    };
  }
  
  function formatBudget(budget) {
    if (!budget) return '';
    if (budget.min && budget.max) {
      return `$${budget.min}-$${budget.max} ${budget.currency || 'USD'}`;
    }
    if (budget.amount) {
      return `$${budget.amount} ${budget.currency || 'USD'}`;
    }
    return '';
  }
  
  function formatHourlyRate(rate) {
    if (!rate) return '';
    if (rate.min && rate.max) {
      return `$${rate.min}-$${rate.max}/hr`;
    }
    return '';
  }
  
  // Store original fetch
  const originalFetch = window.fetch.bind(window);
  
  // Override fetch to intercept GraphQL
  window.fetch = function(...args) {
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : (resource?.url || '');
    
    // Check if this is Upwork GraphQL
    if (url.includes('graphql') || url.includes('/api/') || url.includes('upwork.com')) {
      // Log the operation
      console.log('[UpAI Final] API Request to:', url);
      if (config?.body) {
        try {
          const body = typeof config.body === 'string' ? JSON.parse(config.body) : config.body;
          if (body.operationName || body.query) {
            console.log('[UpAI Final] GraphQL operation:', body.operationName || 'Unknown');
            console.log('[UpAI Final] Query:', body.query?.substring(0, 200));
            
            // Check if it's a job search operation
            if (body.operationName && UPWORK_OPERATIONS.some(op => body.operationName.includes(op))) {
              console.log('[UpAI Final] Job search operation detected!');
              console.log('[UpAI Final] Query variables:', JSON.stringify(body.variables || {}).substring(0, 500));
            }
            
            // Also check query text for job-related keywords
            if (body.query && (body.query.includes('marketplaceJobPostingsSearch') || 
                               body.query.includes('jobPostings') ||
                               body.query.includes('FindWork'))) {
              console.log('[UpAI Final] Job-related query detected in request!');
            }
          }
        } catch (e) {
          console.log('[UpAI Final] Could not parse request body');
        }
      }
    }
    
    // Call original fetch and intercept response
    return originalFetch(...args).then(async response => {
      try {
        const contentType = response.headers.get('content-type');
        
        // Only process JSON responses, skip SSE and other non-JSON
        if (contentType && contentType.includes('application/json')) {
          const cloned = response.clone();
          const text = await cloned.text();
          
          // Skip empty responses
          if (!text || text.trim() === '') {
            return response;
          }
          
          // Skip Server-Sent Events (SSE) or streaming responses
          if (text.startsWith('event:') || text.startsWith('data:') || text.includes('event: message')) {
            console.debug('[UpAI Final] Skipping SSE/streaming response');
            return response;
          }
          
          // Remove XSSI protection if present (from research: )]}',)
          const cleanText = text.replace(/^\)\]\}',?\n?/, '');
          
          // Only try to parse if it looks like JSON
          if (cleanText.trim().startsWith('{') || cleanText.trim().startsWith('[')) {
            try {
              const data = JSON.parse(cleanText);
              
              // Extract jobs if this is a GraphQL response or API response
              if (url.includes('graphql') || url.includes('/api/') || url.includes('upwork.com')) {
                console.log('[UpAI Final] Processing response from:', url);
                console.log('[UpAI Final] Response data structure:', Object.keys(data || {}));
                
                // Log if we have potential job data
                if (data?.data) {
                  console.log('[UpAI Final] GraphQL data fields:', Object.keys(data.data));
                  
                  // Check for various job data paths
                  const jobPaths = [
                    data.data.marketplaceJobPostingsSearch,
                    data.data.findWorkHomeNuxt,
                    data.data.searchResults,
                    data.data.jobPostings,
                    data.data.bestMatches
                  ];
                  
                  jobPaths.forEach((path, index) => {
                    if (path) {
                      console.log(`[UpAI Final] Found data at path ${index}:`, path);
                    }
                  });
                }
                
                const jobs = extractUpworkJobs(data);
                
                if (jobs.length > 0) {
                  console.log(`[UpAI Final] 🎉 Successfully extracted ${jobs.length} jobs from GraphQL`);
                  
                  // Add to batch
                  jobs.forEach(job => {
                    const key = job.id || job.url || job.title;
                    if (!collectedJobs.has(key)) {
                      collectedJobs.set(key, job);
                      jobBatch.push(job);
                      console.log(`[UpAI Final] Added job: ${job.title}`);
                    }
                  });
                  
                  // Send batch
                  setTimeout(sendJobs, 100);
                } else {
                  console.log('[UpAI Final] No jobs found in this response');
                }
                
                // Log pagination info
                if (data?.data?.marketplaceJobPostingsSearch?.pageInfo) {
                  const pageInfo = data.data.marketplaceJobPostingsSearch.pageInfo;
                  console.log('[UpAI Final] Page info:', {
                    hasNextPage: pageInfo.hasNextPage,
                    endCursor: pageInfo.endCursor
                  });
                }
              }
            } catch (e) {
              // Only log errors for GraphQL endpoints
              if (url.includes('graphql')) {
                console.warn('[UpAI Final] Failed to parse GraphQL response:', e.message);
                console.debug('[UpAI Final] First 100 chars:', cleanText.substring(0, 100));
              }
            }
          }
        }
      } catch (e) {
        // Silent fail to not break requests
        console.debug('[UpAI Final] Response processing error:', e.message);
      }
      
      return response;
    });
  };
  
  // Also override XMLHttpRequest for legacy support
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    this._method = method;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };
  
  XMLHttpRequest.prototype.send = function(body) {
    const xhr = this;
    const url = xhr._url;
    
    // Log GraphQL operations
    if (url && url.includes('graphql') && body) {
      try {
        const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
        if (parsedBody.operationName) {
          console.log('[UpAI Final] XHR GraphQL operation:', parsedBody.operationName);
        }
      } catch (e) {}
    }
    
    // Add response listener
    const originalOnReadyStateChange = xhr.onreadystatechange;
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          if (url && url.includes('graphql')) {
            const contentType = xhr.getResponseHeader('content-type');
            if (contentType?.includes('application/json')) {
              const responseText = xhr.responseText;
              
              // Skip empty or SSE responses
              if (!responseText || responseText.startsWith('event:') || responseText.startsWith('data:')) {
                return;
              }
              
              // Remove XSSI protection
              const cleanText = responseText.replace(/^\)\]\}',?\n?/, '');
              
              // Only parse if it looks like JSON
              if (cleanText.trim().startsWith('{') || cleanText.trim().startsWith('[')) {
                try {
                  const data = JSON.parse(cleanText);
                  
                  const jobs = extractUpworkJobs(data);
                  if (jobs.length > 0) {
                    console.log(`[UpAI Final] XHR found ${jobs.length} jobs`);
                    
                    jobs.forEach(job => {
                      const key = job.id || job.url || job.title;
                      if (!collectedJobs.has(key)) {
                        collectedJobs.set(key, job);
                        jobBatch.push(job);
                      }
                    });
                    
                    setTimeout(sendJobs, 100);
                  }
                } catch (parseErr) {
                  console.debug('[UpAI Final] XHR parse error:', parseErr.message);
                }
              }
            }
          }
        } catch (e) {
          console.debug('[UpAI Final] XHR processing error:', e.message);
        }
      }
      
      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.apply(this, arguments);
      }
    };
    
    return originalXHRSend.apply(this, [body]);
  };
  
  // Try to access Vue/Nuxt store (from research)
  function checkVueStore() {
    try {
      // Method 1: Nuxt global
      if (window.$nuxt?.$store) {
        const state = window.$nuxt.$store.state;
        console.log('[UpAI Final] Nuxt store found!');
        console.log('[UpAI Final] Store modules:', Object.keys(state || {}));
        
        // Deep search for job data in store
        function searchForJobs(obj, path = '') {
          if (!obj || typeof obj !== 'object') return;
          
          for (const key in obj) {
            const currentPath = path ? `${path}.${key}` : key;
            const value = obj[key];
            
            // Check if this looks like job data
            if (key.toLowerCase().includes('job') || 
                key.toLowerCase().includes('post') || 
                key.toLowerCase().includes('search') ||
                key.toLowerCase().includes('marketplace')) {
              console.log(`[UpAI Final] Found potential job path: ${currentPath}`);
              
              // If it's an array, might be job list
              if (Array.isArray(value) && value.length > 0) {
                console.log(`[UpAI Final] Array at ${currentPath} with ${value.length} items`);
                
                // Check if first item looks like a job
                if (value[0]?.title || value[0]?.description) {
                  console.log(`[UpAI Final] 🎯 Found ${value.length} jobs at ${currentPath}!`);
                  const jobs = value.map(processJobNode).filter(Boolean);
                  
                  jobs.forEach(job => {
                    const key = job.id || job.url || job.title;
                    if (!collectedJobs.has(key)) {
                      collectedJobs.set(key, job);
                      jobBatch.push(job);
                      console.log(`[UpAI Final] Added from Vuex: ${job.title}`);
                    }
                  });
                  
                  if (jobs.length > 0) {
                    setTimeout(sendJobs, 100);
                  }
                }
              }
              
              // Check for edges pattern (GraphQL)
              if (value?.edges && Array.isArray(value.edges)) {
                console.log(`[UpAI Final] Found edges at ${currentPath} with ${value.edges.length} items`);
                const jobs = value.edges.map(edge => processJobNode(edge.node || edge)).filter(Boolean);
                
                jobs.forEach(job => {
                  const key = job.id || job.url || job.title;
                  if (!collectedJobs.has(key)) {
                    collectedJobs.set(key, job);
                    jobBatch.push(job);
                  }
                });
                
                if (jobs.length > 0) {
                  setTimeout(sendJobs, 100);
                }
              }
            }
            
            // Recurse for nested objects (but not too deep)
            if (value && typeof value === 'object' && !Array.isArray(value) && currentPath.split('.').length < 5) {
              searchForJobs(value, currentPath);
            }
          }
        }
        
        searchForJobs(state);
      }
      
      // Method 2: Vue instance on #app
      const appEl = document.querySelector('#app');
      if (appEl && appEl.__vue__) {
        const vm = appEl.__vue__;
        if (vm.$store) {
          console.log('[UpAI Final] Vue store found via #app');
          const state = vm.$store.state;
          
          // Try getters
          const jobs = vm.$store.getters['marketplace/getJobs'] || 
                      vm.$store.getters['search/getResults'];
          
          if (jobs && Array.isArray(jobs)) {
            console.log(`[UpAI Final] Found ${jobs.length} jobs via getters`);
          }
        }
      }
      
      // Method 3: Vue DevTools hook
      if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
        console.log('[UpAI Final] Vue DevTools hook available');
      }
    } catch (e) {
      console.error('[UpAI Final] Vue store error:', e);
    }
  }
  
  // Monitor DOM for job cards as fallback
  function observeDOM() {
    // First, scan existing jobs on page
    function scanForJobs() {
      console.log('[UpAI Final] Scanning DOM for job elements...');
      
      // Multiple selectors for Upwork job tiles
      const selectors = [
        '.job-tile',
        '[data-test*="job-tile"]',
        '[data-test="job-tile-list"] > div',
        '.up-card-section',
        'article[data-test*="JobTile"]',
        'div[class*="job-tile"]',
        'section[data-ev-sublocation*="job_tile"]',
        '.air3-card-section',
        '[data-item-index]',
        '.up-card'
      ];
      
      let foundJobs = 0;
      selectors.forEach(selector => {
        const tiles = document.querySelectorAll(selector);
        if (tiles.length > 0) {
          console.log(`[UpAI Final] Found ${tiles.length} elements with selector: ${selector}`);
          
          tiles.forEach(tile => {
            try {
              // Multiple ways to find job title
              const titleSelectors = [
                'a[class*="job-title"]',
                '.job-title-link',
                '[data-test="job-title-link"]',
                'h4 a',
                'h3 a',
                'a[href*="/jobs/~"]',
                '.up-n-link'
              ];
              
              let titleEl = null;
              let linkEl = null;
              
              for (const ts of titleSelectors) {
                titleEl = tile.querySelector(ts);
                if (titleEl) {
                  linkEl = titleEl.tagName === 'A' ? titleEl : titleEl.querySelector('a');
                  if (linkEl || titleEl.textContent) break;
                }
              }
              
              // If we found a title
              if (titleEl && titleEl.textContent) {
                const href = linkEl?.getAttribute('href') || '';
                const ciphertext = href.match(/~([a-f0-9]+)/)?.[1];
                
                // Extract more job details
                const job = {
                  id: ciphertext || Math.random().toString(36).substr(2, 9),
                  title: titleEl.textContent.trim(),
                  url: linkEl?.href || '',
                  description: tile.querySelector('[class*="description"], .job-description, p')?.textContent?.trim() || '',
                  budget: tile.querySelector('[data-test*="budget"], [class*="budget"], [class*="amount"]')?.textContent?.trim() || '',
                  posted: tile.querySelector('[data-test*="posted"], time, [class*="posted"]')?.textContent?.trim() || '',
                  proposals: tile.querySelector('[data-test*="proposals"], [class*="proposals"]')?.textContent?.trim() || ''
                };
                
                const key = job.id;
                if (!collectedJobs.has(key) && job.title) {
                  console.log(`[UpAI Final] 📦 Found job in DOM: ${job.title}`);
                  collectedJobs.set(key, job);
                  jobBatch.push(job);
                  foundJobs++;
                }
              }
            } catch (e) {
              console.debug('[UpAI Final] Error processing tile:', e.message);
            }
          });
        }
      });
      
      if (foundJobs > 0) {
        console.log(`[UpAI Final] ✅ Collected ${foundJobs} jobs from DOM`);
        setTimeout(sendJobs, 100);
      } else {
        console.log('[UpAI Final] No jobs found in DOM scan');
      }
    }
    
    // Scan immediately
    scanForJobs();
    
    // Set up mutation observer for new content
    const observer = new MutationObserver((mutations) => {
      let hasNewContent = false;
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            // Check if this might be job content
            if (node.querySelector && (
                node.querySelector('[data-test*="job"]') ||
                node.querySelector('.job-tile') ||
                node.querySelector('.up-card') ||
                (typeof node.className === 'string' && node.className.includes('job')) ||
                (typeof node.className === 'string' && node.className.includes('tile'))
            )) {
              hasNewContent = true;
            }
          }
        });
      });
      
      if (hasNewContent) {
        console.log('[UpAI Final] New content detected, scanning...');
        setTimeout(scanForJobs, 500);
      }
    });
    
    // Observe body for changes
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }
  
  // Initialize all methods
  console.log('[UpAI Final] Setting up collectors...');
  
  // Start DOM observer
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      observeDOM();
      setTimeout(checkVueStore, 1000);
    });
  } else {
    observeDOM();
    setTimeout(checkVueStore, 1000);
  }
  
  // Check Vue store periodically
  setTimeout(checkVueStore, 3000);
  setTimeout(checkVueStore, 5000);
  
  // Monitor for navigation changes
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('[UpAI Final] Navigation detected');
      setTimeout(checkVueStore, 500);
    }
  }).observe(document, { subtree: true, childList: true });
  
  // Log initialization
  console.log('[UpAI Final] Collector initialized - monitoring for Upwork jobs');
  console.log('[UpAI Final] Intercepting: fetch, XHR, Vue store, DOM mutations');
})();
