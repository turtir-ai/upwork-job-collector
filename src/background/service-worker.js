// Service Worker - Background Script
import { OpenAIService } from '../services/openai-service.js';
import { StorageService } from '../services/storage-service.js';
import { NotificationService } from '../services/notification-service.js';
import { JobAnalyzer } from '../services/job-analyzer.js';

// Initialize services
const openAIService = new OpenAIService();
const storageService = new StorageService();
const notificationService = new NotificationService();
const jobAnalyzer = new JobAnalyzer();

// Basic settings migration to ensure stability
async function migrateSettings() {
  const defaults = {
    apiKey: '',
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    maxTokens: 2000,
    autoSave: true,
    notifications: true,
    autoCollectOnUpwork: true,
    persistToDisk: false,
    templates: [],
    savedProposals: [],
    jobFilters: {
      minBudget: 0,
      maxBudget: 10000,
      experienceLevel: 'all',
      projectType: 'all',
      keywords: []
    },
    statistics: {
      proposalsSent: 0,
      jobsAnalyzed: 0,
      successRate: 0,
      totalEarnings: 0
    }
  };
  const existing = (await storageService.get('settings')) || {};
  const safeStatistics = {
    proposalsSent: 0,
    jobsAnalyzed: 0,
    successRate: 0,
    totalEarnings: 0,
    ...(existing.statistics || {})
  };
  const safeModel = (
    [
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash-8b',
      'gemini-2.0-flash-exp',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.5-pro'
    ].includes(existing.model)
      ? existing.model
      : 'gemini-1.5-flash'
  );
  const merged = {
    ...defaults,
    apiKey: '',
    model: safeModel,
    temperature: 0.7,
    maxTokens: 2000,
    autoSave: true,
    notifications: true,
    templates: [],
    savedProposals: [],
    jobFilters: {
      minBudget: 0,
      maxBudget: 10000,
      experienceLevel: 'all',
      projectType: 'all',
      keywords: []
    },
    statistics: safeStatistics,
    ...existing,
    model: safeModel,
    statistics: safeStatistics
  };
  await storageService.set('settings', merged);
}

// Run migration at startup and initial load
migrateSettings();
chrome.runtime.onStartup?.addListener(() => {
  migrateSettings();
});

// Extension installation/update handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed successfully');
    initializeExtension();
  } else if (details.reason === 'update') {
    console.log('Extension updated to version', chrome.runtime.getManifest().version);
  }
});

// Initialize extension settings
async function initializeExtension() {
  const defaultSettings = {
    apiKey: '',
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    maxTokens: 2000,
    autoSave: true,
    notifications: true,
    autoCollectOnUpwork: true,
    persistToDisk: false,
    templates: [],
    savedProposals: [],
    jobFilters: {
      minBudget: 0,
      maxBudget: 10000,
      experienceLevel: 'all',
      projectType: 'all',
      keywords: []
    },
    statistics: {
      proposalsSent: 0,
      jobsAnalyzed: 0,
      successRate: 0,
      totalEarnings: 0
    }
  };
  
  await storageService.set('settings', defaultSettings);
  
  // Create context menu items
  createContextMenus();
}

// Create context menu items
function createContextMenus() {
  chrome.contextMenus.create({
    id: 'generate-proposal',
    title: 'Generate AI Proposal',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'analyze-job',
    title: 'Analyze Job Requirements',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'save-template',
    title: 'Save as Template',
    contexts: ['selection']
  });
}

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch(info.menuItemId) {
    case 'generate-proposal':
      handleGenerateProposal(info.selectionText, tab);
      break;
    case 'analyze-job':
      handleAnalyzeJob(info.selectionText, tab);
      break;
    case 'save-template':
      handleSaveTemplate(info.selectionText, tab);
      break;
  }
});

