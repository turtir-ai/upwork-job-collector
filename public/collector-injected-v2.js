// Upwork AI Collector - Enhanced Injected Script V2
// This script runs in the page context to intercept network requests
(function() {
  'use strict';
  
  console.log('[UpAI] Enhanced Network collector V2 initialized');
  
  // Store original methods immediately
  const originalFetch = window.fetch.bind(window);
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  
  // Known Upwork GraphQL operations for job search
  const UPWORK_GRAPHQL_OPS = [
    'searchTalent',
    'SearchJobs',
    'FindWork',
    'JobSearch', 
    'getJobDetails',
    'jobPostings',
    'searchResults',
    'talentSearch',
    'findWorkHome'
  ];
  
  // Helper to extract job data from Upwork's specific structure
  function extractUpworkJobs(data, url = '') {
    const jobs = [];
    
    try {
      // Handle GraphQL responses
      if (url.includes('graphql')) {
        console.log('[UpAI] Processing GraphQL response structure:', Object.keys(data || {}));
        
        // Deep search function for Upwork's nested structure
        const searchForJobs = (obj, path = '', depth = 0) => {
          if (!obj || typeof obj !== 'object' || depth > 15) return;
          
          // Check if this is a job posting object (Upwork specific fields)
          if (obj.title && (obj.description || obj.publicDescription || obj.content)) {
            const job = {
              title: obj.title || '',
              description: obj.description || obj.publicDescription || obj.content || '',
              budget: '',
              hourlyRate: '',
              duration: obj.duration || obj.engagement || obj.estimatedDuration || '',
              experienceLevel: obj.tier || obj.contractorTier || obj.experienceLevel || '',
              skills: [],
              category: obj.category?.name || obj.occupationCategory?.prefLabel || '',
              url: '',
              id: obj.id || obj.uid || obj.ciphertext || Math.random().toString(36).substr(2, 9),
              postedOn: obj.publishedOn || obj.createdOn || obj.postedOn || '',
              clientCountry: obj.client?.location?.country || obj.buyer?.location?.country || '',
              clientRating: obj.client?.totalFeedback || obj.buyer?.stats?.feedbackCount || '',
              clientSpent: '',
              projectType: obj.type || obj.contractType || '',
              connects: obj.connectsRequired || obj.connects || ''
            };
            
            // Extract budget/rate info
            if (obj.amount?.amount) {
              job.budget = `$${obj.amount.amount}`;
            } else if (obj.hourlyBudget?.min && obj.hourlyBudget?.max) {
              job.hourlyRate = `$${obj.hourlyBudget.min}-$${obj.hourlyBudget.max}/hr`;
            } else if (obj.hourlyRate?.min && obj.hourlyRate?.max) {
              job.hourlyRate = `$${obj.hourlyRate.min}-$${obj.hourlyRate.max}/hr`;
            }
            
            // Extract skills
            if (obj.ontologySkills && Array.isArray(obj.ontologySkills)) {
              job.skills = obj.ontologySkills.map(s => s.name || s.prefLabel || s);
            } else if (obj.skills && Array.isArray(obj.skills)) {
              job.skills = obj.skills.map(s => typeof s === 'string' ? s : (s.name || s.prefLabel || ''));
            }
            
            // Build URL from ciphertext (Upwork job URL pattern)
            if (obj.ciphertext) {
              job.url = `https://www.upwork.com/jobs/~${obj.ciphertext}`;
            } else if (obj.jobPostingUrl) {
              job.url = obj.jobPostingUrl;
            }
            
            // Extract client spent
            if (obj.client?.totalSpent?.amount) {
              job.clientSpent = `$${obj.client.totalSpent.amount}`;
            } else if (obj.buyer?.stats?.totalSpent) {
              job.clientSpent = `$${obj.buyer.stats.totalSpent}`;
            }
            
            jobs.push(job);
            console.log('[UpAI] Found job:', job.title);
            return;
          }
          
          // Recursively search
          if (Array.isArray(obj)) {
            obj.forEach((item, i) => searchForJobs(item, `${path}[${i}]`, depth + 1));
          } else {
            Object.keys(obj).forEach(key => {
              // Skip certain keys to avoid infinite loops
              if (key === '__typename' || key === '_metadata') return;
              searchForJobs(obj[key], `${path}.${key}`, depth + 1);
            });
          }
        };
        
        // Start search from data root
        if (data?.data) {
          searchForJobs(data.data);
        } else {
          searchForJobs(data);
        }
      }
      // Handle REST API responses
      else {
        // Look for job arrays in common locations
        const paths = [
          data?.results,
          data?.data?.results,
          data?.searchResults,
          data?.jobs,
          data?.data?.jobs,
          data?.jobPostings,
          data?.data?.jobPostings
        ];
        
        paths.forEach(jobArray => {
          if (Array.isArray(jobArray)) {
            jobArray.forEach(job => {
              if (job && (job.title || job.description)) {
                jobs.push({
                  title: job.title || '',
                  description: job.description || job.content || '',
                  budget: job.budget?.amount || job.budget || '',
                  hourlyRate: job.hourlyRate || '',
                  skills: job.skills || [],
                  url: job.url || job.link || '',
                  id: job.id || job.uid || Math.random().toString(36).substr(2, 9),
                  category: job.category || '',
                  postedOn: job.postedOn || job.publishedOn || ''
                });
              }
            });
          }
        });
      }
    } catch (error) {
      console.error('[UpAI] Error extracting jobs:', error);
    }
    
    // Remove duplicates
    const uniqueJobs = [];
    const seen = new Set();
    jobs.forEach(job => {
      const key = job.id || (job.title + job.description).substring(0, 50);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueJobs.push(job);
      }
    });
    
    console.log(`[UpAI] Total unique jobs extracted: ${uniqueJobs.length}`);
    return uniqueJobs;
  }
  
  // Intercept fetch
  window.fetch = function(...args) {
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : (resource?.url || '');
    
    // Log GraphQL operations
    if (url.includes('graphql') && config?.body) {
      try {
        const body = typeof config.body === 'string' ? JSON.parse(config.body) : config.body;
        if (body.operationName) {
          console.log('[UpAI] GraphQL operation:', body.operationName);
          
          // Log if it's a known job search operation
          if (UPWORK_GRAPHQL_OPS.some(op => body.operationName.includes(op))) {
            console.log('[UpAI] Job search GraphQL detected!');
          }
        }
      } catch (e) {}
    }
    
    return originalFetch(...args).then(async response => {
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          // Clone response to read it without affecting original
          const cloned = response.clone();
          const text = await cloned.text();
          
          // Remove XSSI protection if present
          const cleanText = text.replace(/^\\)\\]\\}',?\\n?/, '');
          const data = JSON.parse(cleanText);
          
          // Check if URL suggests job data
          if (url.includes('graphql') || 
              url.includes('/api/') || 
              url.includes('job') || 
              url.includes('search') ||
              url.includes('talent') ||
              url.includes('work')) {
            
            const jobs = extractUpworkJobs(data, url);
            if (jobs.length > 0) {
              console.log(`[UpAI] Fetch intercepted ${jobs.length} jobs from ${url}`);
              
              // Send to content script
              window.postMessage({
                type: 'UPWORK_JOBS_COLLECTED',
                source: 'network-fetch',
                jobs: jobs,
                url: url,
                timestamp: Date.now()
              }, '*');
            }
          }
        }
      } catch (error) {
        // Don't break original request
        console.error('[UpAI] Fetch intercept error:', error);
      }
      
      return response;
    }).catch(err => {
      // Pass through errors
      throw err;
    });
  };
  
  // Intercept XMLHttpRequest
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._upworkUrl = url;
    this._upworkMethod = method;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };
  
  XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
    this._upworkHeaders = this._upworkHeaders || {};
    this._upworkHeaders[header] = value;
    return originalXHRSetRequestHeader.apply(this, [header, value]);
  };
  
  XMLHttpRequest.prototype.send = function(body) {
    const xhr = this;
    const url = xhr._upworkUrl;
    
    // Log GraphQL operations
    if (url && url.includes('graphql') && body) {
      try {
        const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
        if (parsedBody.operationName) {
          console.log('[UpAI] XHR GraphQL operation:', parsedBody.operationName);
        }
      } catch (e) {}
    }
    
    // Store original handler
    const originalHandler = xhr.onreadystatechange;
    
    // Override handler
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          const contentType = xhr.getResponseHeader('content-type');
          if (contentType && contentType.includes('application/json')) {
            let responseText = xhr.responseText;
            
            // Remove XSSI protection
            responseText = responseText.replace(/^\\)\\]\\}',?\\n?/, '');
            
            const data = JSON.parse(responseText);
            
            // Check if URL suggests job data
            if (url.includes('graphql') || 
                url.includes('/api/') || 
                url.includes('job') || 
                url.includes('search') ||
                url.includes('talent') ||
                url.includes('work')) {
              
              const jobs = extractUpworkJobs(data, url);
              if (jobs.length > 0) {
                console.log(`[UpAI] XHR intercepted ${jobs.length} jobs from ${url}`);
                
                // Send to content script
                window.postMessage({
                  type: 'UPWORK_JOBS_COLLECTED',
                  source: 'network-xhr',
                  jobs: jobs,
                  url: url,
                  timestamp: Date.now()
                }, '*');
              }
            }
          }
        } catch (error) {
          console.error('[UpAI] XHR intercept error:', error);
        }
      }
      
      // Call original handler
      if (originalHandler) {
        originalHandler.apply(this, arguments);
      }
    };
    
    return originalXHRSend.apply(this, [body]);
  };
  
  // Try to access Vue/Nuxt store
  function checkVueStore() {
    try {
      // Check for Nuxt
      if (window.$nuxt) {
        console.log('[UpAI] Found Nuxt instance');
        if (window.$nuxt.$store) {
          const state = window.$nuxt.$store.state;
          console.log('[UpAI] Nuxt store modules:', Object.keys(state));
          
          // Look for job-related data in store
          Object.keys(state).forEach(module => {
            if (module.toLowerCase().includes('job') || 
                module.toLowerCase().includes('search') ||
                module.toLowerCase().includes('work')) {
              console.log(`[UpAI] Found potential job module: ${module}`, state[module]);
            }
          });
        }
      }
      
      // Check for Vue instances on common root elements
      const roots = document.querySelectorAll('#app, #__nuxt, #__layout, [data-reactroot]');
      roots.forEach(el => {
        if (el.__vue__) {
          console.log('[UpAI] Found Vue instance on:', el);
          if (el.__vue__.$store) {
            console.log('[UpAI] Vue store state:', Object.keys(el.__vue__.$store.state));
          }
        }
      });
    } catch (error) {
      console.error('[UpAI] Error checking Vue store:', error);
    }
  }
  
  // Check for Vue after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(checkVueStore, 2000);
    });
  } else {
    setTimeout(checkVueStore, 2000);
  }
  
  // Also check periodically as Vue might initialize later
  setTimeout(checkVueStore, 5000);
  setTimeout(checkVueStore, 10000);
  
  console.log('[UpAI] Enhanced collector V2 setup complete - monitoring for Upwork job data');
})();
