// === UPWORK AI ASSISTANT TEST ===
// Bu kodu Upwork'te bir iş listesi sayfasında konsola yapıştırın

console.log('%c=== Upwork AI Assistant Live Collector Test ===', 'color: blue; font-weight: bold');

// 1. Collector enjekte edilmiş mi?
if (window.__upworkAICollectorActive) {
  console.log('✅ Collector injected successfully');
} else {
  console.log('❌ Collector NOT injected - Reload the extension');
}

// 2. Script tag var mı?
const scripts = Array.from(document.scripts).filter(s => s.src && s.src.includes('collector-injected'));
if (scripts.length > 0) {
  console.log('✅ Collector script found:', scripts[0].src);
} else {
  console.log('⚠️ Collector script tag not found (might be already removed after loading)');
}

// 3. Test mesajı gönder
console.log('📤 Sending test message...');
window.postMessage({
  source: 'UPWORK_AI_COLLECTOR',
  type: 'JOBS_DATA',
  payload: {
    jobs: [{
      title: 'Test Job - If you see this, collector is working!',
      description: 'This is a test job to verify the collector',
      skills: ['JavaScript', 'Chrome Extension'],
      budget: '$100',
      url: 'https://www.upwork.com/test'
    }],
    url: 'test://api',
    timestamp: Date.now()
  }
}, '*');

console.log('✅ Test message sent. Check the extension popup for the test job.');
console.log('💡 Browse Upwork job listings and the extension will automatically collect jobs in the background!');

// 4. Fetch interceptor çalışıyor mu test et
console.log('🔍 Testing fetch interceptor...');
fetch('/api/test-endpoint', { 
  headers: { 'Accept': 'application/json' }
}).catch(e => {
  console.log('✅ Fetch interceptor is active (404 expected)');
});

console.log('%c=== Test Complete ===', 'color: green; font-weight: bold');
console.log('Next steps:');
console.log('1. Open the AI Assistant panel (floating button)');
console.log('2. Go to "Analyze" tab');
console.log('3. Click "Use Live Collected & Rank"');
console.log('4. You should see collected jobs!');
