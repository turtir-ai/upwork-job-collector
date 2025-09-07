// injected-script.js - Runs in the page (MAIN world). No inline code; injected via <script src> to bypass CSP inline blocks.
(function () {
  'use strict';

  const SOURCE = 'UpAI-LiveCollector';
  const post = (payload) => {
    try {
      window.postMessage({ source: SOURCE, type: 'UPWORK_JOBS_DATA', payload }, '*');
    } catch (_) {}
  };

  const trimXSSI = (t) => (typeof t === 'string' ? t.replace(/^\)]}'?,?/, '') : t);
  const isUpworkApi = (url) => {
    if (!url) return false;
    return /\/api\/graphql|\/graphql|\/nx\/search\/jobs|\/jobs\/search|\/json\/|\/feed\/profile|\/profile\/api|\/api\/profiles|\/gateway\/v4|\/marketplace/i.test(url) ||
           url.includes('upwork.com') && (url.includes('search') || url.includes('jobs') || url.includes('feed') || url.includes('api'));
  };

  // Extract potential jobs from arbitrary JSON structures, then de-dupe
  function extractJobs(json) {
    const out = [];
    const walk = (node) => {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (typeof node === 'object') {
        const title = node.title || node.jobTitle || node.position || node.name || '';
        const desc = node.description || node.snippet || node.jobDescription || node.summary || node.content || '';
        const url = node.url || node.jobUrl || node.link || node.href || node.upworkUrl || '';
        if ((title || desc) && (url || desc)) {
          out.push({
            title: String(title || ''),
            description: String(desc || ''),
            skills: node.skills || node.requiredSkills || [],
            budget: node.budget || node.pay || node.price || '',
            url: String(url || ''),
          });
        }
        for (const v of Object.values(node)) walk(v);
      }
    };
    walk(json);

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
  }

  // Wrap fetch
  try {
    const origFetch = window.fetch;
    window.fetch = async function (...args) {
      const res = await origFetch.apply(this, args);
      try {
        const req = args[0];
        const url = (typeof req === 'string') ? req : (req?.url || '');
        if (url && isUpworkApi(url)) {
          const clone = res.clone();
          const text = await clone.text();
          let json = null;
          try { json = JSON.parse(trimXSSI(text)); } catch (_) {}
          if (json) {
            const jobs = extractJobs(json);
            if (jobs.length) post({ url, count: jobs.length, jobs });
          }
        }
      } catch (_) {}
      return res;
    };
  } catch (_) {}

  // Wrap XMLHttpRequest
  try {
    const OrigXHR = window.XMLHttpRequest;
    function WrappedXHR() {
      const xhr = new OrigXHR();
      let _url = '';
      const _open = xhr.open;
      xhr.open = function (method, url, ...rest) {
        _url = url || '';
        return _open.apply(xhr, [method, url, ...rest]);
      };
      xhr.addEventListener('load', function () {
        try {
          if (_url && isUpworkApi(_url) && typeof xhr.responseText === 'string') {
            const text = trimXSSI(xhr.responseText);
            let json = null; try { json = JSON.parse(text); } catch (_) {}
            if (json) {
              const jobs = extractJobs(json);
              if (jobs.length) post({ url: _url, count: jobs.length, jobs });
            }
          }
        } catch (_) {}
      });
      return xhr;
    }
    window.XMLHttpRequest = WrappedXHR;
  } catch (_) {}
})();

