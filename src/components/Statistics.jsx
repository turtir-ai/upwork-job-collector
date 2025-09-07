import React, { useState, useEffect } from 'react';

export const Statistics = () => {
  const [stats, setStats] = useState({
    proposalsSent: 0,
    jobsAnalyzed: 0,
    successRate: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStatistics' });
      if (response.success) {
        setStats(response.statistics);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const resetStatistics = async () => {
    if (!confirm('Are you sure you want to reset all statistics?')) return;
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateStatistics',
        statistics: {
          proposalsSent: 0,
          jobsAnalyzed: 0,
          successRate: 0,
          totalEarnings: 0
        }
      });
      
      if (response.success) {
        setStats({
          proposalsSent: 0,
          jobsAnalyzed: 0,
          successRate: 0,
          totalEarnings: 0
        });
      }
    } catch (error) {
      console.error('Error resetting statistics:', error);
    }
  };

  return (
    <div className="statistics">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.proposalsSent}</div>
          <div className="stat-label">Total Proposals</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.jobsAnalyzed}</div>
          <div className="stat-label">Jobs Analyzed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.successRate}%</div>
          <div className="stat-label">Success Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${stats.totalEarnings}</div>
          <div className="stat-label">Total Earnings</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Performance Insights</div>
        <div className="card-body">
          <div className="insight-item">
            <strong>Average Proposals Per Day:</strong>{' '}
            {(stats.proposalsSent / 30).toFixed(1)}
          </div>
          <div className="insight-item">
            <strong>Conversion Rate:</strong>{' '}
            {stats.proposalsSent > 0 
              ? ((stats.successRate / stats.proposalsSent) * 100).toFixed(1) 
              : 0}%
          </div>
          <div className="insight-item">
            <strong>Analysis to Proposal Ratio:</strong>{' '}
            {stats.jobsAnalyzed > 0 
              ? (stats.proposalsSent / stats.jobsAnalyzed).toFixed(2) 
              : 0}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Tips for Improvement</div>
        <div className="card-body">
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            {stats.successRate < 10 && (
              <li>Try personalizing your proposals more</li>
            )}
            {stats.proposalsSent < 10 && (
              <li>Increase your proposal volume for better results</li>
            )}
            {stats.jobsAnalyzed > stats.proposalsSent * 2 && (
              <li>You're analyzing many jobs but not applying - be more selective</li>
            )}
            <li>Always follow up on sent proposals</li>
            <li>Focus on jobs that match your expertise</li>
          </ul>
        </div>
      </div>

      <button 
        className="btn btn-danger btn-block mt-3"
        onClick={resetStatistics}
      >
        Reset All Statistics
      </button>
    </div>
  );
};
