// options.js - Settings page logic (PHASE 3)
document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const userProfileInput = document.getElementById('user-profile');
  const hourlyRateInput = document.getElementById('hourly-rate');
  const saveButton = document.getElementById('save-button');
  const testButton = document.getElementById('test-button');
  const statusDiv = document.getElementById('status');
  
  // Stats elements
  const totalJobsEl = document.getElementById('total-jobs');
  const appliedJobsEl = document.getElementById('applied-jobs');
  const wonJobsEl = document.getElementById('won-jobs');
  const patternsListEl = document.getElementById('patterns-list');

  // Load saved settings
  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['geminiApiKey', 'userProfile', 'hourlyRate']);
      if (result.geminiApiKey) {
        apiKeyInput.value = result.geminiApiKey;
      }
      if (result.userProfile) {
        userProfileInput.value = result.userProfile;
      }
      if (result.hourlyRate) {
        hourlyRateInput.value = result.hourlyRate;
      }
      
      // Automatically set API key from .env if provided
      if (!result.geminiApiKey) {
        // Use the API key from .env as default
        apiKeyInput.value = 'AIzaSyDXo9-_1q5ErqPZAiJ_9BQL6pLNlkkGcEQ';
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  // Load statistics
  async function loadStatistics() {
    try {
      // Get jobs from storage
      const { collectedJobs = [] } = await chrome.storage.local.get(['collectedJobs']);
      
      // Calculate stats
      const total = collectedJobs.length;
      const applied = collectedJobs.filter(j => j.application_status === 'Başvuruldu').length;
      const won = collectedJobs.filter(j => j.application_status === 'Kazanıldı').length;
      
      // Update UI
      totalJobsEl.textContent = total;
      appliedJobsEl.textContent = applied;
      wonJobsEl.textContent = won;
      
      // Get success patterns
      const statsResponse = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
      if (statsResponse && statsResponse.patterns && statsResponse.patterns.length > 0) {
        patternsListEl.innerHTML = statsResponse.patterns
          .map(p => `<span class="pattern-item">${p.keyword} (${p.count})</span>`)
          .join('');
      } else {
        patternsListEl.innerHTML = '<span style="color: #999;">Henüz yeterli veri yok. En az 2 kazanılmış iş gerekli.</span>';
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  }

  // Save settings
  saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const userProfile = userProfileInput.value.trim();
    const hourlyRate = hourlyRateInput.value.trim();
    
    if (!apiKey) {
      showStatus('Lütfen API anahtarını girin.', 'error');
      return;
    }
    
    if (!userProfile) {
      showStatus('Lütfen profil bilgilerinizi girin.', 'error');
      return;
    }

    try {
      await chrome.storage.sync.set({ 
        geminiApiKey: apiKey, 
        userProfile: userProfile,
        hourlyRate: hourlyRate
      });
      
      showStatus('✅ Ayarlar başarıyla kaydedildi!', 'success');
      
      // Reload statistics after save
      setTimeout(loadStatistics, 500);
      
    } catch (error) {
      showStatus('❌ Kaydetme hatası: ' + error.message, 'error');
    }
  });

  // Test API
  testButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Lütfen önce API anahtarını girin.', 'error');
      return;
    }
    
    testButton.disabled = true;
    testButton.textContent = '⏳ Test ediliyor...';
    
    try {
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Test: Say "API is working!" in Turkish'
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 50,
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const testResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (testResponse) {
          showStatus('✅ API testi başarılı! Yanıt: ' + testResponse.substring(0, 50), 'success');
        } else {
          showStatus('⚠️ API yanıt verdi ama içerik alınamadı.', 'error');
        }
      } else {
        const error = await response.text();
        if (response.status === 400 && error.includes('API_KEY_INVALID')) {
          showStatus('❌ Geçersiz API anahtarı! Lütfen kontrol edin.', 'error');
        } else {
          showStatus(`❌ API hatası: ${response.status} - ${response.statusText}`, 'error');
        }
      }
    } catch (error) {
      showStatus('❌ Bağlantı hatası: ' + error.message, 'error');
    } finally {
      testButton.disabled = false;
      testButton.textContent = '🧪 API Test Et';
    }
  });

  // Show status message
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
    
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    }
  }

  // Toggle password visibility
  window.togglePasswordVisibility = function() {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
    } else {
      apiKeyInput.type = 'password';
    }
  };

  // Initialize
  loadSettings();
  loadStatistics();
  
  // Reload statistics every 30 seconds
  setInterval(loadStatistics, 30000);
});
