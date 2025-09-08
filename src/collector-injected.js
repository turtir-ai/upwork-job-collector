// Upwork AI Assistant - Network Interceptor
// This script runs in the page context to intercept API responses
(function() {
  console.log('[Upwork AI Collector] Starting network interceptor...');
  
  // Helper to extract jobs from JSON responses
  function extractJobsFromData(data) {
    const jobs = [];
    
    function walk(obj, depth = 0) {
      if (depth > 10 || !obj) return;
      
      if (Array.isArray(obj)) {
        obj.forEach(item => walk(item, depth + 1));
      } else if (typeof obj === 'object') {
        // Check if this looks like a job object
        if ((obj.title || obj.jobTitle) && (obj.description || obj.snippet)) {
          jobs.push({
            title: obj.title || obj.jobTitle || '',
            description: obj.description || obj.snippet || obj.jobDescription || '',
            budget: obj.budget || obj.hourlyRate || obj.amount || '',
            skills: obj.skills || obj.requiredSkills || [],
            url: obj.url || obj.link || obj.jobUrl || '',
            clientName: obj.clientName || obj.client?.name || '',
            postedTime: obj.postedTime || obj.createdOn || '',
            proposals: obj.proposals || obj.totalApplicants || ''
          });
        }
        
        // Recursively walk the object
        Object.values(obj).forEach(val => walk(val, depth + 1));
      }
    }
    
    walk(data);
    return jobs;
  }
  
  // Override XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    this._method = method;
    return originalOpen.apply(this, arguments);
  };
  
  XMLHttpRequest.prototype.send = function() {
    const xhr = this;
    const originalOnReadyStateChange = xhr.onreadystatechange;
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          const url = xhr._url || '';
          if (url.includes('/api/') || url.includes('/graphql') || url.includes('search')) {
            const responseText = xhr.responseText;
            if (responseText) {
              const data = JSON.parse(responseText);
              const jobs = extractJobsFromData(data);
              
              if (jobs.length > 0) {
                console.log('[Upwork AI Collector] Found', jobs.length, 'jobs from XHR:', url);
                window.postMessage({
                  source: 'UpAI-InPage',
                  type: 'UPWORK_JOBS_DATA',
                  jobs: jobs
                }, '*');
              }
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      if (originalOnReadyStateChange) {
        return originalOnReadyStateChange.apply(this, arguments);
      }
    };
    
    return originalSend.apply(this, arguments);
  };
  
  // Override fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    return originalFetch.apply(this, args).then(response => {
      const url = args[0];
      
      if (response.ok && (url.includes('/api/') || url.includes('/graphql') || url.includes('search'))) {
        response.clone().json().then(data => {
          const jobs = extractJobsFromData(data);
          
          if (jobs.length > 0) {
            console.log('[Upwork AI Collector] Found', jobs.length, 'jobs from fetch:', url);
            window.postMessage({
              source: 'UpAI-InPage',
              type: 'UPWORK_JOBS_DATA',
              jobs: jobs
            }, '*');
          }
        }).catch(() => {});
      }
      
      return response;
    });
  };
  
  console.log('[Upwork AI Collector] Network interception active');
})();
