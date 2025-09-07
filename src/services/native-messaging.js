/**
 * Native Messaging Service
 * Handles communication with the Python native host
 */

class NativeMessagingService {
  constructor() {
    this.hostName = 'com.upwork.ai.collector';
    this.port = null;
    this.connected = false;
    this.messageQueue = [];
    this.responseHandlers = new Map();
    this.messageId = 0;
  }

  /**
   * Connect to the native host
   */
  async connect() {
    if (this.connected) {
      console.log('Native host already connected');
      return true;
    }

    try {
      console.log('Connecting to native host:', this.hostName);
      this.port = chrome.runtime.connectNative(this.hostName);
      
      this.port.onMessage.addListener((message) => {
        this.handleMessage(message);
      });

      this.port.onDisconnect.addListener(() => {
        console.log('Native host disconnected');
        if (chrome.runtime.lastError) {
          console.error('Native host error:', chrome.runtime.lastError.message);
        }
        this.connected = false;
        this.port = null;
      });

      // Test connection with ping
      const pong = await this.sendMessage({ action: 'ping' });
      if (pong && pong.action === 'pong') {
        this.connected = true;
        console.log('Native host connected successfully');
        
        // Process queued messages
        this.processQueue();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to connect to native host:', error);
      return false;
    }
  }

  /**
   * Send a message to the native host
   */
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      message.id = id;

      // Store the response handler
      this.responseHandlers.set(id, { resolve, reject });

      // Set timeout for response
      setTimeout(() => {
        if (this.responseHandlers.has(id)) {
          this.responseHandlers.delete(id);
          reject(new Error('Native host response timeout'));
        }
      }, 30000); // 30 second timeout

      if (this.connected && this.port) {
        try {
          this.port.postMessage(message);
          console.log('Sent message to native host:', message);
        } catch (error) {
          this.responseHandlers.delete(id);
          reject(error);
        }
      } else {
        // Queue the message if not connected
        this.messageQueue.push(message);
        console.log('Queued message for native host:', message);
        
        // Try to connect
        this.connect().catch(error => {
          this.responseHandlers.delete(id);
          reject(error);
        });
      }
    });
  }

  /**
   * Handle incoming message from native host
   */
  handleMessage(message) {
    console.log('Received message from native host:', message);
    
    const id = message.id;
    if (id && this.responseHandlers.has(id)) {
      const handler = this.responseHandlers.get(id);
      this.responseHandlers.delete(id);
      handler.resolve(message);
    } else {
      // Broadcast message to other parts of extension
      this.broadcastMessage(message);
    }
  }

  /**
   * Broadcast message to content scripts and popup
   */
  broadcastMessage(message) {
    // Send to all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && tab.url.includes('upwork.com')) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'NATIVE_HOST_MESSAGE',
            data: message
          }).catch(() => {
            // Tab might not have content script
          });
        }
      });
    });

    // Store in local storage for popup
    if (message.action === 'jobs_collected' && message.jobs) {
      chrome.storage.local.set({
        native_jobs: message.jobs,
        native_jobs_timestamp: Date.now()
      });
    }
  }

  /**
   * Process queued messages
   */
  processQueue() {
    while (this.messageQueue.length > 0 && this.connected) {
      const message = this.messageQueue.shift();
      if (this.port) {
        this.port.postMessage(message);
      }
    }
  }

  /**
   * Collect jobs from current page
   */
  async collectJobs(url) {
    try {
      const response = await this.sendMessage({
        action: 'collect_jobs',
        url: url
      });
      
      if (response.success && response.jobs) {
        console.log(`Collected ${response.jobs.length} jobs from native host`);
        return response.jobs;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to collect jobs:', error);
      return [];
    }
  }

  /**
   * Analyze a job
   */
  async analyzeJob(jobData) {
    try {
      const response = await this.sendMessage({
        action: 'analyze_job',
        job: jobData
      });
      
      if (response.success && response.analysis) {
        console.log('Job analyzed:', response.analysis);
        return response.analysis;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to analyze job:', error);
      return null;
    }
  }

  /**
   * Disconnect from native host
   */
  disconnect() {
    if (this.port) {
      this.port.disconnect();
      this.port = null;
      this.connected = false;
    }
  }
}

// Export for use in service worker
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NativeMessagingService;
} else {
  window.NativeMessagingService = NativeMessagingService;
}
