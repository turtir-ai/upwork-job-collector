// Upwork AI Collector - Injected Script
// This script runs in the page context to intercept network requests
(() => {
  const SOURCE = 'UpAI-InPage';
  
  // Send message to content script
  const post = (payload) => {
    try { 
      window.postMessage({ 
        source: SOURCE, 
        type: 'UPWORK_JOBS_DATA', 
        payload 
      }, '*'); 
    } catch (_) {}
  };
  
  // Remove XSSI protection prefix
  const trimXSSI = (t) => (typeof t === 'string' ? t.replace(/^\)\]\}',?/, '') : t);
  
  // Check if URL is Upwork API
  const isUpworkApi = (url) => /\/api\/graphql\/|\/nx\/search\/jobs|\/jobs\/search|\/json/.test(url);
  
  // Extract jobs from JSON response
  const extract = (json) => {
    const out = [];
    const walk = (node) => {
      if (!node) return;
      if (Array.isArray(node)) { 
        node.forEach(walk); 
        return; 
      }
      if (typeof node === 'object') {
        const title = node.title || node.jobTitle || node.position || '';
        const desc = node.description || node.snippet || node.jobDescription || '';
        const url = node.url || node.jobUrl || node.link || '';
        if ((title || desc) && (url || desc)) {
          out.push({
            title: String(title || ''),
            description: String(desc || ''),
            skills: node.skills || node.requiredSkills || [],
            budget: node.budget || node.pay || node.price || '',
            url: String(url || '')
          });
        }
        for (const v of Object.values(node)) walk(v);
      }
    };
    walk(json);
    
    // De-duplicate jobs
    const seen = new Set();
    const deduped = [];
    for (const j of out) {
      const key = (j.url || '') + '|' + (j.title || '');
      if (!seen.has(key) && (j.title || j.description)) { 
        seen.add(key); 
        deduped.push(j); 
      }
    }
    return deduped.slice(0, 200);
  };

  // Intercept fetch API
  try {
    const origFetch = window.fetch;
    window.fetch = async function(...args) {
      const res = await origFetch.apply(this, args);
      try {
        const req = args[0];
        const url = (typeof req === 'string') ? req : (req?.url || '');
        if (url && isUpworkApi(url)) {
          const clone = res.clone();
          const text = await clone.text();
          let json = null;
          try { 
            json = JSON.parse(trimXSSI(text)); 
          } catch (_) {}
          if (json) {
            const jobs = extract(json);
            if (jobs.length) {
              console.log('[UpAI] Intercepted', jobs.length, 'jobs from fetch');
              post({ url, count: jobs.length, jobs });
            }
          }
        }
      } catch (_) {}
      return res;
    };
  } catch(_) {}

  // Intercept XMLHttpRequest
  try {
    const OrigXHR = window.XMLHttpRequest;
    function WrappedXHR() {
      const xhr = new OrigXHR();
      let _url = '';
      const _open = xhr.open;
      xhr.open = function(method, url, ...rest) { 
        _url = url || ''; 
        return _open.apply(xhr, [method, url, ...rest]); 
      };
      xhr.addEventListener('load', function() {
        try {
          if (_url && isUpworkApi(_url) && typeof xhr.responseText === 'string') {
            const text = trimXSSI(xhr.responseText);
            let json = null; 
            try { 
              json = JSON.parse(text); 
            } catch(_) {}
            if (json) {
              const jobs = extract(json);
              if (jobs.length) {
                console.log('[UpAI] Intercepted', jobs.length, 'jobs from XHR');
                post({ url: _url, count: jobs.length, jobs });
              }
            }
          }
        } catch(_) {}
      });
      return xhr;
    }
    window.XMLHttpRequest = WrappedXHR;
  } catch(_) {}
  
  console.log('[UpAI] Network collector initialized');
})();
