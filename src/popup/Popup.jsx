import React, { useState, useEffect } from 'react';
import { Dashboard } from '../components/Dashboard';
import { Settings } from '../components/Settings';
import { ProposalHistory } from '../components/ProposalHistory';
import { Templates } from '../components/Templates';
import { Statistics } from '../components/Statistics';

const Popup = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      if (response.success) {
        setSettings(response.settings);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'saveSettings',
        settings: newSettings
      });
      if (response.success) {
        setSettings(newSettings);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error saving settings:', err);
      return false;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard settings={settings} />;
      case 'settings':
        return <Settings settings={settings} onSave={saveSettings} />;
      case 'history':
        return <ProposalHistory />;
      case 'templates':
        return <Templates settings={settings} onSave={saveSettings} />;
      case 'statistics':
        return <Statistics />;
      default:
        return <Dashboard settings={settings} />;
    }
  };

  if (loading) {
    return (
      <div className="popup-container">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="popup-container">
        <div className="error-screen">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={loadSettings}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <div className="logo">
          <img src="assets/icons/icon32.png" alt="Logo" />
          <h1>Upwork AI Assistant</h1>
        </div>
        {settings?.apiKey && (
          <div className="api-status">
            <span className="status-indicator active"></span>
            API Connected
          </div>
        )}
      </header>

      <nav className="popup-nav">
        <button 
          className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <span className="icon">📊</span>
          Dashboard
        </button>
        <button 
          className={`nav-btn ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <span className="icon">📝</span>
          Templates
        </button>
        <button 
          className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <span className="icon">📜</span>
          History
        </button>
        <button 
          className={`nav-btn ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          <span className="icon">📈</span>
          Statistics
        </button>
        <button 
          className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="icon">⚙️</span>
          Settings
        </button>
      </nav>

      <main className="popup-content">
        {renderTabContent()}
      </main>

      <footer className="popup-footer">
        <div className="footer-stats">
          <span>Proposals: {settings?.statistics?.proposalsSent || 0}</span>
          <span>•</span>
          <span>Jobs Analyzed: {settings?.statistics?.jobsAnalyzed || 0}</span>
        </div>
        <div className="footer-links">
          <a href="#" onClick={(e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'https://www.upwork.com' });
          }}>
            Open Upwork
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Popup;
