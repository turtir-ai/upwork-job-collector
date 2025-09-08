// Content Script - Injected into Upwork pages
(function() {
  'use strict';

  // Check if we're on Upwork
  if (!window.location.hostname.includes('upwork.com')) {
    return;
  }

  console.log('Upwork AI Assistant - Content script loaded');

  // Job data extractor
  class JobDataExtractor {
    constructor() {
      this.jobData = {};
    }

    extractFromJobPage() {
      const data = {
        title: '',
        description: '',
        budget: '',
        duration: '',
        experienceLevel: '',
        clientName: '',
        clientCountry: '',
        clientRating: '',
        clientSpent: '',
        clientJobs: '',
        postedTime: '',
        skills: [],
        attachments: [],
        proposals: '',
        interviewing: '',
        invitesSent: '',
        url: window.location.href
      };

      try {
        // Extract job title
        const titleElement = document.querySelector('h1[class*="job-title"], h2[class*="job-title"], [data-test="job-title"]');
        if (titleElement) data.title = titleElement.textContent.trim();

        // Extract job description (robust)
        const descSelectors = [
          '[data-test="job-description"]',
          '[data-test="job-description-text"]',
          '[data-qa="job-description"]',
          'section[data-qa="job-description"]',
          'div[data-qa="job-description"]',
          '.job-description',
          '[class*="job-description"]',
          '[data-test*="Description"]'
        ];
        let descElement = null;
        for (const sel of descSelectors) {
          const el = document.querySelector(sel);
          if (el && el.textContent && el.textContent.trim().length > 0) { descElement = el; break; }
        }
        if (descElement) {
          data.description = descElement.textContent.trim();
        } else {
          // Heuristic fallback: pick the longest text block in main
          const scope = document.querySelector('main, [role="main"]') || document.body;
          const candidates = Array.from(scope.querySelectorAll('article, section, div, p'));
          let bestText = '';
          for (const el of candidates) {
            const text = (el.innerText || '').trim();
            if (text.length > bestText.length) bestText = text;
          }
          if (bestText.length > 200) {
            data.description = bestText;
          }
        }

        // Extract budget
        const budgetElement = document.querySelector('[data-test="budget"], [class*="budget"]');
        if (budgetElement) {
          data.budget = budgetElement.textContent.trim();
        }

        // Extract duration
        const durationElement = document.querySelector('[data-test="duration"], [class*="duration"]');
        if (durationElement) {
          data.duration = durationElement.textContent.trim();
        }

        // Extract experience level
        const expElement = document.querySelector('[data-test="experience-level"], [class*="experience"]');
        if (expElement) {
          data.experienceLevel = expElement.textContent.trim();
        }

        // Extract client information
        const clientNameElement = document.querySelector('[data-test="client-name"], [class*="client-name"]');
        if (clientNameElement) {
          data.clientName = clientNameElement.textContent.trim();
        }

        // Extract skills
        const skillElements = document.querySelectorAll('[data-test="skill"], .skill-badge, [class*="skill"]');
        data.skills = Array.from(skillElements).map(el => el.textContent.trim());

        // Extract proposal count
        const proposalElement = document.querySelector('[class*="proposals"], [data-test="proposals"]');
        if (proposalElement) {
          const match = proposalElement.textContent.match(/\d+/);
          if (match) data.proposals = match[0];
        }

      } catch (error) {
        console.error('Error extracting job data:', error);
      }

      return data;
    }

    extractFromJobList() {
      const jobs = [];
      
      // More comprehensive selectors for different Upwork page layouts
      const selectors = [
        'article[data-test="job-tile"]',
        'div[data-test="job-tile"]',
        'section[data-test="job-tile"]',
        '.job-tile',
        '[class*="job-tile"]',
        'article[data-ev-label*="search_results"]',
        'div[data-ev-label*="search_results"]',
        'section[class*="JobTile"]',
        'div[class*="JobTile"]',
        '[data-qa="job-tile"]',
        '.up-card-section',
        'article.up-card',
        'section.up-card'
      ];
      
      let jobCards = [];
      for (const selector of selectors) {
        const cards = document.querySelectorAll(selector);
        if (cards.length > 0) {
          jobCards = Array.from(cards);
          console.log(`[Upwork AI] Found ${cards.length} job cards with selector: ${selector}`);
          break;
        }
      }
      
      // If no specific job cards found, try generic approach
      if (jobCards.length === 0) {
        const main = document.querySelector('main, [role="main"], #main-content') || document.body;
        jobCards = Array.from(main.querySelectorAll('article, section.up-card, div.up-card')).slice(0, 50);
      }

      jobCards.forEach((card, index) => {
        try {
          const job = {
            title: '',
            description: '',
            budget: '',
            duration: '',
            postedTime: '',
            skills: [],
            proposals: '',
            url: '',
            clientName: '',
            experienceLevel: ''
          };

          // Extract title - more comprehensive
          const titleSelectors = [
            'h4 a[href*="/jobs/"]',
            'h3 a[href*="/jobs/"]',
            'h2 a[href*="/jobs/"]',
            'a[class*="job-title"]',
            '[data-test="job-title-link"]',
            '[class*="JobTitle"]',
            'a[class*="tile-title"]',
            '.up-n-link',
            'h4.my-0 a',
            'h3.my-0 a'
          ];
          
          for (const sel of titleSelectors) {
            const titleEl = card.querySelector(sel);
            if (titleEl) {
              job.title = (titleEl.textContent || '').trim();
              // Also try to get URL from title link
              const href = titleEl.getAttribute('href');
              if (href) {
                job.url = href.startsWith('http') ? href : `https://www.upwork.com${href}`;
              }
              break;
            }
          }

          // Extract description - more comprehensive
          const descSelectors = [
            '[data-test="job-description-text"]',
            '[data-qa="job-description"]',
            '[class*="job-description"]',
            '[class*="JobDescription"]',
            'span[data-test="job-description-text"]',
            'div[data-test="job-description-text"]',
            '.up-line-clamp-v2',
            '[class*="description"]',
            'div.mb-0',
            'span.text-body'
          ];
          
          for (const sel of descSelectors) {
            const descEl = card.querySelector(sel);
            if (descEl && descEl.textContent.trim().length > 20) {
              job.description = (descEl.textContent || '').trim();
              break;
            }
          }

          // Extract budget - more patterns
          const budgetPatterns = [
            '[data-test="budget"]',
            '[class*="budget"]',
            '[data-test="job-type"]',
            '[data-test="is-fixed-price"]',
            'strong',  // Will check content in the loop
            'span[class*="price"]',
            'span[class*="budget"]',
            'span[class*="fixed"]',
            'span[class*="hourly"]',
            'small strong',
            '[class*="job-budget"]',
            '[class*="JobBudget"]'
          ];
          
          for (const pattern of budgetPatterns) {
            const budgetEl = card.querySelector(pattern);
            if (budgetEl) {
              const text = budgetEl.textContent.trim();
              if (text.includes('$') || text.includes('Fixed') || text.includes('Hourly')) {
                job.budget = text;
                break;
              }
            }
          }
          
          // Also search for budget in text content
          if (!job.budget) {
            const cardText = card.textContent;
            const budgetMatch = cardText.match(/\$[\d,]+(?:\.\d{2})?(?:\s*-\s*\$[\d,]+(?:\.\d{2})?)?|Fixed-price|Hourly/i);
            if (budgetMatch) {
              job.budget = budgetMatch[0];
            }
          }

          // Extract skills
          const skillSelectors = [
            '[data-test="skill-badge"]',
            '[data-test="attr-item"]',
            '.up-skill-badge',
            '[class*="skill-badge"]',
            '[class*="SkillBadge"]',
            'span.up-skill-badge',
            'a.up-skill-badge'
          ];
          
          for (const sel of skillSelectors) {
            const skillEls = card.querySelectorAll(sel);
            if (skillEls.length > 0) {
              job.skills = Array.from(skillEls).map(el => el.textContent.trim());
              break;
            }
          }

          // Extract posted time
          const timeSelectors = [
            'time',
            '[data-test="posted-on"]',
            '[class*="posted"]',
            'small time',
            'span time',
            '[data-test="job-pubilshed-date"]'
          ];
          
          for (const sel of timeSelectors) {
            const timeEl = card.querySelector(sel);
            if (timeEl) {
              job.postedTime = (timeEl.textContent || timeEl.getAttribute('datetime') || '').trim();
              break;
            }
          }

          // Extract proposals count
          const proposalText = card.textContent;
          const proposalMatch = proposalText.match(/(\d+)\s*(?:proposals?|applicants?|bids?)/i);
          if (proposalMatch) {
            job.proposals = proposalMatch[1];
          }

          // Extract experience level
          const expMatch = card.textContent.match(/(?:Experience Level:|^)(Entry Level|Intermediate|Expert)/i);
          if (expMatch) {
            job.experienceLevel = expMatch[1];
          }

          // Extract client info if available
          const clientMatch = card.textContent.match(/Payment verified|\$[\d,]+\+? spent/i);
          if (clientMatch) {
            job.clientName = 'Verified Client';
          }

          // If no URL found yet, try all links
          if (!job.url) {
            const anyLink = card.querySelector('a[href*="/jobs/"], a[href*="/nx/jobs/"], a[href*="/ab/jobs/"]');
            if (anyLink) {
              const href = anyLink.getAttribute('href');
              job.url = href.startsWith('http') ? href : `https://www.upwork.com${href}`;
            }
          }

          // Include job if it has at least title or description
          if (job.title || (job.description && job.description.length > 50)) {
            jobs.push(job);
            console.log(`[Upwork AI] Extracted job ${index + 1}:`, job.title || 'Untitled');
          }
        } catch (error) {
          console.error(`[Upwork AI] Error extracting job ${index}:`, error);
        }
      });

      return jobs;
    }
  }

  // Load external collector script to avoid CSP issues
  function injectInPageCollector() {
    try {
      // Check if already injected
      if (document.querySelector('script[data-upwork-ai-collector]')) {
        console.log('[Upwork AI] Collector already injected');
        return;
      }
      
      // Create script element pointing to external file
      const collectorScript = document.createElement('script');
      collectorScript.src = chrome.runtime.getURL('collector-injected.js');
      collectorScript.setAttribute('data-upwork-ai-collector', 'external');
      
      collectorScript.onload = () => {
        console.log('[Upwork AI] External collector loaded successfully');
      };
      
      collectorScript.onerror = (e) => {
        console.error('[Upwork AI] Failed to load external collector:', e);
      };
      
      // Inject the script
      const target = document.head || document.documentElement || document.body;
      if (target) {
        target.appendChild(collectorScript);
        console.log('[Upwork AI] External collector script injected');
      }
    } catch (e) {
      console.warn('injectInPageCollector failed', e);
    }
  }

  // Content -> UI
  // UI Injector
  class UIInjector {
    constructor() {
      this.initialized = false;
      this.floatingButton = null;
      this.aiPanel = null;
    }

    init() {
      if (this.initialized) return;
      
      // Start live network collector
      injectInPageCollector();

      this.createFloatingButton();
      this.createAIPanel();
      this.addStyles();
      
      // Extract job data if on job page
      this.loadJobData();
      
      // Collect jobs from DOM if on a list page
      this.collectJobsFromDOM();
      
      this.initialized = true;
    }
    
    async collectJobsFromDOM() {
      // Check if we're on any Upwork job-related page
      const isJobPage = 
        window.location.href.includes('/nx/search/jobs') || 
        window.location.href.includes('/search/jobs') ||
        window.location.href.includes('/ab/find-work') ||
        window.location.href.includes('/nx/find-work') ||
        window.location.href.includes('/best-matches') ||
        window.location.href.includes('/saved-jobs') ||
        window.location.href.includes('/job-search') ||
        window.location.href.includes('/talent/suggested');
        
      if (isJobPage) {
        console.log('[Upwork AI] Job page detected, attempting collection...');
        
        // Wait a bit for page to fully load
        setTimeout(async () => {
          const extractor = new JobDataExtractor();
          const jobs = extractor.extractFromJobList();
          
          if (jobs && jobs.length > 0) {
            console.log('[Upwork AI] Found', jobs.length, 'jobs via DOM extraction');
            try {
              const response = await chrome.runtime.sendMessage({ 
                action: 'collector:jobsBatch', 
                jobs: jobs 
              });
              console.log('[Upwork AI] Jobs sent to background:', response);
            } catch (e) {
              console.error('[Upwork AI] Failed to send DOM-extracted jobs:', e);
            }
          } else {
            console.log('[Upwork AI] No jobs found via DOM extraction');
            
            // Try again after more delay if no jobs found
            setTimeout(() => {
              const retryJobs = extractor.extractFromJobList();
              if (retryJobs && retryJobs.length > 0) {
                console.log('[Upwork AI] Found', retryJobs.length, 'jobs on retry');
                chrome.runtime.sendMessage({ 
                  action: 'collector:jobsBatch', 
                  jobs: retryJobs 
                }).catch(e => console.error('[Upwork AI] Retry failed:', e));
              }
            }, 3000);
          }
        }, 1500);
      }
      
      // Also set up MutationObserver for dynamic content
      this.setupDynamicObserver();
    }
    
    setupDynamicObserver() {
      // Watch for dynamically loaded jobs
      const observer = new MutationObserver((mutations) => {
        // Check if new job cards were added
        const hasNewJobs = mutations.some(mutation => {
          return Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType === 1) { // Element node
              return node.matches?.('[data-test="job-tile"], .job-tile, article, .up-card') ||
                     node.querySelector?.('[data-test="job-tile"], .job-tile, article, .up-card');
            }
            return false;
          });
        });
        
        if (hasNewJobs) {
          console.log('[Upwork AI] New jobs detected via MutationObserver');
          // Debounce to avoid too many calls
          clearTimeout(this.observerTimeout);
          this.observerTimeout = setTimeout(() => {
            const extractor = new JobDataExtractor();
            const jobs = extractor.extractFromJobList();
            if (jobs && jobs.length > 0) {
              chrome.runtime.sendMessage({ 
                action: 'collector:jobsBatch', 
                jobs: jobs 
              }).catch(e => console.error('[Upwork AI] Observer collection failed:', e));
            }
          }, 1000);
        }
      });
      
      // Start observing
      const target = document.querySelector('main, [role="main"], #main-content') || document.body;
      observer.observe(target, {
        childList: true,
        subtree: true
      });
      
      console.log('[Upwork AI] MutationObserver started for dynamic job loading');
    }
    
    addStyles() {
      // Check if styles already exist
      if (document.getElementById('upwork-ai-styles')) return;
      
      const styles = document.createElement('style');
      styles.id = 'upwork-ai-styles';
      styles.textContent = `
        .ai-panel-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .ai-panel-header h3 {
          margin: 0;
          font-size: 18px;
        }
        
        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
        }
        
        .ai-panel-content {
          padding: 16px;
          max-height: 500px;
          overflow-y: auto;
        }
        
        .ai-panel-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .tab-btn {
          background: none;
          border: none;
          padding: 8px 16px;
          cursor: pointer;
          font-weight: 500;
          color: #64748b;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: all 0.3s;
        }

        .har-import {
          margin: 8px 0 16px;
          padding: 8px;
          background: #f1f5f9;
          border-radius: 8px;
        }
        
        .har-row {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 6px;
        }
        
        .tab-btn.active {
          color: #667eea;
          border-bottom-color: #667eea;
        }
        
        .tab-content {
          display: none;
        }
        
        .tab-content.active {
          display: block;
        }
        
        .input-group {
          margin-bottom: 12px;
        }
        
        .input-group label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
          color: #475569;
          font-size: 14px;
        }
        
        .input-group select {
          width: 100%;
          padding: 8px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
        }
        
        .action-btn, .btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          margin-bottom: 16px;
          transition: opacity 0.3s;
        }
        
        .btn-outline {
          background: white;
          color: #667eea;
          border: 1px solid #667eea;
        }
        
        .btn-sm {
          padding: 6px 12px;
          font-size: 13px;
          width: auto;
          margin-bottom: 0;
        }
        
        .action-btn:hover, .btn:hover {
          opacity: 0.9;
        }
        
        .result-area {
          margin-top: 16px;
        }
        
        .loading {
          text-align: center;
          color: #64748b;
          padding: 20px;
        }
        
        .error {
          color: #ef4444;
          padding: 12px;
          background: #fee2e2;
          border-radius: 6px;
        }
        
        .proposal-output, .analysis-output {
          background: #f8fafc;
          border-radius: 8px;
          padding: 16px;
        }
        
        .proposal-actions {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        
        .proposal-actions button, .copy-btn, .save-btn {
          padding: 6px 12px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          width: auto;
          margin: 0;
        }
        
        .proposal-text {
          line-height: 1.6;
          color: #334155;
        }
        
        .analysis-output h4 {
          margin-top: 0;
          color: #1e293b;
        }
        
        .analysis-section {
          margin-bottom: 12px;
        }
        
        .analysis-section strong {
          color: #475569;
        }
        
        .analysis-section ul {
          margin: 4px 0;
          padding-left: 20px;
        }
        
        .analysis-section p {
          margin: 4px 0;
          color: #64748b;
        }

        .project-suggestions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .project-suggestion {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
        }
        
        .project-title {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
        }
        
        .project-pitch, .project-why {
          color: #475569;
          margin-bottom: 6px;
        }
        
        .project-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
        }
        
        .project-footer .copy-pitch-btn, .open-generate-btn {
          padding: 6px 10px;
          border: 1px solid #e2e8f0;
          background: #fff;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          width: auto;
          margin: 0;
        }
        
        .text-small {
          font-size: 12px;
        }
        
        .text-muted {
          color: #94a3b8;
        }
      `;
      document.head.appendChild(styles);
    }
    
    createFloatingButton() {
      const button = document.createElement('button');
      button.id = 'upwork-ai-floating-btn';
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      `;
      
      button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.3s ease;
      `;

      button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
      });

      button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
      });

      button.addEventListener('click', () => {
        this.toggleAIPanel();
      });

      document.body.appendChild(button);
      this.floatingButton = button;
    }

    createAIPanel() {
      const panel = document.createElement('div');
      panel.id = 'upwork-ai-panel';
      panel.innerHTML = `
        <div class="ai-panel-header">
          <h3>Upwork AI Assistant</h3>
          <button class="close-btn">&times;</button>
        </div>
        <div class="ai-panel-content">
          <div class="ai-panel-tabs">
            <button class="tab-btn active" data-tab="generate">Generate Proposal</button>
            <button class="tab-btn" data-tab="analyze">Analyze Job</button>
            <button class="tab-btn" data-tab="templates">Templates</button>
          </div>
          
          <div class="tab-content active" id="generate-tab">
            <div class="input-group">
              <label>Tone:</label>
              <select id="tone-select">
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="confident">Confident</option>
                <option value="casual">Casual</option>
              </select>
            </div>
            <div class="input-group">
              <label>Template:</label>
              <select id="template-select">
                <option value="">No template</option>
              </select>
            </div>
            <button class="action-btn" id="generate-proposal-btn">
              Generate AI Proposal
            </button>
            <div id="proposal-result" class="result-area"></div>
          </div>
          
          <div class="tab-content" id="analyze-tab">
            <button class="action-btn" id="analyze-job-btn">
              Analyze Current Job
            </button>

            <div class="har-import">
              <div class="har-row">
                <input type="file" id="har-file-input" accept=".har,application/json" />
                <button class="btn btn-outline btn-sm" id="har-import-btn">Import HAR & Rank</button>
              </div>
              <div class="har-row">
                <button class="btn btn-outline btn-sm" id="run-collector-btn">Run Collector (Python)</button>
                <span class="text-small text-muted">Runs local Playwright collector via Native Messaging</span>
              </div>
              <div class="text-small text-muted">Imports first 50-200 jobs from the HAR and ranks them with AI.</div>
            </div>

            <div id="analysis-result" class="result-area"></div>
          </div>
          
          <div class=\"tab-content\" id=\"templates-tab\">
            <div class=\"live-collect-controls\" style=\"margin-bottom:10px; display:flex; gap:6px; flex-wrap:wrap;\">
              <button class=\"btn btn-outline btn-sm\" id=\"use-live-collected-btn\">Use Live Collected & Rank</button>
              <button class=\"btn btn-outline btn-sm\" id=\"download-collected-btn\">Download Collected JSON</button>
            </div>
            <div id="templates-list"></div>
            <button class="action-btn" id="save-template-btn">
              Save Current as Template
            </button>
          </div>
        </div>
      `;

      panel.style.cssText = `
        position: fixed;
        right: 20px;
        bottom: 90px;
        width: 400px;
        max-height: 600px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        z-index: 9998;
        display: none;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      document.body.appendChild(panel);
      this.aiPanel = panel;
      this.attachPanelEventListeners();
    }

    toggleAIPanel() {
      if (this.aiPanel.style.display === 'none' || !this.aiPanel.style.display) {
        this.aiPanel.style.display = 'block';
        this.loadJobData();
      } else {
        this.aiPanel.style.display = 'none';
      }
    }

    attachPanelEventListeners() {
      // Close button
      const closeBtn = this.aiPanel.querySelector('.close-btn');
      closeBtn.addEventListener('click', () => {
        this.aiPanel.style.display = 'none';
      });

      // Tab switching
      const tabBtns = this.aiPanel.querySelectorAll('.tab-btn');
      const tabContents = this.aiPanel.querySelectorAll('.tab-content');
      
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const targetTab = btn.dataset.tab;
          
          // Update active states
          tabBtns.forEach(b => b.classList.remove('active'));
          tabContents.forEach(c => c.classList.remove('active'));
          
          btn.classList.add('active');
          document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
      });

      // Generate proposal button
      const generateBtn = document.getElementById('generate-proposal-btn');
      generateBtn.addEventListener('click', () => {
        this.generateProposal();
      });

      // Analyze job button
      const analyzeBtn = document.getElementById('analyze-job-btn');
      analyzeBtn.addEventListener('click', () => {
        this.analyzeJob();
      });

      // HAR import
      const importBtn = document.getElementById('har-import-btn');
      importBtn?.addEventListener('click', async () => {
        const fileInput = document.getElementById('har-file-input');
        const file = fileInput?.files?.[0];
        if (!file) { alert('Please choose a HAR file first.'); return; }
        const text = await file.text();
        try {
          const har = JSON.parse(text);
          const jobs = this.extractJobsFromHar(har);
          if (!jobs.length) {
            alert('No jobs found in HAR. Make sure it contains job search API responses.');
            return;
          }
          const rec = await chrome.runtime.sendMessage({ action: 'rankJobsAI', jobs, top: 10 });
          if (rec.success) {
            const items = rec.recommendations || [];
            const resultDiv = document.getElementById('analysis-result');
            resultDiv.innerHTML = `
              <div class="analysis-output">
                <h4>${rec.ai ? 'AI Ranked Jobs (Top 10) from HAR' : 'Suggested Jobs from HAR'}</h4>
                <div class="project-suggestions">
                  ${items.map((j, idx) => `
                    <div class="project-suggestion">
                      <div class="project-title">${j.title || 'Job'}</div>
                      <div class="project-pitch">Score: ${j.score || 0} ${j.reason ? ' — ' + j.reason : ''}</div>
                      ${j.url ? `<a href="${j.url}" target="_blank">Open link</a>` : ''}
                      <div class="project-footer">
                        <span></span>
                        ${j.url ? `<button class="open-generate-btn" data-idx="${idx}">Open & Generate</button>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>`;

            const openBtns = resultDiv.querySelectorAll('.open-generate-btn');
            openBtns.forEach(btn => {
              btn.addEventListener('click', async () => {
                const i = parseInt(btn.getAttribute('data-idx'));
                const job = items[i];
                if (job?.url) {
                  await chrome.runtime.sendMessage({ action: 'openJobAndGenerate', url: job.url });
                }
              });
            });
          } else {
            alert('Ranking failed: ' + rec.error);
          }
        } catch (e) {
          console.error(e);
          alert('Invalid HAR/JSON file.');
        }
      });

      // Use Live Collected & Rank
      const useLiveBtn = document.getElementById('use-live-collected-btn');
      useLiveBtn?.addEventListener('click', async () => {
        const resultDiv = document.getElementById('analysis-result');
        resultDiv.innerHTML = '<div class="loading">Using live collected jobs...</div>';
        try {
          const resp = await chrome.runtime.sendMessage({ action: 'getCollectedJobs' });
          if (!resp?.success) { resultDiv.innerHTML = `<div class="error">${resp?.error || 'Could not get collected jobs'}</div>`; return; }
          const jobs = resp.jobs || [];
          if (!jobs.length) { resultDiv.innerHTML = '<div class="error">No live jobs collected yet. Browse a jobs list page.</div>'; return; }
          const rec = await chrome.runtime.sendMessage({ action: 'rankJobsAI', jobs, top: 10 });
          if (rec.success) {
            const items = rec.recommendations || [];
            resultDiv.innerHTML = `
              <div class="analysis-output">
                <h4>${rec.ai ? 'AI Ranked Jobs (Top 10) — Live Collected' : 'Suggested Jobs — Live Collected'}</h4>
                <div class="project-suggestions">
                  ${items.map((j, idx) => `
                    <div class="project-suggestion">
                      <div class="project-title">${j.title || 'Job'}</div>
                      <div class="project-pitch">Score: ${j.score || 0} ${j.reason ? ' — ' + j.reason : ''}</div>
                      ${j.url ? `<a href="${j.url}" target="_blank">Open link</a>` : ''}
                      <div class="project-footer">
                        <span></span>
                        ${j.url ? `<button class="open-generate-btn" data-idx="${idx}">Open & Generate</button>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>`;
            const openBtns = resultDiv.querySelectorAll('.open-generate-btn');
            openBtns.forEach(btn => {
              btn.addEventListener('click', async () => {
                const i = parseInt(btn.getAttribute('data-idx'));
                const job = items[i];
                if (job?.url) await chrome.runtime.sendMessage({ action: 'openJobAndGenerate', url: job.url });
              });
            });
          } else {
            resultDiv.innerHTML = `<div class="error">Ranking failed: ${rec.error}</div>`;
          }
        } catch (e) {
          resultDiv.innerHTML = `<div class="error">Live collect failed: ${e.message}</div>`;
        }
      });

      // Download Collected JSON
      const downloadBtn = document.getElementById('download-collected-btn');
      downloadBtn?.addEventListener('click', async () => {
        try {
          const resp = await chrome.runtime.sendMessage({ action: 'getCollectedJobs' });
          const jobs = resp?.jobs || [];
          const blob = new Blob([JSON.stringify({ jobs, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'upwork-jobs-live.json';
          document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(url);
        } catch (e) {
          alert('Download failed: ' + e.message);
        }
      });

      // Run Collector (Python via Native Messaging)
      const runCollectorBtn = document.getElementById('run-collector-btn');
      runCollectorBtn?.addEventListener('click', async () => {
        const resultDiv = document.getElementById('analysis-result');
        resultDiv.innerHTML = '<div class="loading">Running local collector...</div>';
        try {
          const native = await chrome.runtime.sendMessage({ action: 'runCollectorNative', options: { mode: 'attach', list_scroll: 4, details: 5 } });
          if (!native.success) {
            resultDiv.innerHTML = `<div class="error">Native host error: ${native.error}. Please run install script.</div>`;
            return;
          }
          const jobs = native.jobs || [];
          if (jobs.length === 0) {
            resultDiv.innerHTML = '<div class="error">Collector returned no jobs.</div>';
            return;
          }
          const rec = await chrome.runtime.sendMessage({ action: 'rankJobsAI', jobs, top: 10 });
          if (rec.success) {
            const items = rec.recommendations || [];
            resultDiv.innerHTML = `
              <div class="analysis-output">
                <h4>${rec.ai ? 'AI Ranked Jobs (Top 10) from Collector' : 'Suggested Jobs (Collector)'}</h4>
                <div class="project-suggestions">
                  ${items.map((j, idx) => `
                    <div class="project-suggestion">
                      <div class="project-title">${j.title || 'Job'}</div>
                      <div class="project-pitch">Score: ${j.score || 0} ${j.reason ? ' — ' + j.reason : ''}</div>
                      ${j.url ? `<a href="${j.url}" target="_blank">Open link</a>` : ''}
                      <div class="project-footer">
                        <span></span>
                        ${j.url ? `<button class="open-generate-btn" data-idx="${idx}">Open & Generate</button>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>`;
            const openBtns = resultDiv.querySelectorAll('.open-generate-btn');
            openBtns.forEach(btn => {
              btn.addEventListener('click', async () => {
                const i = parseInt(btn.getAttribute('data-idx'));
                const job = items[i];
                if (job?.url) await chrome.runtime.sendMessage({ action: 'openJobAndGenerate', url: job.url });
              });
            });
          } else {
            resultDiv.innerHTML = `<div class="error">Ranking failed: ${rec.error}</div>`;
          }
        } catch (e) {
          resultDiv.innerHTML = `<div class="error">Collector run failed: ${e.message}</div>`;
        }
      });
    }

    injectJobPageButtons() {
      // Check if we're on a job details page
      if (!window.location.pathname.includes('/jobs/') && 
          !window.location.pathname.includes('/ab/proposals/')) {
        return;
      }

      // Wait for page to load
      setTimeout(() => {
        // Find the apply button area
        const applySection = document.querySelector('[class*="apply"], [data-test="apply-now"]');
        if (!applySection) return;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
          margin-top: 16px;
          display: flex;
          gap: 8px;
        `;

        // Create Generate Proposal button
        const generateBtn = document.createElement('button');
        generateBtn.textContent = '🤖 Generate AI Proposal';
        generateBtn.style.cssText = `
          padding: 10px 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: opacity 0.3s;
        `;
        generateBtn.addEventListener('click', () => {
          this.toggleAIPanel();
          // Switch to generate tab
          document.querySelector('[data-tab="generate"]').click();
        });

        // Create Analyze Job button
        const analyzeBtn = document.createElement('button');
        analyzeBtn.textContent = '📊 Analyze Job';
        analyzeBtn.style.cssText = `
          padding: 10px 16px;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: opacity 0.3s;
        `;
        analyzeBtn.addEventListener('click', () => {
          this.toggleAIPanel();
          // Switch to analyze tab
          document.querySelector('[data-tab="analyze"]').click();
        });

        buttonContainer.appendChild(generateBtn);
        buttonContainer.appendChild(analyzeBtn);
        
        applySection.parentElement.appendChild(buttonContainer);
      }, 2000);
    }

    loadJobData() {
      const extractor = new JobDataExtractor();
      const jobData = extractor.extractFromJobPage();
      
      // Store job data for later use
      window.currentJobData = jobData;
      
      console.log('Extracted job data:', jobData);
    }

    async generateProposal() {
      const resultDiv = document.getElementById('proposal-result');
      resultDiv.innerHTML = '<div class="loading">Generating proposal...</div>';
      
      const tone = document.getElementById('tone-select').value;
      const template = document.getElementById('template-select').value;
      
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'generateProposal',
          jobDescription: window.currentJobData?.description || '',
          jobTitle: window.currentJobData?.title || '',
          clientName: window.currentJobData?.clientName || 'Client',
          projectBudget: window.currentJobData?.budget || '',
          projectDuration: window.currentJobData?.duration || '',
          skills: window.currentJobData?.skills || [],
          tone: tone,
          template: template,
          jobUrl: window.location.href
        });
        
        if (response.success) {
          resultDiv.innerHTML = `
            <div class="proposal-output">
              <div class="proposal-actions">
                <button class="copy-btn">📋 Copy</button>
                <button class="save-btn">💾 Save</button>
              </div>
              <div class="proposal-text">${response.proposal.replace(/\n/g, '<br>')}</div>
            </div>
          `;
          
          // Add copy functionality
          resultDiv.querySelector('.copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(response.proposal);
            alert('Proposal copied to clipboard!');
          });
          
          // Add save functionality
          resultDiv.querySelector('.save-btn').addEventListener('click', () => {
            chrome.runtime.sendMessage({
              action: 'saveProposal',
              proposal: {
                content: response.proposal,
                jobTitle: window.currentJobData?.title,
                jobUrl: window.location.href,
                timestamp: new Date().toISOString()
              }
            });
            alert('Proposal saved!');
          });
        } else {
          resultDiv.innerHTML = `<div class="error">Error: ${response.error}</div>`;
        }
      } catch (error) {
        resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
      }
    }

    async analyzeJob() {
      const resultDiv = document.getElementById('analysis-result');
      resultDiv.innerHTML = '<div class="loading">Analyzing job...</div>';

      // If we are on a list page, recommend best jobs with links
      const extractor = new JobDataExtractor();
      const list = extractor.extractFromJobList();
      if (list && list.length > 0) {
        try {
          const rec = await chrome.runtime.sendMessage({ action: 'rankJobsAI', jobs: list, top: 10 });
          if (rec.success) {
            const items = rec.recommendations || [];
            resultDiv.innerHTML = `
              <div class="analysis-output">
                <h4>${rec.ai ? 'AI Ranked Jobs (Top 10)' : 'Suggested Jobs'}</h4>
                <div class="project-suggestions">
                  ${items.map((j, idx) => `
                    <div class="project-suggestion">
                      <div class="project-title">${j.title || 'Job'}</div>
                      <div class="project-pitch">Score: ${j.score || 0}</div>
                      ${j.url ? `<a href="${j.url}" target="_blank">Open link</a>` : ''}
                      <div class="project-footer">
                        <span class="project-timeline"></span>
                        ${j.url ? `<button class="open-generate-btn" data-idx="${idx}">Open & Generate</button>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>`;

            const openBtns = resultDiv.querySelectorAll('.open-generate-btn');
            openBtns.forEach(btn => {
              btn.addEventListener('click', async () => {
                const i = parseInt(btn.getAttribute('data-idx'));
                const job = items[i];
                if (job?.url) {
                  await chrome.runtime.sendMessage({ action: 'openJobAndGenerate', url: job.url });
                }
              });
            });
            return;
          }
        } catch (e) {
          // fall through to single-page analysis
        }
      }
      
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'analyzeJob',
          jobDescription: window.currentJobData?.description || ''
        });
        
        if (response.success) {
          const analysis = response.analysis;
          const suggestions = analysis.suggestedProjects || [];
          const suggestionsHtml = suggestions.length ? `
              <div class=\"analysis-section\">
                <strong>Suggested Projects:</strong>
                <div class=\"project-suggestions\">
                  ${suggestions.map((s, idx) => `
                    <div class=\"project-suggestion\">
                      <div class=\"project-title\">${s.title}</div>
                      <div class=\"project-pitch\">${s.pitch}</div>
                      ${s.whyFit ? `<div class=\"project-why\">${s.whyFit}</div>` : ''}
                      <ul>
                        ${(s.deliverables || []).map(d => `<li>${d}</li>`).join('')}
                      </ul>
                      <div class=\"project-footer\">
                        <span class=\"project-timeline\">Timeline: ${s.timeline || 'N/A'}</span>
                        <button class=\"copy-pitch-btn\" data-idx=\"${idx}\">Copy Pitch</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>` : '';

          resultDiv.innerHTML = `
            <div class=\"analysis-output\">
              <h4>Job Analysis</h4>
              <div class=\"analysis-section\">
                <strong>Difficulty:</strong> ${analysis.difficulty || 'N/A'}
              </div>
              <div class=\"analysis-section\">
                <strong>Key Requirements:</strong>
                <ul>
                  ${(analysis.requirements || []).map(req => `<li>${req}</li>`).join('')}
                </ul>
              </div>
              <div class=\"analysis-section\">
                <strong>Red Flags:</strong>
                <ul>
                  ${(analysis.redFlags || []).map(flag => `<li>${flag}</li>`).join('')}
                </ul>
              </div>
              <div class=\"analysis-section\">
                <strong>Recommended Approach:</strong>
                <p>${analysis.approach || 'N/A'}</p>
              </div>
              <div class=\"analysis-section\">
                <strong>Success Probability:</strong> ${analysis.successRate || 'N/A'}%
              </div>
              ${suggestionsHtml}
            </div>
          `;

          // Add copy-pitch listeners
          const copyButtons = resultDiv.querySelectorAll('.copy-pitch-btn');
          copyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
              const i = parseInt(btn.getAttribute('data-idx'));
              const s = suggestions[i];
              const pitch = `Project: ${s.title}\n\nWhy this fits: ${s.whyFit || s.pitch}\n\nWhat I will deliver:\n- ${(s.deliverables || []).join('\n- ')}\n\nTimeline: ${s.timeline || 'N/A'}`;
              navigator.clipboard.writeText(pitch);
              alert('Pitch copied to clipboard!');
            });
          });
        } else {
          resultDiv.innerHTML = `<div class="error">Error: ${response.error}</div>`;
        }
      } catch (error) {
        resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
      }
    }
  }

  // HAR helpers
  UIInjector.prototype.extractJobsFromHar = function(har) {
    const entries = har?.log?.entries || [];
    const jobs = [];

    const tryExtract = (text) => {
      try {
        const json = JSON.parse(text);
        const out = [];
        const walk = (node) => {
          if (!node) return;
          if (Array.isArray(node)) { node.forEach(walk); return; }
          if (typeof node === 'object') {
            if ((node.title || node.jobTitle) && (node.description || node.snippet || node.jobDescription)) {
              out.push({
                title: (node.title || node.jobTitle || '').toString(),
                description: (node.description || node.snippet || node.jobDescription || '').toString(),
                skills: node.skills || node.requiredSkills || [],
                budget: node.budget || node.pay || node.price || '',
                url: node.url || node.jobUrl || node.link || ''
              });
            }
            Object.values(node).forEach(walk);
          }
        };
        walk(json);
        return out;
      } catch {
        return [];
      }
    };

    for (const e of entries.slice(0, 1200)) {
      const res = e.response || {};
      const mime = (res.content?.mimeType || '').toLowerCase();
      if (mime.includes('json')) {
        const text = res.content?.text || '';
        const found = tryExtract(text);
        if (found.length) jobs.push(...found);
      }
    }
    // dedupe
    const seen = new Set();
    const deduped = [];
    for (const j of jobs) {
      const key = (j.url || '') + '|' + (j.title || '');
      if (!seen.has(key) && (j.title || j.description)) { seen.add(key); deduped.push(j); }
    }
    return deduped.slice(0, 200);
  };

  // Listen for in-page job batches
  const LIVE_BATCH_BUFFER = [];
  let liveBatchTimer = null;
  window.addEventListener('message', (event) => {
    try {
      // Handle messages from different collectors
      if ((event?.data?.source === 'UpAI-InPage' && event?.data?.type === 'UPWORK_JOBS_DATA') ||
          (event?.data?.source === 'final-collector' && event?.data?.type === 'UPWORK_JOBS_COLLECTED')) {
        
        const jobs = event.data.jobs || event.data.payload?.jobs || [];
        console.log('[Upwork AI] Received jobs from collector:', jobs.length, 'Source:', event.data.source);
        
        if (!jobs.length) return;
        LIVE_BATCH_BUFFER.push(...jobs);
        
        if (liveBatchTimer) {
          clearTimeout(liveBatchTimer);
        }
        
        liveBatchTimer = setTimeout(async () => {
          const batch = LIVE_BATCH_BUFFER.splice(0, LIVE_BATCH_BUFFER.length);
          liveBatchTimer = null;
          if (!batch.length) return;
          
          console.log('[Upwork AI] Sending batch to background:', batch.length);
          try { 
            const response = await chrome.runtime.sendMessage({ 
              action: 'collector:jobsBatch', 
              jobs: batch 
            });
            console.log('[Upwork AI] Background response:', response);
          } catch (e) {
            console.error('[Upwork AI] Failed to send batch:', e);
          }
        }, 750);
      }
    } catch (e) {
      console.error('[Upwork AI] Message handling error:', e);
    }
  });

  // Message listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch(request.action) {
      case 'extractJobData':
        const extractor = new JobDataExtractor();
        const data = extractor.extractFromJobPage();
        sendResponse({ success: true, data: data });
        break;
        
      case 'generateProposalFromSelection':
        // Handle context menu action
        uiInjector.toggleAIPanel();
        break;
        
      case 'analyzeJobFromSelection':
        // Handle context menu action
        uiInjector.toggleAIPanel();
        document.querySelector('[data-tab="analyze"]').click();
        break;

      case 'openPanelAndSelectGenerate':
        uiInjector.toggleAIPanel();
        document.querySelector('[data-tab="generate"]').click();
        break;
    }
  });

  // Initialize UI
  const uiInjector = new UIInjector();
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      uiInjector.init();
    });
  } else {
    uiInjector.init();
  }
  
})();
