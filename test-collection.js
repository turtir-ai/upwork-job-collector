// Test script to check collected jobs
// Run this in the browser console on an Upwork job search page

console.log('=== Testing Job Collection ===');

// Check if collector is loaded
if (window.upworkDataInterceptor) {
    console.log('✅ Collector is loaded:', window.upworkDataInterceptor);
} else {
    console.log('❌ Collector not loaded');
}

// Check sessionStorage for collected jobs
function checkCollectedJobs() {
    try {
        const jobs = JSON.parse(sessionStorage.getItem('upworkAI_liveJobs') || '[]');
        const lastCollection = sessionStorage.getItem('upworkAI_lastCollection');
        
        console.log(`\n📊 Collected Jobs Status:`);
        console.log(`- Total jobs in storage: ${jobs.length}`);
        console.log(`- Last collection: ${lastCollection ? new Date(parseInt(lastCollection)).toLocaleString() : 'Never'}`);
        
        if (jobs.length > 0) {
            console.log('\n📋 Sample Jobs (first 5):');
            jobs.slice(0, 5).forEach((job, i) => {
                console.log(`\n${i + 1}. ${job.title}`);
                console.log(`   ID: ${job.id}`);
                console.log(`   URL: ${job.url}`);
                console.log(`   Budget: ${job.budget || 'Not specified'}`);
                console.log(`   Skills: ${job.skills?.join(', ') || 'None'}`);
            });
            
            // Show job distribution
            const pages = {};
            jobs.forEach(job => {
                const page = job.page || 'unknown';
                pages[page] = (pages[page] || 0) + 1;
            });
            
            console.log('\n📍 Jobs by page:');
            Object.entries(pages).forEach(([page, count]) => {
                console.log(`   ${page}: ${count} jobs`);
            });
        } else {
            console.log('\n⚠️ No jobs collected yet. Try:');
            console.log('1. Navigate to a job search page');
            console.log('2. Wait a few seconds for jobs to load');
            console.log('3. Run this test again');
        }
        
        return jobs;
    } catch(e) {
        console.error('❌ Error checking jobs:', e);
        return [];
    }
}

// Check for live collection function
if (window.getCollectedJobs) {
    console.log('✅ Bridge API available');
    const result = window.getCollectedJobs();
    console.log('Bridge API result:', result);
}

// Test message passing
console.log('\n🔄 Testing message passing...');
window.postMessage({ action: 'GET_COLLECTED_JOBS' }, '*');

// Listen for response
window.addEventListener('message', function handler(event) {
    if (event.data && event.data.type === 'COLLECTED_JOBS_RESPONSE') {
        console.log('✅ Message response received:', event.data);
        window.removeEventListener('message', handler);
    }
});

// Main check
const collectedJobs = checkCollectedJobs();

// Try to trigger manual collection
console.log('\n🔄 Triggering manual DOM scan...');
if (typeof scanDOM === 'function') {
    scanDOM();
    console.log('✅ Manual scan triggered');
} else {
    console.log('ℹ️ Manual scan not available');
}

// Show current page info
console.log('\n📄 Current Page Info:');
console.log(`- URL: ${window.location.href}`);
console.log(`- Title: ${document.title}`);
console.log(`- Job tiles found: ${document.querySelectorAll('[data-test*="job-tile"]').length}`);

// Show Vuex store status
if (window.$nuxt?.$store?.state) {
    const state = window.$nuxt.$store.state;
    console.log('\n🗄️ Vuex Store Status:');
    const feeds = ['feedBestMatch', 'feedMostRecent', 'feedMy', 'feedDomestic', 'savedJobs'];
    feeds.forEach(feed => {
        if (state[feed]?.jobs) {
            console.log(`- ${feed}: ${state[feed].jobs.length} jobs`);
        }
    });
}

console.log('\n=== Test Complete ===');
console.log('💡 Tip: Click "Use Live Collected & Rank" button in the extension panel to see and rank collected jobs');
