// popup.js - Modern popup functionality with AI integration
(function() {
    'use strict';
    
    let jobs = [];
    let settings = {
        apiKey: '',
        autoAnalysis: true,
        notifications: true
    };
    
    // DOM Elements
    const elements = {
        totalJobs: document.getElementById('totalJobs'),
        todayJobs: document.getElementById('todayJobs'),
        matchedJobs: document.getElementById('matchedJobs'),
        jobsList: document.getElementById('jobsList'),
        analysisContent: document.getElementById('analysisContent'),
        notification: document.getElementById('notification'),
        refreshBtn: document.getElementById('refreshBtn'),
        exportBtn: document.getElementById('exportBtn'),
        clearBtn: document.getElementById('clearBtn'),
        apiKey: document.getElementById('apiKey'),
        autoAnalysis: document.getElementById('autoAnalysis'),
        notifications: document.getElementById('notifications')
    };
    
    // Initialize popup
    document.addEventListener('DOMContentLoaded', init);
    
    async function init() {
        await loadSettings();
        await loadJobs();
        setupEventListeners();
        updateStats();
        renderJobs();
        
        // Auto-analysis if enabled and API key exists
        if (settings.autoAnalysis && settings.apiKey) {
            setTimeout(runAIAnalysis, 1000);
        }
    }
    
    function setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                switchTab(tabName);
            });
        });
        
        // Button events
        elements.refreshBtn.addEventListener('click', handleRefresh);
        elements.exportBtn.addEventListener('click', handleExport);
        elements.clearBtn.addEventListener('click', handleClear);
        
        // Settings events
        elements.apiKey.addEventListener('change', saveSettings);
        elements.autoAnalysis.addEventListener('change', saveSettings);
        elements.notifications.addEventListener('change', saveSettings);
        
        // Job click events (delegated)
        elements.jobsList.addEventListener('click', handleJobClick);
    }
    
    function switchTab(tabName) {
        // Remove active class from all tabs
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.content').forEach(c => c.style.display = 'none');
        
        // Add active class to clicked tab
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Tab`).style.display = 'block';
        
        // Load content based on tab
        if (tabName === 'analysis' && settings.apiKey) {
            runAIAnalysis();
        }
    }
    
    async function loadSettings() {
        try {
            const result = await chrome.storage.local.get(['upworkAISettings']);
            if (result.upworkAISettings) {
                settings = { ...settings, ...result.upworkAISettings };
                elements.apiKey.value = settings.apiKey;
                elements.autoAnalysis.checked = settings.autoAnalysis;
                elements.notifications.checked = settings.notifications;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    async function saveSettings() {
        settings.apiKey = elements.apiKey.value;
        settings.autoAnalysis = elements.autoAnalysis.checked;
        settings.notifications = elements.notifications.checked;
        
        try {
            await chrome.storage.local.set({ upworkAISettings: settings });
            showNotification('Ayarlar kaydedildi!', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            showNotification('Ayarlar kaydedilemedi!', 'error');
        }
    }
    
    async function loadJobs() {
        try {
            const result = await chrome.storage.local.get(['collectedJobs']);
            jobs = result.collectedJobs || [];
        } catch (error) {
            console.error('Error loading jobs:', error);
            jobs = [];
        }
    }
    
    function updateStats() {
        const today = new Date().toDateString();
        const todayJobs = jobs.filter(job => 
            job.timestamp && new Date(job.timestamp).toDateString() === today
        );
        const matchedJobs = jobs.filter(job => job.aiScore && job.aiScore >= 70);
        
        elements.totalJobs.textContent = jobs.length;
        elements.todayJobs.textContent = todayJobs.length;
        elements.matchedJobs.textContent = matchedJobs.length;
    }
    
    function renderJobs() {
        if (jobs.length === 0) {
            elements.jobsList.innerHTML = `
                <div class="empty-state">
                    <h3>🔍 İş bulunamadı</h3>
                    <p>Upwork iş sayfalarında gezinin, otomatik olarak işler toplanacak.</p>
                </div>
            `;
            return;
        }
        
        // Sort jobs by timestamp (newest first) and AI score
        const sortedJobs = jobs
            .sort((a, b) => {
                if (a.aiScore && b.aiScore) return b.aiScore - a.aiScore;
                if (a.timestamp && b.timestamp) return new Date(b.timestamp) - new Date(a.timestamp);
                return 0;
            })
            .slice(0, 20); // Show max 20 jobs
        
        elements.jobsList.innerHTML = sortedJobs.map(job => `
            <div class="job-item" data-url="${job.url || ''}" data-id="${job.id || ''}">
                ${job.aiScore ? `<span class="ai-score">${job.aiScore}%</span>` : ''}
                <div class="job-title">${escapeHtml(job.title || 'Untitled Job')}</div>
                <div class="job-meta">
                    ${job.timestamp ? `📅 ${formatDate(job.timestamp)}` : ''}
                    ${job.url ? `🔗 <span style="color: #4CAF50;">Upwork</span>` : ''}
                </div>
                ${job.description ? `<div style="font-size: 11px; opacity: 0.8; margin: 5px 0;">${escapeHtml(job.description.substring(0, 100))}${job.description.length > 100 ? '...' : ''}</div>` : ''}
                ${job.skills && Array.isArray(job.skills) ? `
                    <div class="job-skills">
                        ${job.skills.slice(0, 5).map(skill => `<span class="skill-tag">${escapeHtml(typeof skill === 'string' ? skill : skill.name || 'N/A')}</span>`).join('')}
                        ${job.skills.length > 5 ? `<span class="skill-tag">+${job.skills.length - 5}</span>` : ''}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
    
    async function runAIAnalysis() {
        if (!settings.apiKey) {
            elements.analysisContent.innerHTML = `
                <div class="empty-state">
                    <h3>🤖 AI Analiz</h3>
                    <p>AI analizi için Gemini API anahtarını Ayarlar sekmesinde girin.</p>
                </div>
            `;
            return;
        }
        
        elements.analysisContent.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
            </div>
        `;
        
        try {
            const analysisResults = await analyzeJobsWithAI(jobs.slice(0, 10));
            displayAnalysisResults(analysisResults);
        } catch (error) {
            console.error('AI Analysis error:', error);
            elements.analysisContent.innerHTML = `
                <div class="empty-state">
                    <h3>❌ Analiz Hatası</h3>
                    <p>AI analizi sırasında hata oluştu: ${error.message}</p>
                </div>
            `;
        }
    }
    
    async function analyzeJobsWithAI(jobsToAnalyze) {
        if (!jobsToAnalyze.length) return null;
        
        const prompt = `
As an expert freelancer analyzer, rate these Upwork jobs for a skilled web developer with expertise in:
- Web scraping and automation
- Anti-bot evasion techniques  
- Full-stack development (React, Node.js, Python)
- Session management and proxies
- Data extraction and APIs

Rate each job from 0-100 based on relevance, complexity, and potential value.
Also provide a brief analysis summary.

Jobs to analyze:
${jobsToAnalyze.map((job, i) => `
${i + 1}. Title: ${job.title || 'Untitled'}
   Description: ${(job.description || '').substring(0, 300)}
   Skills: ${Array.isArray(job.skills) ? job.skills.map(s => typeof s === 'string' ? s : s.name).join(', ') : 'N/A'}
`).join('\n')}

Respond in Turkish with JSON format:
{
  "jobs": [{"score": number, "reason": "string"}],
  "summary": "string",
  "recommendations": ["string"]
}`;
        
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + settings.apiKey, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 2048,
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!aiText) {
            throw new Error('No response from AI');
        }
        
        // Try to parse JSON from AI response
        let analysisResult;
        try {
            const jsonMatch = aiText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysisResult = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No valid JSON found');
            }
        } catch (parseError) {
            // Fallback analysis
            analysisResult = {
                jobs: jobsToAnalyze.map(() => ({ score: 75, reason: "Genel değerlendirme" })),
                summary: "AI analizi tamamlandı ancak detaylı sonuç alınamadı.",
                recommendations: ["İş ilanlarını manuel olarak inceleyin", "Yeteneklerinize uygun işlere odaklanın"]
            };
        }
        
        // Update jobs with AI scores
        jobsToAnalyze.forEach((job, index) => {
            if (analysisResult.jobs[index]) {
                job.aiScore = analysisResult.jobs[index].score;
                job.aiReason = analysisResult.jobs[index].reason;
            }
        });
        
        // Save updated jobs
        await chrome.storage.local.set({ collectedJobs: jobs });
        
        return analysisResult;
    }
    
    function displayAnalysisResults(results) {
        if (!results) return;
        
        elements.analysisContent.innerHTML = `
            <div style="margin-bottom: 15px;">
                <h3 style="font-size: 14px; margin-bottom: 10px;">📊 AI Analiz Sonuçları</h3>
                <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 6px; font-size: 12px; line-height: 1.4;">
                    ${results.summary}
                </div>
            </div>
            
            ${results.recommendations ? `
                <div style="margin-bottom: 15px;">
                    <h4 style="font-size: 13px; margin-bottom: 8px;">💡 Öneriler</h4>
                    <ul style="font-size: 11px; padding-left: 15px; line-height: 1.3;">
                        ${results.recommendations.map(rec => `<li style="margin-bottom: 3px;">${rec}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <div>
                <h4 style="font-size: 13px; margin-bottom: 8px;">🎯 En İyi Eşleşmeler</h4>
                <div>
                    ${jobs
                        .filter(job => job.aiScore && job.aiScore >= 70)
                        .sort((a, b) => b.aiScore - a.aiScore)
                        .slice(0, 5)
                        .map(job => `
                            <div class="job-item" style="margin-bottom: 8px; padding: 8px;" data-url="${job.url || ''}">
                                <span class="ai-score">${job.aiScore}%</span>
                                <div class="job-title" style="font-size: 12px;">${escapeHtml(job.title || 'Untitled')}</div>
                                ${job.aiReason ? `<div style="font-size: 10px; opacity: 0.7; margin-top: 3px;">${escapeHtml(job.aiReason)}</div>` : ''}
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
        
        // Update main jobs view
        renderJobs();
        updateStats();
    }
    
    async function handleRefresh() {
        elements.refreshBtn.innerHTML = '🔄 Yenileniyor...';
        elements.refreshBtn.disabled = true;
        
        try {
            await loadJobs();
            updateStats();
            renderJobs();
            showNotification('Veriler yenilendi!', 'success');
            
            if (settings.autoAnalysis && settings.apiKey) {
                setTimeout(runAIAnalysis, 500);
            }
        } catch (error) {
            console.error('Refresh error:', error);
            showNotification('Yenileme hatası!', 'error');
        } finally {
            elements.refreshBtn.innerHTML = '🔄 Yenile';
            elements.refreshBtn.disabled = false;
        }
    }
    
    function handleExport() {
        if (jobs.length === 0) {
            showNotification('Export edilecek veri yok!', 'error');
            return;
        }
        
        const exportData = {
            exportDate: new Date().toISOString(),
            totalJobs: jobs.length,
            jobs: jobs.map(job => ({
                title: job.title,
                description: job.description,
                skills: job.skills,
                url: job.url,
                timestamp: job.timestamp,
                aiScore: job.aiScore,
                aiReason: job.aiReason
            }))
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `upwork-jobs-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        showNotification('Veriler export edildi!', 'success');
    }
    
    async function handleClear() {
        if (!confirm('Tüm toplanan iş verilerini silmek istediğinizden emin misiniz?')) {
            return;
        }
        
        try {
            await chrome.storage.local.remove(['collectedJobs']);
            jobs = [];
            updateStats();
            renderJobs();
            elements.analysisContent.innerHTML = '';
            showNotification('Tüm veriler temizlendi!', 'success');
        } catch (error) {
            console.error('Clear error:', error);
            showNotification('Temizleme hatası!', 'error');
        }
    }
    
    function handleJobClick(event) {
        const jobItem = event.target.closest('.job-item');
        if (!jobItem) return;
        
        const url = jobItem.dataset.url;
        if (url && url.startsWith('http')) {
            chrome.tabs.create({ url: url });
        }
    }
    
    function showNotification(message, type = 'info') {
        elements.notification.textContent = message;
        elements.notification.className = `notification ${type === 'success' ? 'show' : 'show'}`;
        
        setTimeout(() => {
            elements.notification.classList.remove('show');
        }, 3000);
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
        
        if (diffHours < 1) return 'Az önce';
        if (diffHours < 24) return `${diffHours} saat önce`;
        if (diffHours < 48) return 'Dün';
        return date.toLocaleDateString('tr-TR');
    }
    
})();
