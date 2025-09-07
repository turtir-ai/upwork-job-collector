// Test script - Paste this in the browser console on an Upwork job listing page
// After reloading the extension

console.log('=== Upwork AI Collector Test ===');

// Check if collector is injected
if (window.__UpAICollectorInjected) {
  console.log('✅ Collector is injected, version:', window.__UpAICollectorInjected);
} else {
  console.log('❌ Collector NOT injected');
}

// Check if there's a script tag for collector-injected.js
const collectorScript = Array.from(document.scripts).find(s => 
  s.src && s.src.includes('collector-injected.js')
);
if (collectorScript) {
  console.log('✅ Collector script tag found:', collectorScript.src);
} else {
  console.log('❌ Collector script tag NOT found');
}

// Test posting a fake job to see if the message listener works
console.log('Testing message posting...');
window.postMessage({
  source: 'UpAI-PageCollector',
  type: 'UPWORK_JOBS_DATA',
  payload: {
    url: 'test://fake-api',
    count: 1,
    jobs: [{
      title: 'Test Job',
      description: 'This is a test job to verify the collector is working',
      skills: ['JavaScript', 'Testing'],
      budget: '$100',
      url: 'https://www.upwork.com/test'
    }],
    source: 'test'
  }
}, '*');

console.log('Test message posted. Check extension logs for "[UpAI]" messages.');

// Try to trigger a real API call
console.log('Attempting to trigger a real API call...');
fetch('/api/test', { 
  method: 'GET',
  headers: { 'Accept': 'application/json' }
}).catch(e => console.log('Expected fetch error (404):', e.message));

console.log('=== Test Complete ===');
console.log('Look for these in the console:');
console.log('1. [UpAI] messages from the collector');
console.log('2. "Received message from collector" logs');
console.log('3. Check the extension popup for collected jobs');
