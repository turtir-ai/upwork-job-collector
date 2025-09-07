// content-script.js - Isolated world. Injects a non-inline script into the page and forwards messages to the service worker.
(function () {
  'use strict';

  // Prevent double-injection across navigations/iframes
  try {
    if (document.documentElement && document.documentElement.dataset && document.documentElement.dataset.upaiInjected) {
      return;
    }
    if (document.documentElement && document.documentElement.dataset) {
      document.documentElement.dataset.upaiInjected = '1';
    }
  } catch (_) {}

  function injectScriptFile() {
    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('injected-script.js');
      (document.head || document.documentElement).appendChild(script);
      script.onload = () => script.remove(); // keep DOM clean
    } catch (e) {
      console.error('Upwork Live Collector: injection failed', e);
    }
  }

  // Listen to page->content messages and forward to SW
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.type !== 'UPWORK_JOBS_DATA') return;
    chrome.runtime.sendMessage({
      type: 'PROCESS_UPWORK_DATA',
      payload: event.data.payload
    });
  }, false);

  injectScriptFile();
})();

