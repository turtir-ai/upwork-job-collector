// service-worker.js - Background (MV3) - PHASE 2 ENHANCED
// Parse Upwork GraphQL-like responses and persist unique jobs with AI analysis

// Extractor tuned for marketplaceJobPostingsSearch, with a generic fallback
function extractJobsFromGraphQL(graphQLData) {
  const jobs = [];
  const edges = graphQLData?.data?.marketplaceJobPostingsSearch?.edges;
  if (Array.isArray(edges)) {
    for (const edge of edges) {
      const job = edge?.node;
      if (job && (job.id || job.upworkUrl || job.title)) {
        jobs.push({
          id: job.id || job.upworkUrl || job.title,
          title: job.title || '',
          description: job.description || 'Açıklama bulunamadı.',
          skills: Array.isArray(job.skills) ? job.skills.map(s => s?.name || s).filter(Boolean) : [],
          url: job.upworkUrl || (job.id ? `https://www.upwork.com/jobs/~${job.id}` : ''),
          timestamp: new Date().toISOString(),
          isAnalyzed: false, // NEW: Track analysis status
          application_status: 'Beklemede', // NEW: Add application status
          uygunluk_skoru: null,
          analiz_ozeti: null,
          gereken_teknolojiler: []
        });
      }
    }
    return jobs;
  }

  // Generic fallback: scan for objects resembling jobs
  const out = [];
  const walk = (node) => {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node === 'object') {
      const title = node.title || node.jobTitle || node.position || '';
      const desc = node.description || node.snippet || node.jobDescription || '';
      const url = node.url || node.jobUrl || node.link || '';
      if ((title || desc) && (url || desc)) {
        out.push({
          id: url || title,
          title: String(title || ''),
          description: String(desc || ''),
          skills: node.skills || node.requiredSkills || [],
          url: String(url || ''),
          timestamp: new Date().toISOString()
        });
      }
      for (const v of Object.values(node)) walk(v);
    }
  };
  walk(graphQLData);
  return out.slice(0, 200);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'PROCESS_UPWORK_DATA') {
    try {
      const newJobs = extractJobsFromGraphQL(message.payload || {});
      if (newJobs.length) {
        storeJobs(newJobs);
        console.log(`[Upwork Live Collector] Processing ${newJobs.length} jobs from:`, message.payload?.url || 'unknown URL');
      }
    } catch (e) {
      console.error('[Upwork Live Collector] parse error:', e);
    }
  }
  // NEW: Analyze jobs with AI
  else if (message?.type === 'ANALYZE_JOBS') {
    analyzeAllJobs(message.apiKey).then(result => sendResponse(result));
    return true; // Async response required
  }
  // NEW: Update job application status
  else if (message?.type === 'UPDATE_STATUS') {
    updateJobStatus(message.jobId, message.status).then(() => sendResponse({success: true}));
    return true; // Async response required
  }
  // NEW: Get success patterns (Phase 3)
  else if (message?.type === 'GET_STATS') {
    getSuccessPatterns().then(stats => sendResponse(stats));
    return true;
  }
  // NEW: Generate proposal (Phase 3)
  else if (message?.type === 'GENERATE_PROPOSAL') {
    generateProposal(message.job).then(proposal => sendResponse(proposal));
    return true;
  }
  // Simple getter to verify storage from DevTools
  else if (message?.type === 'GET_COLLECTED_JOBS') {
    chrome.storage.local.get(['collectedJobs']).then((res) => {
      sendResponse({ success: true, jobs: res.collectedJobs || [] });
    }).catch((err) => sendResponse({ success: false, error: String(err) }));
    return true; // async
  }

  return false;
});

// Handle notification clicks
chrome.notifications.onClicked.addListener(() => {
  chrome.action.openPopup();
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    // Görüntüle button clicked
    chrome.action.openPopup();
  }
  chrome.notifications.clear(notificationId);
});

// Initialize badge on startup
chrome.runtime.onStartup.addListener(async () => {
  try {
    const { collectedJobs = [] } = await chrome.storage.local.get(['collectedJobs']);
    chrome.action.setBadgeText({ 
      text: collectedJobs.length > 99 ? '99+' : collectedJobs.length.toString() 
    });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  } catch (e) {
    console.log('[Upwork Live Collector] Startup badge update failed:', e.message);
  }
});

