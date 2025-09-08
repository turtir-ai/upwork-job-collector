import React, { useState, useEffect } from 'react';

export const CollectedJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [sortBy, setSortBy] = useState('recent');
  const [filterSkill, setFilterSkill] = useState('');

  useEffect(() => {
    loadCollectedJobs();
  }, []);

  const loadCollectedJobs = async () => {
    try {
      setLoading(true);
      const response = await chrome.runtime.sendMessage({ 
        action: 'getCollectedJobs' 
      });
      
      if (response.success) {
        setJobs(response.jobs || []);
      } else {
        setError(response.error || 'Failed to load jobs');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadCollectedJobs();
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all collected jobs?')) {
      try {
        await chrome.storage.local.set({ collectedJobs: [] });
        setJobs([]);
        setSelectedJobs(new Set());
      } catch (err) {
        console.error('Error clearing jobs:', err);
      }
    }
  };

  const handleSelectJob = (jobIndex) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobIndex)) {
      newSelected.delete(jobIndex);
    } else {
      newSelected.add(jobIndex);
    }
    setSelectedJobs(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedJobs.size === filteredJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(filteredJobs.map((_, i) => i)));
    }
  };

  const handleBulkGenerate = async () => {
    const selected = Array.from(selectedJobs).map(i => filteredJobs[i]);
    if (selected.length === 0) {
      alert('Please select at least one job');
      return;
    }
    
    // Send message to open the first job and generate proposal
    const firstJob = selected[0];
    if (firstJob.url) {
      await chrome.runtime.sendMessage({
        action: 'openJobAndGenerate',
        url: firstJob.url
      });
      window.close();
    }
  };

  const handleRankWithAI = async () => {
    try {
      setLoading(true);
      const response = await chrome.runtime.sendMessage({
        action: 'rankJobsAI',
        jobs: filteredJobs,
        top: Math.min(10, filteredJobs.length)
      });
      
      if (response.success) {
        // Sort jobs by AI ranking
        const rankedJobs = response.recommendations || [];
        const rankedUrls = new Set(rankedJobs.map(j => j.url));
        const otherJobs = filteredJobs.filter(j => !rankedUrls.has(j.url));
        setJobs([...rankedJobs, ...otherJobs]);
        setSortBy('ai-ranked');
      }
    } catch (err) {
      console.error('Error ranking jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get all unique skills from jobs
  const allSkills = [...new Set(jobs.flatMap(j => j.skills || []))];

  // Filter and sort jobs
  const filteredJobs = jobs.filter(job => {
    if (!filterSkill) return true;
    return job.skills && job.skills.some(s => 
      s.toLowerCase().includes(filterSkill.toLowerCase())
    );
  }).sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.collectedAt || 0) - new Date(a.collectedAt || 0);
      case 'budget-high':
        const budgetA = parseInt(a.budget?.replace(/[^0-9]/g, '') || '0');
        const budgetB = parseInt(b.budget?.replace(/[^0-9]/g, '') || '0');
        return budgetB - budgetA;
      case 'ai-ranked':
        return (b.score || 0) - (a.score || 0);
      default:
        return 0;
    }
  });

  if (loading && jobs.length === 0) {
    return (
      <div className="collected-jobs">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading collected jobs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="collected-jobs">
        <div className="error-container">
          <p>Error: {error}</p>
          <button onClick={handleRefresh}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="collected-jobs">
      <div className="jobs-header">
        <h2>Collected Jobs ({filteredJobs.length})</h2>
        <div className="header-actions">
          <button 
            className="btn btn-sm btn-primary" 
            onClick={handleRefresh}
            disabled={loading}
          >
            🔄 Refresh
          </button>
          <button 
            className="btn btn-sm btn-ai" 
            onClick={handleRankWithAI}
            disabled={loading || filteredJobs.length === 0}
          >
            🤖 Rank with AI
          </button>
          <button 
            className="btn btn-sm btn-danger" 
            onClick={handleClearAll}
            disabled={jobs.length === 0}
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      <div className="jobs-controls">
        <div className="filter-group">
          <label>Filter by skill:</label>
          <select 
            value={filterSkill} 
            onChange={(e) => setFilterSkill(e.target.value)}
            className="filter-select"
          >
            <option value="">All Skills</option>
            {allSkills.map(skill => (
              <option key={skill} value={skill}>{skill}</option>
            ))}
          </select>
        </div>
        
        <div className="sort-group">
          <label>Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="recent">Most Recent</option>
            <option value="budget-high">Highest Budget</option>
            <option value="ai-ranked">AI Ranked</option>
          </select>
        </div>
      </div>

      {filteredJobs.length > 0 && (
        <div className="bulk-actions">
          <button 
            className="btn btn-sm"
            onClick={handleSelectAll}
          >
            {selectedJobs.size === filteredJobs.length ? '☐ Deselect All' : '☑ Select All'}
          </button>
          {selectedJobs.size > 0 && (
            <>
              <span className="selected-count">
                {selectedJobs.size} selected
              </span>
              <button 
                className="btn btn-sm btn-primary"
                onClick={handleBulkGenerate}
              >
                Generate Proposals ({selectedJobs.size})
              </button>
            </>
          )}
        </div>
      )}

      <div className="jobs-list">
        {filteredJobs.length === 0 ? (
          <div className="no-jobs">
            <p>No jobs collected yet.</p>
            <p className="help-text">
              Visit Upwork job listings to automatically collect jobs.
            </p>
          </div>
        ) : (
          filteredJobs.map((job, index) => (
            <div 
              key={index} 
              className={`job-card ${selectedJobs.has(index) ? 'selected' : ''}`}
            >
              <div className="job-card-header">
                <input 
                  type="checkbox"
                  checked={selectedJobs.has(index)}
                  onChange={() => handleSelectJob(index)}
                  className="job-checkbox"
                />
                <h3 className="job-title">
                  {job.title || 'Untitled Job'}
                  {job.score && (
                    <span className="job-score" title="AI Score">
                      ⭐ {job.score}
                    </span>
                  )}
                </h3>
              </div>
              
              <p className="job-description">
                {job.description ? 
                  (job.description.length > 200 ? 
                    job.description.substring(0, 200) + '...' : 
                    job.description) : 
                  'No description available'}
              </p>
              
              <div className="job-meta">
                {job.budget && (
                  <span className="job-budget">💰 {job.budget}</span>
                )}
                {job.clientName && (
                  <span className="job-client">👤 {job.clientName}</span>
                )}
                {job.postedTime && (
                  <span className="job-time">🕒 {job.postedTime}</span>
                )}
                {job.proposals && (
                  <span className="job-proposals">📝 {job.proposals} proposals</span>
                )}
              </div>
              
              {job.skills && job.skills.length > 0 && (
                <div className="job-skills">
                  {job.skills.slice(0, 5).map((skill, i) => (
                    <span key={i} className="skill-tag">{skill}</span>
                  ))}
                  {job.skills.length > 5 && (
                    <span className="skill-tag">+{job.skills.length - 5} more</span>
                  )}
                </div>
              )}
              
              <div className="job-actions">
                {job.url && (
                  <a 
                    href={job.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-link"
                  >
                    Open Job →
                  </a>
                )}
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={async () => {
                    if (job.url) {
                      await chrome.runtime.sendMessage({
                        action: 'openJobAndGenerate',
                        url: job.url
                      });
                      window.close();
                    }
                  }}
                >
                  Generate Proposal
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .collected-jobs {
          padding: 16px;
        }

        .jobs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .jobs-header h2 {
          margin: 0;
          font-size: 20px;
          color: #1a1a1a;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .jobs-controls {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .filter-group, .sort-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-select, .sort-select {
          padding: 4px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
        }

        .bulk-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          padding: 8px;
          background: #e8f4f8;
          border-radius: 6px;
        }

        .selected-count {
          font-weight: 500;
          color: #667eea;
        }

        .jobs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .job-card {
          padding: 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .job-card:hover {
          border-color: #667eea;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .job-card.selected {
          background: #f0f4ff;
          border-color: #667eea;
        }

        .job-card-header {
          display: flex;
          align-items: start;
          gap: 12px;
          margin-bottom: 8px;
        }

        .job-checkbox {
          margin-top: 2px;
        }

        .job-title {
          flex: 1;
          margin: 0;
          font-size: 16px;
          color: #1a1a1a;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .job-score {
          font-size: 12px;
          padding: 2px 6px;
          background: #fff3cd;
          color: #856404;
          border-radius: 4px;
        }

        .job-description {
          margin: 8px 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        }

        .job-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin: 8px 0;
          font-size: 13px;
          color: #64748b;
        }

        .job-skills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 8px 0;
        }

        .skill-tag {
          padding: 2px 8px;
          background: #f1f5f9;
          color: #475569;
          font-size: 12px;
          border-radius: 4px;
        }

        .job-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .no-jobs {
          text-align: center;
          padding: 40px 20px;
          color: #64748b;
        }

        .help-text {
          margin-top: 8px;
          font-size: 14px;
          color: #94a3b8;
        }

        .btn-ai {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .loading-container, .error-container {
          text-align: center;
          padding: 40px;
        }

        .spinner {
          display: inline-block;
          width: 32px;
          height: 32px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
