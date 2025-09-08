// Enhanced Upwork Job Collector - Works on all job pages
(function() {
    'use strict';
    
    console.log('[UpAI Enhanced] Initializing multi-page collector...');
    
    // Collection state
    const jobCache = new Map();
    let pendingJobs = [];
    let currentPage = window.location.href;
    let lastCollectionTime = 0;
    const MIN_COLLECTION_INTERVAL = 2000; // 2 seconds between collections
    
    // Enhanced feed types to monitor
    const FEED_TYPES = [
        'feedBestMatch',
        'feedMostRecent', 
        'feedMy',
        'feedDomestic',
        'savedJobs'
    ];
    
    // GraphQL operations to monitor
    const GRAPHQL_OPS = [
        'MarketplaceJobPostingsSearch',
        'marketplaceJobPostingsSearch',
        'FindWorkHome',
        'FindWorkHomeNuxt', 
        'BestMatches',
        'MostRecent',
        'SavedJobs',
        'MyFeed'
    ];
    
    function sendJobsToExtension() {
        if (pendingJobs.length > 0) {
            console.log(`[UpAI Enhanced] Sending ${pendingJobs.length} jobs to extension`);
            window.postMessage({
                type: 'UPWORK_JOBS_COLLECTED',
                source: 'final-collector',
                jobs: pendingJobs,
                timestamp: Date.now(),
                page: window.location.href
            }, '*');
            pendingJobs = [];
        }
    }
    
    function parseJob(job) {
        if (!job || !job.title) return null;
        
        return {
            id: job.id || job.uid || job.ciphertext || Math.random().toString(36).substr(2, 9),
            title: job.title || '',
            description: job.description || job.publicDescription || '',
            url: job.ciphertext ? `https://www.upwork.com/jobs/~${job.ciphertext}` : job.jobPostingUrl || '',
            budget: parseBudget(job.budgetRange || job.budget),
            hourlyRate: parseHourlyRate(job.hourlyBudget || job.hourlyRate),
            skills: (job.skills || []).map(s => s.name || s),
            client: {
                name: job.client?.name || '',
                location: job.client?.location || job.buyer?.location?.country || '',
                rating: job.client?.totalFeedback || '',
                spent: job.client?.totalSpent?.amount || ''
            },
            postedDate: job.postedDate || job.publishedOn || '',
            proposalsCount: job.proposalsCount || job.applicants || 0,
            connects: job.connectsRequired || job.connects || '',
            duration: job.duration || job.estimatedDuration || '',
            experienceLevel: job.tier || job.contractorTier || ''
        };
    }
    
    function parseBudget(budget) {
        if (!budget) return '';
        if (budget.min && budget.max) {
            return `$${budget.min}-$${budget.max} ${budget.currency || 'USD'}`;
        }
        if (budget.amount) {
            return `$${budget.amount} ${budget.currency || 'USD'}`;
        }
        return '';
    }
    
    function parseHourlyRate(rate) {
        if (!rate) return '';
        if (rate.min && rate.max) {
            return `$${rate.min}-$${rate.max}/hr`;
        }
        return '';
    }
    
    // Enhanced Vuex store monitoring
    function scanVuexStore() {
        try {
            const now = Date.now();
            if (now - lastCollectionTime < MIN_COLLECTION_INTERVAL) {
                console.log('[UpAI Enhanced] Skipping collection - too soon');
                return;
            }
            
            if (!window.$nuxt?.$store) {
                console.log('[UpAI Enhanced] No Vuex store found');
                return;
            }
            
            const state = window.$nuxt.$store.state;
            console.log('[UpAI Enhanced] Scanning Vuex store...');
            
            let totalJobs = 0;
            
            // Check all feed types
            FEED_TYPES.forEach(feedType => {
                if (state[feedType]?.jobs) {
                    const jobs = state[feedType].jobs;
                    if (Array.isArray(jobs) && jobs.length > 0) {
                        console.log(`[UpAI Enhanced] Found ${jobs.length} jobs in ${feedType}`);
                        
                        jobs.forEach(job => {
                            const parsed = parseJob(job);
                            if (parsed) {
                                const key = parsed.id || parsed.url || parsed.title;
                                if (!jobCache.has(key)) {
                                    jobCache.set(key, parsed);
                                    pendingJobs.push(parsed);
                                    totalJobs++;
                                    console.log(`[UpAI Enhanced] Added: ${parsed.title}`);
                                }
                            }
                        });
                    }
                }
            });
            
            // Also check root level jobs
            if (state.jobs && Array.isArray(state.jobs)) {
                console.log(`[UpAI Enhanced] Found ${state.jobs.length} jobs at root level`);
                state.jobs.forEach(job => {
                    const parsed = parseJob(job);
                    if (parsed) {
                        const key = parsed.id || parsed.url || parsed.title;
                        if (!jobCache.has(key)) {
                            jobCache.set(key, parsed);
                            pendingJobs.push(parsed);
                            totalJobs++;
                        }
                    }
                });
            }
            
            if (totalJobs > 0) {
                console.log(`[UpAI Enhanced] Collected ${totalJobs} new jobs from Vuex`);
                lastCollectionTime = now;
                setTimeout(sendJobsToExtension, 100);
            }
            
        } catch(e) {
            console.error('[UpAI Enhanced] Vuex scan error:', e);
        }
    }
    
    // Enhanced DOM scanning
    function scanDOM() {
        console.log('[UpAI Enhanced] Scanning DOM for jobs...');
        
        const selectors = [
            '[data-test*="job-tile"]',
            '.job-tile',
            'div[class*="job-tile"]',
            '.air3-card-section',
            '.up-card-section',
            'article[data-test*="JobTile"]',
            'section[data-ev-sublocation*="job_tile"]'
        ];
        
        let foundJobs = 0;
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                console.log(`[UpAI Enhanced] Found ${elements.length} elements with ${selector}`);
                
                elements.forEach(el => {
                    try {
                        const titleEl = el.querySelector('a[class*="job-title"], .job-title-link, [data-test="job-title-link"], h4 a, h3 a');
                        if (titleEl && titleEl.textContent) {
                            const href = titleEl.getAttribute('href') || '';
                            const ciphertext = href.match(/~([a-f0-9]+)/)?.[1];
                            
                            const job = {
                                id: ciphertext || Math.random().toString(36).substr(2, 9),
                                title: titleEl.textContent.trim(),
                                url: titleEl.href || '',
                                description: el.querySelector('[class*="description"], p')?.textContent?.trim() || '',
                                budget: el.querySelector('[data-test*="budget"], [class*="amount"]')?.textContent?.trim() || '',
                                posted: el.querySelector('time, [class*="posted"]')?.textContent?.trim() || '',
                                proposals: el.querySelector('[class*="proposals"]')?.textContent?.trim() || ''
                            };
                            
                            const key = job.id;
                            if (!jobCache.has(key) && job.title) {
                                console.log(`[UpAI Enhanced] Found in DOM: ${job.title}`);
                                jobCache.set(key, job);
                                pendingJobs.push(job);
                                foundJobs++;
                            }
                        }
                    } catch(e) {
                        console.debug('[UpAI Enhanced] DOM element error:', e);
                    }
                });
            }
        });
        
        if (foundJobs > 0) {
            console.log(`[UpAI Enhanced] Collected ${foundJobs} jobs from DOM`);
            setTimeout(sendJobsToExtension, 100);
        }
    }
    
    // Network interception
    const originalFetch = window.fetch.bind(window);
    window.fetch = function(...args) {
        const [resource, init] = args;
        const url = typeof resource === 'string' ? resource : resource?.url || '';
        
        return originalFetch(...args).then(async response => {
            try {
                if (url.includes('graphql') || url.includes('/api/')) {
                    const contentType = response.headers.get('content-type');
                    if (contentType?.includes('application/json')) {
                        const clone = response.clone();
                        const text = await clone.text();
                        
                        if (text && !text.startsWith('event:') && !text.startsWith('data:')) {
                            const clean = text.replace(/^\)\]\}',?\n?/, '');
                            if (clean.trim().startsWith('{') || clean.trim().startsWith('[')) {
                                try {
                                    const data = JSON.parse(clean);
                                    if (data?.data) {
                                        processGraphQLResponse(data);
                                    }
                                } catch(e) {
                                    console.debug('[UpAI Enhanced] Parse error:', e);
                                }
                            }
                        }
                    }
                }
            } catch(e) {
                console.debug('[UpAI Enhanced] Fetch intercept error:', e);
            }
            return response;
        });
    };
    
    function processGraphQLResponse(data) {
        if (!data?.data) return;
        
        let foundJobs = 0;
        
        // Check all possible job paths
        const paths = [
            data.data?.marketplaceJobPostingsSearch?.edges,
            data.data?.marketplaceJobPostingsSearch?.results,
            data.data?.findWorkHomeNuxt?.edges,
            data.data?.bestMatches?.edges,
            data.data?.mostRecent?.edges,
            data.data?.savedJobs?.edges,
            data.data?.jobPostings?.edges
        ];
        
        paths.forEach(path => {
            if (Array.isArray(path)) {
                console.log(`[UpAI Enhanced] Found ${path.length} items in GraphQL response`);
                path.forEach(item => {
                    const job = parseJob(item.node || item);
                    if (job) {
                        const key = job.id || job.url || job.title;
                        if (!jobCache.has(key)) {
                            jobCache.set(key, job);
                            pendingJobs.push(job);
                            foundJobs++;
                            console.log(`[UpAI Enhanced] Added from GraphQL: ${job.title}`);
                        }
                    }
                });
            }
        });
        
        if (foundJobs > 0) {
            console.log(`[UpAI Enhanced] Extracted ${foundJobs} jobs from GraphQL`);
            setTimeout(sendJobsToExtension, 100);
        }
    }
    
    // Page navigation monitoring
    function monitorNavigation() {
        // Check for URL changes
        setInterval(() => {
            if (window.location.href !== currentPage) {
                currentPage = window.location.href;
                console.log('[UpAI Enhanced] Page changed to:', currentPage);
                
                // Reset collection state for new page
                lastCollectionTime = 0;
                
                // Wait for page to load then collect
                setTimeout(() => {
                    scanVuexStore();
                    scanDOM();
                }, 1500);
            }
        }, 1000);
        
        // Also monitor pushState/replaceState
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function() {
            originalPushState.apply(history, arguments);
            console.log('[UpAI Enhanced] pushState detected');
            setTimeout(() => {
                scanVuexStore();
                scanDOM();
            }, 1500);
        };
        
        history.replaceState = function() {
            originalReplaceState.apply(history, arguments);
            console.log('[UpAI Enhanced] replaceState detected');
            setTimeout(() => {
                scanVuexStore();
                scanDOM();
            }, 1500);
        };
    }
    
    // Initialize collectors
    function init() {
        console.log('[UpAI Enhanced] Starting collectors...');
        
        // Initial scan
        setTimeout(() => {
            scanVuexStore();
            scanDOM();
        }, 2000);
        
        // Periodic scans
        setInterval(scanVuexStore, 5000);
        
        // DOM mutation observer
        const observer = new MutationObserver(mutations => {
            let hasNewContent = false;
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.querySelector) {
                        if (node.querySelector('[data-test*="job"]') || 
                            node.querySelector('.job-tile') ||
                            (typeof node.className === 'string' && node.className.includes('job'))) {
                            hasNewContent = true;
                        }
                    }
                });
            });
            
            if (hasNewContent) {
                console.log('[UpAI Enhanced] New job content detected');
                setTimeout(() => {
                    scanVuexStore();
                    scanDOM();
                }, 500);
            }
        });
        
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        // Start navigation monitoring
        monitorNavigation();
    }
    
    // Start when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    console.log('[UpAI Enhanced] Collector ready - monitoring all Upwork job pages');
})();