// NEW: AI Analysis Function (PHASE 2)
async function analyzeAllJobs(apiKey) {
  if (!apiKey) {
    // Try to get from storage
    const { geminiApiKey } = await chrome.storage.sync.get(['geminiApiKey']);
    apiKey = geminiApiKey;
  }
  
  if (!apiKey) {
    return { success: false, error: "API anahtarı bulunamadı. Lütfen ayarları kontrol edin." };
  }

  const { collectedJobs } = await chrome.storage.local.get(['collectedJobs']);
  if (!collectedJobs || collectedJobs.length === 0) {
    return { success: true, message: "Analiz edilecek iş bulunamadı." };
  }

  // Only analyze jobs that haven't been analyzed yet
  const jobsToAnalyze = collectedJobs.filter(job => !job.isAnalyzed);
  if (jobsToAnalyze.length === 0) {
    return { success: true, message: "Tüm işler zaten analiz edilmiş." };
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `
Sen bir Upwork iş analizi uzmanısın. Sana bir JSON dizisi içinde iş ilanları vereceğim. 
Her bir iş için benim kişisel yeteneklerime (Python, JavaScript, Web Scraping, Otomasyon, AI, React, Anti-bot evasion, Session management, Proxies) göre bir analiz yap.
Çıktıyı mutlaka bir JSON dizisi olarak, verdiğim her iş için bir nesne içerecek şekilde döndür. 
Her nesne şu alanları içermeli: "id", "uygunluk_skoru" (1-10 arası bir tamsayı), "analiz_ozeti" (1-2 cümlelik Türkçe özet), "gereken_teknolojiler" (bir string dizisi).

İşte analiz edilecek işlerin listesi:
${JSON.stringify(jobsToAnalyze.map(j => ({id: j.id, title: j.title, description: (j.description || '').substring(0, 500), skills: j.skills})))}
`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ 
          parts: [{ text: prompt }] 
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API hatası: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!analysisText) {
      throw new Error('AI yanıtı alınamadı');
    }

    // Try to parse JSON from AI response
    let analysisResults;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/); 
      if (jsonMatch) {
        const jsonStr = jsonMatch[0].replace(/```json|```/g, '').trim();
        analysisResults = JSON.parse(jsonStr);
      } else {
        // Try direct parse
        analysisResults = JSON.parse(analysisText.replace(/```json|```/g, '').trim());
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError, analysisText);
      throw new Error('AI yanıtı parse edilemedi');
    }

    // Merge analysis results with existing jobs
    const updatedJobs = collectedJobs.map(job => {
      const result = analysisResults.find(res => res.id === job.id);
      if (result) {
        return { 
          ...job, 
          ...result, 
          isAnalyzed: true 
        };
      }
      return job;
    });

    await chrome.storage.local.set({ collectedJobs: updatedJobs });
    return { success: true, message: `${analysisResults.length} iş analiz edildi.` };

  } catch (error) {
    console.error("AI Analiz hatası:", error);
    return { success: false, error: error.message };
  }
}

// NEW: Update Job Status Function
async function updateJobStatus(jobId, newStatus) {
  const { collectedJobs } = await chrome.storage.local.get(['collectedJobs']);
  if (!collectedJobs) return;

  const jobIndex = collectedJobs.findIndex(job => job.id === jobId);
  if (jobIndex !== -1) {
    collectedJobs[jobIndex].application_status = newStatus;
    await chrome.storage.local.set({ collectedJobs });
  }
}

