import React, { useState, useEffect } from 'react';

export const Dashboard = ({ settings }) => {
  const [recentJobs, setRecentJobs] = useState([]);
  const [quickStats, setQuickStats] = useState({
    proposalsToday: 0,
    jobsAnalyzed: 0,
    successRate: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStatistics' });
      if (response.success) {
        setQuickStats({
          proposalsToday: response.statistics.proposalsSent || 0,
          jobsAnalyzed: response.statistics.jobsAnalyzed || 0,
          successRate: response.statistics.successRate || 0
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleQuickGenerate = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'generateProposalFromSelection' });
    window.close();
  };

  const handleQuickAnalyze = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'analyzeJobFromSelection' });
    window.close();
  };

  return (
    <div className="dashboard">
      {!settings?.apiKey && (
        <div className="alert alert-warning">
          <span>⚠️</span>
          Please configure your Google AI API key in Settings to start using AI features.
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{quickStats.proposalsToday}</div>
          <div className="stat-label">Proposals Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{quickStats.jobsAnalyzed}</div>
          <div className="stat-label">Jobs Analyzed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{quickStats.successRate}%</div>
          <div className="stat-label">Success Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{settings?.savedProposals?.length || 0}</div>
          <div className="stat-label">Saved Proposals</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Quick Actions</div>
        <div className="card-body">
          <button 
            className="btn btn-primary btn-block mb-2"
            onClick={handleQuickGenerate}
            disabled={!settings?.apiKey}
          >
            🤖 Generate Proposal for Current Page
          </button>
          <button 
            className="btn btn-secondary btn-block"
            onClick={handleQuickAnalyze}
            disabled={!settings?.apiKey}
          >
            📊 Analyze Current Job
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Tips</div>
        <div className="card-body">
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li>Navigate to any Upwork job posting to see AI buttons</li>
            <li>Use templates for consistent messaging</li>
            <li>Review job analysis before applying</li>
            <li>Track your success rate to improve over time</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
