// Upwork AI Ultimate Collector - All methods combined
// Targets Upwork's specific Nuxt/GraphQL architecture
(function() {
  'use strict';
  
  console.log('[UpAI Ultimate] Initializing comprehensive collector...');
  
  // Store intercepted jobs
  const collectedJobs = new Map();
  let jobBatch = [];
  let batchTimer = null;
  
  // Send batch of jobs to content script
  function sendJobBatch() {
    if (jobBatch.length > 0) {
      console.log(`[UpAI Ultimate] Sending batch of ${jobBatch.length} jobs`);
      window.postMessage({
        type: 'UPWORK_JOBS_COLLECTED',
        source: 'ultimate-collector',
        jobs: jobBatch,
        timestamp: Date.now()
      }, '*');
      jobBatch = [];
    }
  }
  
  // Add job to batch
  function addJob(job) {
    const key = job.id || job.url || (job.title + job.description).substring(0, 50);
    if (!collectedJobs.has(key)) {
      collectedJobs.set(key, job);
      jobBatch.push(job);
      
      // Send batch after 500ms of no new jobs
      clearTimeout(batchTimer);
      batchTimer = setTimeout(sendJobBatch, 500);
    }
  }
  
  // === METHOD 1: Network Interception ===
  const originalFetch = window.fetch.bind(window);
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  // Enhanced job extraction for Upwork
  function extractJobsFromResponse(data, url = '') {
    const jobs = [];
    
    const processJob = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      
      // Check for Upwork job fields
      const hasJobFields = 
        (obj.title || obj.jobTitle) &&
        (obj.description || obj.publicDescription || obj.content);
      
      if (!hasJobFields) return null;
      
      return {
        title: obj.title || obj.jobTitle || '',
        description: obj.description || obj.publicDescription || obj.content || '',
        budget: obj.amount?.amount || obj.budget?.amount || obj.fixedPrice?.amount || '',
        hourlyRate: obj.hourlyBudget ? `$${obj.hourlyBudget.min}-${obj.hourlyBudget.max}/hr` : '',
        duration: obj.duration || obj.estimatedDuration || obj.engagement || '',
        experienceLevel: obj.tier || obj.contractorTier || obj.experienceLevel || '',
        skills: (obj.ontologySkills || obj.skills || []).map(s => 
          typeof s === 'string' ? s : (s.name || s.prefLabel || '')
        ),
        category: obj.category?.name || obj.occupationCategory?.prefLabel || '',
        url: obj.ciphertext ? `https://www.upwork.com/jobs/~${obj.ciphertext}` : (obj.jobPostingUrl || ''),
        id: obj.id || obj.uid || obj.ciphertext || Math.random().toString(36).substr(2, 9),
        postedOn: obj.publishedOn || obj.createdOn || obj.postedOn || '',
        clientCountry: obj.client?.location?.country || obj.buyer?.location?.country || '',
        clientRating: obj.client?.totalFeedback || obj.buyer?.stats?.feedbackCount || '',
        clientSpent: obj.client?.totalSpent?.amount || obj.buyer?.stats?.totalSpent || '',
        connects: obj.connectsRequired || obj.connects || '',
        proposals: obj.proposalsTier || obj.applicants || ''
      };
    };
    
    // Deep search for jobs
    const search = (node, depth = 0) => {
      if (!node || depth > 20) return;
      
      const job = processJob(node);
      if (job && job.title) {
        jobs.push(job);
        return;
      }
      
      if (Array.isArray(node)) {
        node.forEach(item => search(item, depth + 1));
      } else if (typeof node === 'object') {
        Object.values(node).forEach(value => search(value, depth + 1));
      }
    };
    
    // Start search
    if (data?.data) {
      search(data.data);
    } else {
      search(data);
    }
    
    return jobs;
  }
  
  // Intercept fetch
  window.fetch = function(...args) {
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : (resource?.url || '');
    
    return originalFetch(...args).then(async response => {
      try {
        if (response.headers.get('content-type')?.includes('json')) {
          const cloned = response.clone();
          const text = await cloned.text();
          const cleanText = text.replace(/^\)\]\}',?\n?/, '');
          const data = JSON.parse(cleanText);
          
          const jobs = extractJobsFromResponse(data, url);
          jobs.forEach(job => {
            console.log('[UpAI Ultimate] Found job via fetch:', job.title);
            addJob(job);
          });
        }
      } catch (e) {}
      return response;
    });
  };
  
  // Intercept XHR
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };
  
  XMLHttpRequest.prototype.send = function(body) {
    const xhr = this;
    const url = xhr._url;
    
    const originalHandler = xhr.onreadystatechange;
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          const ct = xhr.getResponseHeader('content-type');
          if (ct?.includes('json')) {
            let text = xhr.responseText.replace(/^\)\]\}',?\n?/, '');
            const data = JSON.parse(text);
            
            const jobs = extractJobsFromResponse(data, url);
            jobs.forEach(job => {
              console.log('[UpAI Ultimate] Found job via XHR:', job.title);
              addJob(job);
            });
          }
        } catch (e) {}
      }
      if (originalHandler) originalHandler.apply(this, arguments);
    };
    
    return originalXHRSend.apply(this, [body]);
  };
  
  // === METHOD 2: Vue/Nuxt Store Access ===
  function accessVueData() {
    try {
      // Try window.$nuxt (Nuxt universal)
      if (window.$nuxt?.$store) {
        const state = window.$nuxt.$store.state;
        console.log('[UpAI Ultimate] Nuxt store found, modules:', Object.keys(state));
        
        // Look for job data in common locations
        const paths = [
          state.jobs,
          state.search?.results,
          state.findWork?.jobs,
          state.jobSearch?.results
        ];
        
        paths.forEach(data => {
          if (data) {
            const jobs = extractJobsFromResponse({ data });
            jobs.forEach(job => {
              console.log('[UpAI Ultimate] Found job in Vuex:', job.title);
              addJob(job);
            });
          }
        });
      }
      
      // Try __NUXT__ (SSR data)
      if (window.__NUXT__) {
        console.log('[UpAI Ultimate] Found SSR data');
        const jobs = extractJobsFromResponse(window.__NUXT__);
        jobs.forEach(job => {
          console.log('[UpAI Ultimate] Found job in SSR:', job.title);
          addJob(job);
        });
      }
      
      // Try Vue devtools hook
      if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.apps) {
        const apps = window.__VUE_DEVTOOLS_GLOBAL_HOOK__.apps;
        apps.forEach(app => {
          if (app?.config?.globalProperties?.$store) {
            const state = app.config.globalProperties.$store.state;
            console.log('[UpAI Ultimate] Vue app store found');
            const jobs = extractJobsFromResponse({ data: state });
            jobs.forEach(job => addJob(job));
          }
        });
      }
    } catch (e) {
      console.error('[UpAI Ultimate] Vue access error:', e);
    }
  }
  
  // === METHOD 3: DOM Mutation Observer ===
  function observeDOM() {
    const observer = new MutationObserver((mutations) => {
      // Look for job cards being added
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            // Check if it's a job card
            const jobCards = node.querySelectorAll ? 
              node.querySelectorAll('[data-test*="job"], .job-tile, article[class*="job"]') : [];
            
            jobCards.forEach(card => {
              try {
                const titleEl = card.querySelector('h4, h3, [class*="title"]');
                const descEl = card.querySelector('[class*="description"], [class*="content"]');
                const linkEl = card.querySelector('a[href*="/jobs/"]');
                
                if (titleEl && linkEl) {
                  const job = {
                    title: titleEl.textContent.trim(),
                    description: descEl?.textContent.trim() || '',
                    url: linkEl.href,
                    id: linkEl.href.match(/~([a-f0-9]+)/)?.[1] || Math.random().toString(36).substr(2, 9)
                  };
                  
                  console.log('[UpAI Ultimate] Found job in DOM:', job.title);
                  addJob(job);
                }
              } catch (e) {}
            });
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // === METHOD 4: Periodic Data Check ===
  function periodicCheck() {
    // Check localStorage for cached data
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('job') || key.includes('search') || key.includes('work')) {
          try {
            const value = localStorage.getItem(key);
            const data = JSON.parse(value);
            const jobs = extractJobsFromResponse(data);
            jobs.forEach(job => addJob(job));
          } catch (e) {}
        }
      });
    } catch (e) {}
    
    // Check sessionStorage
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.includes('job') || key.includes('search') || key.includes('work')) {
          try {
            const value = sessionStorage.getItem(key);
            const data = JSON.parse(value);
            const jobs = extractJobsFromResponse(data);
            jobs.forEach(job => addJob(job));
          } catch (e) {}
        }
      });
    } catch (e) {}
    
    // Check Vue data
    accessVueData();
  }
  
  // === Initialize all methods ===
  
  // Start DOM observer
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeDOM);
  } else {
    observeDOM();
  }
  
  // Periodic checks
  setTimeout(periodicCheck, 1000);
  setTimeout(periodicCheck, 3000);
  setTimeout(periodicCheck, 5000);
  setInterval(periodicCheck, 10000);
  
  // Check on navigation changes
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('[UpAI Ultimate] Navigation detected, checking for jobs...');
      setTimeout(periodicCheck, 500);
    }
  }).observe(document, { subtree: true, childList: true });
  
  // Listen for custom events that might contain job data
  ['load', 'DOMContentLoaded', 'readystatechange'].forEach(event => {
    window.addEventListener(event, () => {
      setTimeout(periodicCheck, 100);
    });
  });
  
  console.log('[UpAI Ultimate] All collection methods active');
})();