// Message listener for communication with content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  switch(request.action) {
    case 'generateProposal':
      handleProposalGeneration(request, sendResponse);
      return true; // Keep channel open for async response
      
    case 'analyzeJob':
      handleJobAnalysis(request, sendResponse);
      return true;
      
    case 'saveSettings':
      handleSaveSettings(request, sendResponse);
      return true;
      
    case 'getSettings':
      handleGetSettings(sendResponse);
      return true;
      
    case 'saveProposal':
      handleSaveProposal(request, sendResponse);
      return true;
      
    case 'getProposals':
      handleGetProposals(sendResponse);
      return true;
      
    case 'deleteProposal':
      handleDeleteProposal(request, sendResponse);
      return true;
      
    case 'updateStatistics':
      handleUpdateStatistics(request, sendResponse);
      return true;
      
    case 'getStatistics':
      handleGetStatistics(sendResponse);
      return true;
      
    case 'extractJobData':
      handleExtractJobData(request, sendResponse);
      return true;
      
    case 'checkRateLimit':
      handleCheckRateLimit(sendResponse);
      return true;
      
    case 'testApiConnection':
      handleTestApiConnection(request, sendResponse);
      return true;

    case 'recommendJobs':
      handleRecommendJobs(request, sendResponse);
      return true;

    case 'rankJobsAI':
      handleRankJobsAI(request, sendResponse);
      return true;

    case 'openJobAndGenerate':
      handleOpenJobAndGenerate(request, sendResponse);
      return true;

    case 'runCollectorNative':
      handleRunCollectorNative(request, sendResponse);
      return true;

    case 'collector:jobsBatch':
      handleCollectorJobsBatch(request, sendResponse);
      return true;

    case 'getCollectedJobs':
      handleGetCollectedJobs(sendResponse);
      return true;
      
    default:
      console.log('Unknown action:', request.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Handler functions
async function handleProposalGeneration(request, sendResponse) {
  try {
    const settings = await storageService.get('settings');
    
    if (!settings?.apiKey) {
      sendResponse({ 
        success: false, 
        error: 'Google AI API key not configured. Please add your API key in Settings.' 
      });
      return;
    }
    
    openAIService.setApiKey(settings.apiKey);
    
    const proposal = await openAIService.generateProposal({
      jobDescription: request.jobDescription,
      clientName: request.clientName,
      projectBudget: request.projectBudget,
      projectDuration: request.projectDuration,
      skills: request.skills,
      userProfile: request.userProfile,
      template: request.template,
      tone: request.tone || 'professional',
      model: settings.model,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens
    });
    
    // Auto-save if enabled
    if (settings.autoSave) {
      await saveProposalToHistory({
        proposal: proposal,
        jobTitle: request.jobTitle,
        timestamp: new Date().toISOString(),
        jobUrl: request.jobUrl
      });
    }
    
    // Update statistics
    await updateProposalStatistics();
    
    sendResponse({ success: true, proposal: proposal });
    
    // Show notification
    if (settings.notifications) {
      notificationService.show({
        title: 'Proposal Generated!',
        message: 'Your AI proposal is ready.',
        icon: 'assets/icons/icon48.png'
      });
    }
    
  } catch (error) {
    console.error('Error generating proposal:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleJobAnalysis(request, sendResponse) {
  try {
    const settings = await storageService.get('settings');
    
    if (!settings?.apiKey) {
      sendResponse({ 
        success: false, 
        error: 'Google AI API key not configured.' 
      });
      return;
    }
    
    const analysis = await jobAnalyzer.analyzeJob({
      jobDescription: request.jobDescription,
      apiKey: settings.apiKey,
      model: settings.model
    });
    
    // Update statistics (robust defaults)
    const currentSettings = (await storageService.get('settings')) || {};
    currentSettings.statistics = {
      proposalsSent: 0,
      jobsAnalyzed: 0,
      successRate: 0,
      totalEarnings: 0,
      ...(currentSettings.statistics || {})
    };
    currentSettings.statistics.jobsAnalyzed = (currentSettings.statistics.jobsAnalyzed || 0) + 1;
    await storageService.set('settings', currentSettings);
    
    sendResponse({ success: true, analysis: analysis });
    
  } catch (error) {
    console.error('Error analyzing job:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSaveSettings(request, sendResponse) {
  try {
    const currentSettings = (await storageService.get('settings')) || {};
    const updatedSettings = { ...currentSettings, ...request.settings };
    await storageService.set('settings', updatedSettings);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetSettings(sendResponse) {
  try {
    const settings = await storageService.get('settings');
    sendResponse({ success: true, settings: settings });
  } catch (error) {
    console.error('Error getting settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSaveProposal(request, sendResponse) {
  try {
    await saveProposalToHistory(request.proposal);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving proposal:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetProposals(sendResponse) {
  try {
    const settings = await storageService.get('settings');
    sendResponse({ success: true, proposals: settings.savedProposals || [] });
  } catch (error) {
    console.error('Error getting proposals:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleDeleteProposal(request, sendResponse) {
  try {
    const settings = await storageService.get('settings');
    settings.savedProposals = settings.savedProposals.filter(
      p => p.id !== request.proposalId
    );
    await storageService.set('settings', settings);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleUpdateStatistics(request, sendResponse) {
  try {
    const settings = await storageService.get('settings');
    const updatedStats = { ...settings.statistics, ...request.statistics };
    settings.statistics = updatedStats;
    await storageService.set('settings', settings);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error updating statistics:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetStatistics(sendResponse) {
  try {
    const settings = await storageService.get('settings');
    const statistics = settings?.statistics || {
      proposalsSent: 0,
      jobsAnalyzed: 0,
      successRate: 0,
      totalEarnings: 0
    };
    sendResponse({ success: true, statistics: statistics });
  } catch (error) {
    console.error('Error getting statistics:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleExtractJobData(request, sendResponse) {
  try {
    // Send message to content script to extract data
    chrome.tabs.sendMessage(request.tabId, {
      action: 'extractJobData'
    }, (response) => {
      sendResponse(response);
    });
  } catch (error) {
    console.error('Error extracting job data:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleCheckRateLimit(sendResponse) {
  try {
    const rateLimit = await openAIService.checkRateLimit();
    sendResponse({ success: true, rateLimit: rateLimit });
  } catch (error) {
    console.error('Error checking rate limit:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleTestApiConnection(request, sendResponse) {
  try {
    openAIService.setApiKey(request.apiKey);
    const result = await openAIService.testConnection();
    sendResponse(result);
  } catch (error) {
    console.error('Error testing API connection:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Helper functions
async function saveProposalToHistory(proposal) {
  const settings = await storageService.get('settings');
  if (!settings.savedProposals) {
    settings.savedProposals = [];
  }
  
  // Add unique ID and timestamp
  proposal.id = Date.now().toString();
  proposal.timestamp = proposal.timestamp || new Date().toISOString();
  
  // Keep only last 100 proposals
  settings.savedProposals.unshift(proposal);
  if (settings.savedProposals.length > 100) {
    settings.savedProposals = settings.savedProposals.slice(0, 100);
  }
  
  await storageService.set('settings', settings);
}

async function updateProposalStatistics() {
  const settings = (await storageService.get('settings')) || {};
  settings.statistics = {
    proposalsSent: 0,
    jobsAnalyzed: 0,
    successRate: 0,
    totalEarnings: 0,
    ...(settings.statistics || {})
  };
  settings.statistics.proposalsSent = (settings.statistics.proposalsSent || 0) + 1;
  await storageService.set('settings', settings);
}

// Handle alarms for scheduled tasks
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name);
  
  switch(alarm.name) {
    case 'checkNewJobs':
      checkForNewJobs();
      break;
    case 'cleanupOldData':
      cleanupOldData();
      break;
  }
});

// Set up periodic alarms
chrome.alarms.create('checkNewJobs', { periodInMinutes: 30 });
chrome.alarms.create('cleanupOldData', { periodInMinutes: 1440 }); // Daily

async function checkForNewJobs() {
  // Implementation for checking new jobs
  console.log('Checking for new jobs...');
}

async function cleanupOldData() {
  // Clean up old proposals (older than 30 days)
  const settings = await storageService.get('settings');
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  settings.savedProposals = settings.savedProposals.filter(
    p => new Date(p.timestamp) > thirtyDaysAgo
  );
  
  await storageService.set('settings', settings);
  console.log('Old data cleaned up');
}

// Context menu handlers
async function handleGenerateProposal(selectedText, tab) {
  chrome.tabs.sendMessage(tab.id, {
    action: 'generateProposalFromSelection',
    selectedText: selectedText
  });
}

async function handleAnalyzeJob(selectedText, tab) {
  chrome.tabs.sendMessage(tab.id, {
    action: 'analyzeJobFromSelection',
    selectedText: selectedText
  });
}

async function handleSaveTemplate(selectedText, tab) {
  const settings = await storageService.get('settings');
  if (!settings.templates) {
    settings.templates = [];
  }
  
  settings.templates.push({
    id: Date.now().toString(),
    name: `Template ${settings.templates.length + 1}`,
    content: selectedText,
    timestamp: new Date().toISOString()
  });
  
  await storageService.set('settings', settings);
  
  notificationService.show({
    title: 'Template Saved',
    message: 'Your template has been saved successfully.',
    icon: 'assets/icons/icon48.png'
  });
}

console.log('Service Worker initialized');

// Recommend jobs from a list by scoring + expertise boost
async function handleRecommendJobs(request, sendResponse) {
  try {
    const { jobs = [], top = 3 } = request;
    const scored = jobs.map(j => {
      let base = 0;
      try { base = jobAnalyzer.scoreJob(j); } catch (e) { base = 0; }
      const text = `${j.title || ''} ${j.description || ''}`.toLowerCase();
      const expertise = ['cloudflare','akamai','imperva','anti-bot','captcha','login required','javascript rendering','dynamic content','spa','react','vue','angular','playwright','puppeteer','crawler','scraper','scraping','bypass'];
      const hits = expertise.filter(k => text.includes(k)).length;
      const boost = Math.min(15, hits * 3);
      return { ...j, score: Math.round(base + boost) };
    }).sort((a,b) => b.score - a.score).slice(0, top);

    sendResponse({ success: true, recommendations: scored });
  } catch (error) {
    console.error('Error recommending jobs:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// AI rank jobs with Gemini (fallback to heuristic)
async function handleRankJobsAI(request, sendResponse) {
  try {
    const { jobs = [], top = 10 } = request;
    const settings = await storageService.get('settings');
    if (!settings?.apiKey) {
      // Fallback to heuristic if no key
      return handleRecommendJobs({ jobs, top }, sendResponse);
    }
    openAIService.setApiKey(settings.apiKey);
    const ranked = await openAIService.rankJobs(jobs, top);
    if (!ranked || ranked.length === 0) {
      return handleRecommendJobs({ jobs, top }, sendResponse);
    }
    sendResponse({ success: true, recommendations: ranked, ai: true });
  } catch (error) {
    console.error('Error rankJobsAI:', error);
    // Fallback to heuristic
    handleRecommendJobs(request, sendResponse);
  }
}

// Merge and persist live-collected jobs from content script
async function handleCollectorJobsBatch(request, sendResponse) {
  try {
    const incoming = Array.isArray(request.jobs) ? request.jobs : [];
    if (!incoming.length) { sendResponse?.({ success: true, added: 0 }); return; }

    const store = (await storageService.get('collectedJobs')) || [];
    const byKey = new Map(store.map(j => [ (j.url || '') + '|' + (j.title || ''), j ]));
    let added = 0;
    for (const j of incoming) {
      const key = (j.url || '') + '|' + (j.title || '');
      if (!byKey.has(key)) {
        byKey.set(key, { ...j, collectedAt: new Date().toISOString() });
        added++;
      }
    }
    const merged = Array.from(byKey.values());
    await storageService.set('collectedJobs', merged);

    const settings = await storageService.get('settings');
    if (settings?.notifications) {
      notificationService.show({
        title: 'Jobs collected',
        message: `+${added} new, total ${merged.length}`,
        icon: 'assets/icons/icon48.png'
      });
    }
    sendResponse?.({ success: true, added, total: merged.length });
  } catch (error) {
    console.error('handleCollectorJobsBatch error:', error);
    sendResponse?.({ success: false, error: error.message });
  }
}

async function handleGetCollectedJobs(sendResponse) {
  try {
    const store = (await storageService.get('collectedJobs')) || [];
    sendResponse?.({ success: true, jobs: store });
  } catch (error) {
    console.error('handleGetCollectedJobs error:', error);
    sendResponse?.({ success: false, error: error.message });
  }
}

// Native Messaging: trigger local Python collector and receive jobs
async function handleRunCollectorNative(request, sendResponse) {
  try {
    const options = request.options || { mode: 'attach', list_scroll: 3, details: 5 };
    chrome.runtime.sendNativeMessage('com.upwork.ai.collector', options, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Native host error:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      // response expected: { ok: true, jobs: [...] }
      if (response?.ok) {
        sendResponse({ success: true, jobs: response.jobs || [], outDir: response.out_dir });
      } else {
        sendResponse({ success: false, error: response?.error || 'Unknown native host error' });
      }
    });
  } catch (error) {
    console.error('handleRunCollectorNative error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Open a job in new tab and trigger generate panel
async function handleOpenJobAndGenerate(request, sendResponse) {
  try {
    const { url } = request;
    chrome.tabs.create({ url }, (tab) => {
      // After the page loads a bit, ask content script to open the panel and go to generate tab
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: 'openPanelAndSelectGenerate' });
      }, 3000);
      sendResponse({ success: true, tabId: tab.id });
    });
  } catch (error) {
    console.error('Error opening job and generate:', error);
    sendResponse({ success: false, error: error.message });
  }
}