// NEW: Get Success Patterns (PHASE 3)
async function getSuccessPatterns() {
  const { collectedJobs } = await chrome.storage.local.get(['collectedJobs']);
  if (!collectedJobs) return { patterns: [], stats: {} };

  const successfulJobs = collectedJobs.filter(job => job.application_status === 'Kazanıldı');
  if (successfulJobs.length < 2) {
    return { patterns: [], stats: { total: collectedJobs.length, won: successfulJobs.length } };
  }

  const keywordFrequency = {};
  successfulJobs.forEach(job => {
    (job.skills || []).forEach(skill => {
      const keyword = typeof skill === 'string' ? skill.toLowerCase() : skill.name?.toLowerCase();
      if (keyword) {
        keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
      }
    });
  });

  const sortedPatterns = Object.entries(keywordFrequency)
    .sort(([, a], [, b]) => b - a)
    .map(([keyword, count]) => ({ keyword, count }));

  return { 
    patterns: sortedPatterns.slice(0, 5), 
    stats: { 
      total: collectedJobs.length, 
      won: successfulJobs.length,
      applied: collectedJobs.filter(j => j.application_status === 'Başvuruldu').length
    } 
  };
}

// NEW: Generate Proposal Function (PHASE 3)
async function generateProposal(job) {
  const { geminiApiKey, userProfile } = await chrome.storage.sync.get(['geminiApiKey', 'userProfile']);
  if (!geminiApiKey) return { success: false, error: "API anahtarı ayarlanmamış." };

  const { collectedJobs } = await chrome.storage.local.get(['collectedJobs']);
  const successfulJobs = (collectedJobs || []).filter(j => j.application_status === 'Kazanıldı');
  
  // Few-shot learning with successful examples
  const examples = successfulJobs.slice(0, 2).map(j => 
    `BAŞARILI ÖRNEK:\nİş Açıklaması: ${(j.description || '').substring(0, 200)}\n\n`
  ).join('');

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
  const prompt = `
Sen, Upwork'te iş kazandıran teklifler yazan bir uzmansın. Benim profilim: "${userProfile || 'Python, Web Scraping, Otomasyon, Anti-bot evasion, Session management uzmanı'}".

${examples}

Şimdi, aşağıdaki yeni iş ilanı için benim profilime ve geçmiş başarılarıma uygun, kısa, etkili ve profesyonel bir teklif taslağı hazırla. 
İşin en önemli 2-3 noktasına odaklan ve benim bu konularda nasıl yardımcı olabileceğimi vurgula.

YENİ İŞ İLANI:
Başlık: ${job.title}
Açıklama: ${job.description}
Yetenekler: ${(job.skills || []).join(', ')}
`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ 
          parts: [{ text: prompt }] 
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      })
    });
    
    if (!response.ok) throw new Error(`API hatası: ${response.statusText}`);
    
    const data = await response.json();
    const proposalText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return { success: true, proposal: proposalText };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function storeJobs(newJobs) {
  try {
    const { collectedJobs = [] } = await chrome.storage.local.get(['collectedJobs']);
    const existing = collectedJobs;

    // Deduplicate by stable key (prefer id, else url|title)
    const seen = new Set(existing.map(j => (j.id || ((j.url || '') + '|' + (j.title || '')))));
    const unique = [];
    for (const j of newJobs) {
      const key = j.id || ((j.url || '') + '|' + (j.title || ''));
      if (!seen.has(key)) { seen.add(key); unique.push(j); }
    }

    if (unique.length) {
      const updated = existing.concat(unique);
      await chrome.storage.local.set({ collectedJobs: updated });
console.log(`[Upwork Live Collector] ✅ Stored ${unique.length} new job(s). Total: ${updated.length}`);
      
      // Store latest stats for popup
      await chrome.storage.local.set({
        jobStats: {
          total: updated.length,
          newToday: unique.length,
          lastUpdate: new Date().toISOString()
        }
      });
      
      // Update badge with total count
      try {
        chrome.action.setBadgeText({ 
          text: updated.length > 99 ? '99+' : updated.length.toString() 
        });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      } catch (e) {
        console.log('[Upwork Live Collector] Badge update failed:', e.message);
      }
      
      // Optional: Show notification for new jobs
      if (unique.length >= 3) {
        try {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: '🚀 Upwork AI Assistant',
            message: `${unique.length} yeni iş bulundu! Toplam: ${updated.length}`,
            buttons: [{ title: 'Görüntüle' }, { title: 'Kapat' }],
            requireInteraction: false
          });
        } catch (e) {
          console.log('[Upwork Live Collector] Notifications not available:', e.message);
        }
      }
    }
  } catch (e) {
    console.error('[Upwork Live Collector] storage error:', e);
  }
}

