// Modern Upwork AI Assistant Panel with Live Collect & Rank
(function() {
  'use strict';

  class ModernAIPanel {
    constructor() {
      this.collectedJobs = [];
      this.isCollecting = false;
      this.setupLiveCollector();
      this.createPanel();
      this.createFloatingButton();
    }

    setupLiveCollector() {
      // Intercept network requests for live job collection
      const script = document.createElement('script');
      script.textContent = `
        (function() {
          const originalFetch = window.fetch;
          window.fetch = async function(...args) {
            const response = await originalFetch.apply(this, args);
            const url = args[0]?.url || args[0];
            
            // Capture Upwork API responses
            if (url && typeof url === 'string' && 
                (url.includes('/graphql') || url.includes('/search/jobs') || url.includes('/nx/find-work'))) {
              try {
                const cloned = response.clone();
                const data = await cloned.json();
                window.postMessage({
                  type: 'UPWORK_LIVE_DATA',
                  payload: data,
                  url: url
                }, '*');
              } catch(e) {}
            }
            return response;
          };

          // Also intercept XHR
          const originalOpen = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = function(method, url) {
            this._url = url;
            return originalOpen.apply(this, arguments);
          };

          const originalSend = XMLHttpRequest.prototype.send;
          XMLHttpRequest.prototype.send = function() {
            this.addEventListener('load', function() {
              if (this._url && 
                  (this._url.includes('/graphql') || this._url.includes('/search/jobs'))) {
                try {
                  const data = JSON.parse(this.responseText);
                  window.postMessage({
                    type: 'UPWORK_LIVE_DATA',
                    payload: data,
                    url: this._url
                  }, '*');
                } catch(e) {}
              }
            });
            return originalSend.apply(this, arguments);
          };
        })();
      `;
      document.head.appendChild(script);

      // Listen for intercepted data
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'UPWORK_LIVE_DATA' && this.isCollecting) {
          this.processLiveData(event.data.payload);
        }
      });
    }

    processLiveData(data) {
      try {
        const jobs = this.extractJobsFromResponse(data);
        if (jobs.length > 0) {
          // Add unique jobs only
          const existingIds = new Set(this.collectedJobs.map(j => j.id));
          const newJobs = jobs.filter(j => j.id && !existingIds.has(j.id));
          
          if (newJobs.length > 0) {
            this.collectedJobs.push(...newJobs);
            this.updateCollectionStatus();
            
            // Store in chrome storage
            chrome.runtime.sendMessage({
              action: 'storeCollectedJobs',
              jobs: this.collectedJobs
            });
          }
        }
      } catch (e) {
        console.error('Error processing live data:', e);
      }
    }

    extractJobsFromResponse(data) {
      const jobs = [];
      
      // GraphQL response structure
      if (data?.data?.marketplaceJobPostings?.edges) {
        const edges = data.data.marketplaceJobPostings.edges;
        edges.forEach(edge => {
          if (edge.node) {
            jobs.push(this.normalizeJob(edge.node));
          }
        });
      }
      
      // Alternative GraphQL structure
      if (data?.data?.searchJobs?.edges) {
        const edges = data.data.searchJobs.edges;
        edges.forEach(edge => {
          if (edge.node) {
            jobs.push(this.normalizeJob(edge.node));
          }
        });
      }
      
      // REST API structure
      if (data?.results && Array.isArray(data.results)) {
        data.results.forEach(job => {
          jobs.push(this.normalizeJob(job));
        });
      }
      
      return jobs;
    }

    normalizeJob(job) {
      return {
        id: job.id || job.uid || job.ciphertext || Math.random().toString(36),
        title: job.title || job.headline || job.name || '',
        description: job.description || job.content || job.details || '',
        budget: job.budget || job.amount || job.hourlyBudget || '',
        skills: job.skills || job.requiredSkills || [],
        url: job.url || job.link || (job.id ? `https://www.upwork.com/jobs/~${job.id}` : ''),
        clientCountry: job.client?.country || job.clientCountry || '',
        proposals: job.proposalsTier || job.proposals || '',
        createdOn: job.createdOn || job.publishedOn || new Date().toISOString()
      };
    }

    createFloatingButton() {
      const button = document.createElement('div');
      button.id = 'upwork-ai-modern-button';
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7V12C2 16.5 4.23 20.68 7.62 23.15L12 24L16.38 23.15C19.77 20.68 22 16.5 22 12V7L12 2Z" fill="currentColor" opacity="0.9"/>
          <path d="M9 12L11 14L15 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="pulse-ring"></div>
      `;
      
      button.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        z-index: 2147483647;
        transition: all 0.3s ease;
        color: white;
      `;

      // Add pulse animation
      const style = document.createElement('style');
      style.textContent = `
        #upwork-ai-modern-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6);
        }
        
        #upwork-ai-modern-button .pulse-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid rgba(102, 126, 234, 0.3);
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
      
      button.addEventListener('click', () => this.togglePanel());
      document.body.appendChild(button);
    }

    createPanel() {
      const panel = document.createElement('div');
      panel.id = 'upwork-ai-modern-panel';
      panel.innerHTML = `
        <div class="ai-panel-container">
          <div class="ai-panel-header">
            <div class="header-left">
              <div class="logo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7V12C2 16.5 4.23 20.68 7.62 23.15L12 24L16.38 23.15C19.77 20.68 22 16.5 22 12V7L12 2Z" fill="url(#grad1)" opacity="0.9"/>
                  <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span class="panel-title">AI Assistant Pro</span>
            </div>
            <button class="close-btn">×</button>
          </div>
          
          <div class="ai-panel-tabs">
            <button class="tab-btn active" data-tab="collect">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
              Live Collect
            </button>
            <button class="tab-btn" data-tab="analyze">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1.81.45 1.61 1.67 1.61 1.16 0 1.6-.64 1.6-1.46 0-.84-.36-1.22-1.88-1.68-2.27-.61-3.61-1.34-3.61-3.25 0-1.86 1.28-2.79 2.96-3.15V5h2.67v1.71c1.63.39 2.44 1.63 2.49 3.22h-1.98c-.05-.81-.49-1.54-1.56-1.54-1.03 0-1.52.52-1.52 1.25 0 .72.45 1.05 1.95 1.49 2.24.58 3.54 1.23 3.54 3.38 0 1.94-1.34 2.98-3.33 3.32z"/>
              </svg>
              Analyze & Rank
            </button>
            <button class="tab-btn" data-tab="generate">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              Generate
            </button>
          </div>
          
          <div class="ai-panel-content">
            <!-- Live Collect Tab -->
            <div class="tab-content active" id="collect-tab">
              <div class="collection-status">
                <div class="status-header">
                  <h3>Live Job Collection</h3>
                  <div class="status-indicator ${this.isCollecting ? 'active' : ''}">
                    <span class="indicator-dot"></span>
                    <span class="indicator-text">${this.isCollecting ? 'Collecting' : 'Paused'}</span>
                  </div>
                </div>
                
                <div class="stats-grid">
                  <div class="stat-card">
                    <div class="stat-value" id="jobs-count">0</div>
                    <div class="stat-label">Jobs Collected</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value" id="session-time">0:00</div>
                    <div class="stat-label">Session Time</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value" id="match-rate">0%</div>
                    <div class="stat-label">Match Rate</div>
                  </div>
                </div>
                
                <div class="collection-controls">
                  <button class="control-btn primary" id="toggle-collection">
                    ${this.isCollecting ? 
                      '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg> Pause Collection' : 
                      '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Start Collection'
                    }
                  </button>
                  
                  <button class="control-btn secondary" id="rank-jobs">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/>
                    </svg>
                    Rank Jobs with AI
                  </button>
                  
                  <button class="control-btn secondary" id="clear-jobs">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                    Clear All
                  </button>
                </div>
                
                <div class="collection-settings">
                  <label class="setting-item">
                    <input type="checkbox" id="auto-rank" checked>
                    <span>Auto-rank when 10+ jobs collected</span>
                  </label>
                  <label class="setting-item">
                    <input type="checkbox" id="notify-matches" checked>
                    <span>Notify on high-match jobs (>80%)</span>
                  </label>
                </div>
              </div>
              
              <div class="recent-jobs">
                <h4>Recently Collected</h4>
                <div id="recent-jobs-list" class="jobs-list">
                  <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <p>No jobs collected yet. Browse Upwork job listings to start collecting.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Analyze & Rank Tab -->
            <div class="tab-content" id="analyze-tab">
              <div class="analyze-section">
                <h3>AI Job Analysis & Ranking</h3>
                
                <div class="analyze-options">
                  <button class="analyze-btn" id="analyze-current">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                    </svg>
                    <span>Analyze Current Page</span>
                  </button>
                  
                  <button class="analyze-btn" id="analyze-collected">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                    <span>Rank Collected Jobs</span>
                  </button>
                  
                  <button class="analyze-btn" id="import-har">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                    </svg>
                    <span>Import HAR File</span>
                    <input type="file" id="har-input" accept=".har" style="display: none;">
                  </button>
                </div>
                
                <div id="analysis-results" class="results-container">
                  <!-- Results will be injected here -->
                </div>
              </div>
            </div>
            
            <!-- Generate Tab -->
            <div class="tab-content" id="generate-tab">
              <div class="generate-section">
                <h3>AI Proposal Generator</h3>
                
                <div class="job-info" id="job-info">
                  <p class="info-text">Analyzing job details...</p>
                </div>
                
                <div class="generate-controls">
                  <div class="tone-selector">
                    <label>Tone:</label>
                    <select id="proposal-tone">
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="confident">Confident</option>
                      <option value="enthusiastic">Enthusiastic</option>
                    </select>
                  </div>
                  
                  <div class="length-selector">
                    <label>Length:</label>
                    <select id="proposal-length">
                      <option value="short">Short (100-150 words)</option>
                      <option value="medium" selected>Medium (150-250 words)</option>
                      <option value="long">Long (250-400 words)</option>
                    </select>
                  </div>
                </div>
                
                <button class="generate-btn" id="generate-proposal">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  Generate Proposal
                </button>
                
                <div id="generated-proposal" class="proposal-output">
                  <!-- Generated proposal will appear here -->
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Add styles
      const styles = document.createElement('style');
      styles.textContent = `
        #upwork-ai-modern-panel {
          position: fixed;
          right: 20px;
          bottom: 100px;
          width: 480px;
          max-height: 680px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          z-index: 2147483646;
          display: none;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          overflow: hidden;
          animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .ai-panel-container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        .ai-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .logo {
          display: flex;
          align-items: center;
        }
        
        .panel-title {
          font-size: 18px;
          font-weight: 600;
        }
        
        .close-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          font-size: 28px;
          line-height: 1;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        .ai-panel-tabs {
          display: flex;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }
        
        .tab-btn {
          flex: 1;
          padding: 12px;
          background: none;
          border: none;
          color: #6c757d;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
        }
        
        .tab-btn:hover {
          background: rgba(0, 0, 0, 0.02);
        }
        
        .tab-btn.active {
          color: #667eea;
          border-bottom-color: #667eea;
          background: white;
        }
        
        .ai-panel-content {
          flex: 1;
          overflow-y: auto;
          background: white;
        }
        
        .tab-content {
          display: none;
          padding: 20px;
        }
        
        .tab-content.active {
          display: block;
        }
        
        .collection-status {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .status-header h3 {
          margin: 0;
          font-size: 18px;
          color: #212529;
        }
        
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: white;
          border-radius: 20px;
          font-size: 13px;
        }
        
        .indicator-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #dc3545;
        }
        
        .status-indicator.active .indicator-dot {
          background: #28a745;
          animation: blink 1.5s infinite;
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .stat-card {
          background: white;
          padding: 12px;
          border-radius: 8px;
          text-align: center;
        }
        
        .stat-value {
          font-size: 24px;
          font-weight: 600;
          color: #667eea;
        }
        
        .stat-label {
          font-size: 11px;
          color: #6c757d;
          margin-top: 4px;
        }
        
        .collection-controls {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
        }
        
        .control-btn {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }
        
        .control-btn.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .control-btn.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        .control-btn.secondary {
          background: white;
          color: #667eea;
          border: 1px solid #667eea;
        }
        
        .control-btn.secondary:hover {
          background: #f8f9fa;
        }
        
        .collection-settings {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .setting-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #495057;
          cursor: pointer;
        }
        
        .setting-item input[type="checkbox"] {
          cursor: pointer;
        }
        
        .recent-jobs {
          margin-top: 20px;
        }
        
        .recent-jobs h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #212529;
        }
        
        .jobs-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 300px;
          overflow-y: auto;
        }
        
        .job-item {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .job-item:hover {
          background: #e9ecef;
          transform: translateX(4px);
        }
        
        .job-item-title {
          font-weight: 500;
          color: #212529;
          margin-bottom: 4px;
          font-size: 14px;
        }
        
        .job-item-meta {
          font-size: 12px;
          color: #6c757d;
        }
        
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #6c757d;
        }
        
        .empty-state p {
          margin-top: 12px;
          font-size: 14px;
        }
        
        .analyze-options {
          display: flex;
          gap: 10px;
          margin: 20px 0;
        }
        
        .analyze-btn {
          flex: 1;
          padding: 16px;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        
        .analyze-btn:hover {
          background: white;
          border-color: #667eea;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .analyze-btn span {
          font-size: 12px;
          color: #495057;
          font-weight: 500;
        }
        
        .results-container {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          min-height: 200px;
        }
        
        .job-card {
          background: white;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
          border: 1px solid #e9ecef;
          transition: all 0.2s;
        }
        
        .job-card:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
        }
        
        .job-card-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 8px;
        }
        
        .job-card-title {
          font-weight: 600;
          color: #212529;
          font-size: 15px;
          flex: 1;
        }
        
        .match-score {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .job-card-description {
          color: #6c757d;
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 12px;
        }
        
        .job-card-actions {
          display: flex;
          gap: 8px;
        }
        
        .job-action-btn {
          padding: 6px 12px;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          font-size: 12px;
          color: #495057;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .job-action-btn:hover {
          background: #f8f9fa;
          border-color: #667eea;
          color: #667eea;
        }
        
        .generate-section {
          padding: 20px 0;
        }
        
        .generate-section h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          color: #212529;
        }
        
        .job-info {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }
        
        .info-text {
          color: #6c757d;
          font-size: 14px;
          margin: 0;
        }
        
        .generate-controls {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .tone-selector, .length-selector {
          flex: 1;
        }
        
        .tone-selector label, .length-selector label {
          display: block;
          font-size: 12px;
          color: #6c757d;
          margin-bottom: 4px;
        }
        
        .tone-selector select, .length-selector select {
          width: 100%;
          padding: 8px;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          font-size: 14px;
        }
        
        .generate-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }
        
        .generate-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
        }
        
        .proposal-output {
          margin-top: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          min-height: 150px;
        }
        
        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: #6c757d;
        }
        
        .loading::after {
          content: '';
          width: 20px;
          height: 20px;
          margin-left: 10px;
          border: 2px solid #667eea;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(styles);
      
      document.body.appendChild(panel);
      this.panel = panel;
      this.attachEventListeners();
    }

    attachEventListeners() {
      // Close button
      this.panel.querySelector('.close-btn').addEventListener('click', () => {
        this.panel.style.display = 'none';
      });

      // Tab switching
      const tabs = this.panel.querySelectorAll('.tab-btn');
      const contents = this.panel.querySelectorAll('.tab-content');
      
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const targetTab = tab.dataset.tab;
          
          tabs.forEach(t => t.classList.remove('active'));
          contents.forEach(c => c.classList.remove('active'));
          
          tab.classList.add('active');
          this.panel.querySelector(`#${targetTab}-tab`).classList.add('active');
        });
      });

      // Collection toggle
      const toggleBtn = this.panel.querySelector('#toggle-collection');
      toggleBtn?.addEventListener('click', () => {
        this.isCollecting = !this.isCollecting;
        this.updateCollectionButton();
        if (this.isCollecting) {
          this.startSessionTimer();
        }
      });

      // Rank jobs
      const rankBtn = this.panel.querySelector('#rank-jobs');
      rankBtn?.addEventListener('click', () => {
        this.rankCollectedJobs();
      });

      // Clear jobs
      const clearBtn = this.panel.querySelector('#clear-jobs');
      clearBtn?.addEventListener('click', () => {
        this.clearCollectedJobs();
      });

      // Analyze current page
      const analyzeCurrentBtn = this.panel.querySelector('#analyze-current');
      analyzeCurrentBtn?.addEventListener('click', () => {
        this.analyzeCurrentPage();
      });

      // Analyze collected jobs
      const analyzeCollectedBtn = this.panel.querySelector('#analyze-collected');
      analyzeCollectedBtn?.addEventListener('click', () => {
        this.rankCollectedJobs();
        // Switch to analyze tab
        this.panel.querySelector('[data-tab="analyze"]').click();
      });

      // Import HAR
      const importHarBtn = this.panel.querySelector('#import-har');
      const harInput = this.panel.querySelector('#har-input');
      
      importHarBtn?.addEventListener('click', () => {
        harInput?.click();
      });
      
      harInput?.addEventListener('change', (e) => {
        this.handleHarImport(e.target.files[0]);
      });

      // Generate proposal
      const generateBtn = this.panel.querySelector('#generate-proposal');
      generateBtn?.addEventListener('click', () => {
        this.generateProposal();
      });
    }

    togglePanel() {
      if (this.panel.style.display === 'none' || !this.panel.style.display) {
        this.panel.style.display = 'block';
      } else {
        this.panel.style.display = 'none';
      }
    }

    updateCollectionButton() {
      const btn = this.panel.querySelector('#toggle-collection');
      const indicator = this.panel.querySelector('.status-indicator');
      const indicatorText = this.panel.querySelector('.indicator-text');
      
      if (this.isCollecting) {
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg> Pause Collection';
        indicator?.classList.add('active');
        if (indicatorText) indicatorText.textContent = 'Collecting';
      } else {
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Start Collection';
        indicator?.classList.remove('active');
        if (indicatorText) indicatorText.textContent = 'Paused';
      }
    }

    updateCollectionStatus() {
      const countEl = this.panel.querySelector('#jobs-count');
      if (countEl) {
        countEl.textContent = this.collectedJobs.length;
      }
      
      this.updateRecentJobsList();
      
      // Auto-rank if enabled and threshold reached
      const autoRank = this.panel.querySelector('#auto-rank');
      if (autoRank?.checked && this.collectedJobs.length >= 10 && this.collectedJobs.length % 10 === 0) {
        this.rankCollectedJobs();
      }
    }

    updateRecentJobsList() {
      const listEl = this.panel.querySelector('#recent-jobs-list');
      if (!listEl) return;
      
      if (this.collectedJobs.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <p>No jobs collected yet. Browse Upwork job listings to start collecting.</p>
          </div>
        `;
      } else {
        const recentJobs = this.collectedJobs.slice(-5).reverse();
        listEl.innerHTML = recentJobs.map(job => `
          <div class="job-item">
            <div class="job-item-title">${job.title || 'Untitled Job'}</div>
            <div class="job-item-meta">
              ${job.budget ? `Budget: ${job.budget} • ` : ''}
              ${job.skills?.length ? `Skills: ${job.skills.slice(0, 3).join(', ')}` : ''}
            </div>
          </div>
        `).join('');
      }
    }

    startSessionTimer() {
      const startTime = Date.now();
      this.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timerEl = this.panel.querySelector('#session-time');
        if (timerEl) {
          timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    }

    async rankCollectedJobs() {
      const resultsEl = this.panel.querySelector('#analysis-results');
      if (!resultsEl) return;
      
      resultsEl.innerHTML = '<div class="loading">Analyzing and ranking jobs with AI</div>';
      
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'rankJobsAI',
          jobs: this.collectedJobs,
          top: 10
        });
        
        if (response?.success) {
          this.displayRankedJobs(response.recommendations);
        } else {
          resultsEl.innerHTML = '<div class="error">Failed to rank jobs. Please try again.</div>';
        }
      } catch (error) {
        console.error('Error ranking jobs:', error);
        resultsEl.innerHTML = '<div class="error">An error occurred while ranking jobs.</div>';
      }
    }

    displayRankedJobs(jobs) {
      const resultsEl = this.panel.querySelector('#analysis-results');
      if (!resultsEl || !jobs?.length) return;
      
      resultsEl.innerHTML = `
        <h4>Top Ranked Jobs (${jobs.length})</h4>
        ${jobs.map((job, index) => `
          <div class="job-card">
            <div class="job-card-header">
              <div class="job-card-title">${job.title || 'Untitled Job'}</div>
              <div class="match-score">${job.score || 0}%</div>
            </div>
            <div class="job-card-description">
              ${job.reason || job.description?.substring(0, 150) || 'No description available'}...
            </div>
            <div class="job-card-actions">
              <button class="job-action-btn" onclick="window.open('${job.url}', '_blank')">View Job</button>
              <button class="job-action-btn generate-for-job" data-job-index="${index}">Generate Proposal</button>
            </div>
          </div>
        `).join('')}
      `;
      
      // Attach generate proposal handlers
      resultsEl.querySelectorAll('.generate-for-job').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.dataset.jobIndex);
          this.generateProposalForJob(jobs[index]);
        });
      });
    }

    async generateProposalForJob(job) {
      // Switch to generate tab
      this.panel.querySelector('[data-tab="generate"]').click();
      
      // Update job info
      const jobInfoEl = this.panel.querySelector('#job-info');
      if (jobInfoEl) {
        jobInfoEl.innerHTML = `
          <h4>${job.title}</h4>
          <p>${job.description?.substring(0, 200) || 'No description available'}...</p>
          ${job.budget ? `<p><strong>Budget:</strong> ${job.budget}</p>` : ''}
          ${job.skills?.length ? `<p><strong>Skills:</strong> ${job.skills.join(', ')}</p>` : ''}
        `;
      }
      
      // Auto-generate proposal
      this.generateProposal(job);
    }

    async generateProposal(jobData) {
      const proposalEl = this.panel.querySelector('#generated-proposal');
      if (!proposalEl) return;
      
      proposalEl.innerHTML = '<div class="loading">Generating AI proposal</div>';
      
      const tone = this.panel.querySelector('#proposal-tone')?.value || 'professional';
      const length = this.panel.querySelector('#proposal-length')?.value || 'medium';
      
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'generateProposal',
          jobData: jobData || this.extractCurrentJobData(),
          tone,
          length
        });
        
        if (response?.success) {
          proposalEl.innerHTML = `
            <div class="proposal-text">${response.proposal}</div>
            <button class="copy-btn" onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent)">Copy to Clipboard</button>
          `;
        } else {
          proposalEl.innerHTML = '<div class="error">Failed to generate proposal. Please try again.</div>';
        }
      } catch (error) {
        console.error('Error generating proposal:', error);
        proposalEl.innerHTML = '<div class="error">An error occurred while generating the proposal.</div>';
      }
    }

    extractCurrentJobData() {
      // Extract job data from current page
      const data = {
        title: document.querySelector('h1')?.textContent || '',
        description: document.querySelector('[data-test="job-description"]')?.textContent || '',
        budget: document.querySelector('[data-test="budget"]')?.textContent || '',
        skills: Array.from(document.querySelectorAll('[data-test="skill"]')).map(el => el.textContent),
        url: window.location.href
      };
      return data;
    }

    async analyzeCurrentPage() {
      const resultsEl = this.panel.querySelector('#analysis-results');
      if (!resultsEl) return;
      
      resultsEl.innerHTML = '<div class="loading">Analyzing current job</div>';
      
      const jobData = this.extractCurrentJobData();
      
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'analyzeJob',
          jobData
        });
        
        if (response?.success) {
          resultsEl.innerHTML = `
            <div class="analysis-result">
              <h4>Job Analysis</h4>
              <div class="match-score" style="font-size: 24px; margin: 10px 0;">
                Match Score: ${response.matchScore || 0}%
              </div>
              <p>${response.analysis || 'No analysis available'}</p>
              ${response.suggestions ? `
                <h5>Suggestions:</h5>
                <ul>
                  ${response.suggestions.map(s => `<li>${s}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `;
        } else {
          resultsEl.innerHTML = '<div class="error">Failed to analyze job. Please try again.</div>';
        }
      } catch (error) {
        console.error('Error analyzing job:', error);
        resultsEl.innerHTML = '<div class="error">An error occurred while analyzing the job.</div>';
      }
    }

    async handleHarImport(file) {
      if (!file) return;
      
      const resultsEl = this.panel.querySelector('#analysis-results');
      if (!resultsEl) return;
      
      resultsEl.innerHTML = '<div class="loading">Processing HAR file</div>';
      
      try {
        const text = await file.text();
        const har = JSON.parse(text);
        
        // Extract jobs from HAR entries
        const jobs = [];
        har.log?.entries?.forEach(entry => {
          if (entry.response?.content?.text) {
            try {
              const data = JSON.parse(entry.response.content.text);
              const extractedJobs = this.extractJobsFromResponse(data);
              jobs.push(...extractedJobs);
            } catch (e) {
              // Skip invalid JSON
            }
          }
        });
        
        if (jobs.length > 0) {
          // Rank imported jobs
          const response = await chrome.runtime.sendMessage({
            action: 'rankJobsAI',
            jobs,
            top: 10
          });
          
          if (response?.success) {
            this.displayRankedJobs(response.recommendations);
          } else {
            resultsEl.innerHTML = '<div class="error">Failed to rank imported jobs.</div>';
          }
        } else {
          resultsEl.innerHTML = '<div class="error">No jobs found in HAR file. Make sure it contains Upwork API responses.</div>';
        }
      } catch (error) {
        console.error('Error processing HAR file:', error);
        resultsEl.innerHTML = '<div class="error">Invalid HAR file or processing error.</div>';
      }
    }

    clearCollectedJobs() {
      if (confirm('Clear all collected jobs? This cannot be undone.')) {
        this.collectedJobs = [];
        this.updateCollectionStatus();
        chrome.runtime.sendMessage({
          action: 'clearCollectedJobs'
        });
      }
    }
  }

  // Initialize the modern panel when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new ModernAIPanel();
    });
  } else {
    new ModernAIPanel();
  }
})();
