import React, { useState, useEffect } from 'react';

export const Settings = ({ settings, onSave }) => {
  const [formData, setFormData] = useState({
    apiKey: '',
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    maxTokens: 2000,
    autoSave: true,
    notifications: true
  });
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        apiKey: settings.apiKey || '',
        model: settings.model || 'gemini-1.5-flash',
        temperature: settings.temperature || 0.7,
        maxTokens: settings.maxTokens || 2000,
        autoSave: settings.autoSave !== false,
        notifications: settings.notifications !== false
      });
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await onSave(formData);
      if (success) {
        setTestResult({ type: 'success', message: 'Settings saved successfully!' });
      } else {
        setTestResult({ type: 'error', message: 'Failed to save settings.' });
      }
    } catch (error) {
      setTestResult({ type: 'error', message: error.message });
    } finally {
      setSaving(false);
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  const testConnection = async () => {
    if (!formData.apiKey) {
      setTestResult({ type: 'error', message: 'Please enter an API key first.' });
      return;
    }

    setTestResult({ type: 'info', message: 'Testing connection...' });
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'testApiConnection',
        apiKey: formData.apiKey 
      });
      
      if (response.success) {
        setTestResult({ type: 'success', message: 'Connection successful! API is working.' });
      } else {
        setTestResult({ type: 'error', message: 'Connection failed: ' + response.error });
      }
    } catch (error) {
      setTestResult({ type: 'error', message: 'Connection test failed: ' + error.message });
    }
  };

  return (
    <div className="settings">
      {testResult && (
        <div className={`alert alert-${testResult.type}`}>
          {testResult.message}
        </div>
      )}

      <div className="card">
        <div className="card-header">Google AI Configuration</div>
        <div className="card-body">
          <div className="form-group">
            <label htmlFor="apiKey">Google AI API Key</label>
            <input
              type="password"
              id="apiKey"
              name="apiKey"
              value={formData.apiKey}
              onChange={handleChange}
              placeholder="Enter your Google AI (Gemini) API key"
            />
            <small className="text-muted">
              Get your API key from{' '}
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  chrome.tabs.create({ url: 'https://makersuite.google.com/app/apikey' });
                }}
              >
                Google AI Studio
              </a>
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="model">AI Model</label>
            <select
              id="model"
              name="model"
              value={formData.model}
              onChange={handleChange}
            >
              <optgroup label="✅ Çalışan Modeller (Test Edildi)">
                <option value="gemini-1.5-flash">✅ Gemini 1.5 Flash (ÖNERİLEN - STABİL)</option>
                <option value="gemini-1.5-flash-latest">✅ Gemini 1.5 Flash Latest</option>
                <option value="gemini-1.5-flash-8b">✅ Gemini 1.5 Flash-8B (Hızlı)</option>
                <option value="gemini-2.0-flash-exp">✅ Gemini 2.0 Flash (Experimental)</option>
              </optgroup>
              <optgroup label="🆕 Yeni 2.5 Modeller (Çalışıyor!)">
                <option value="gemini-2.5-flash">🆕 Gemini 2.5 Flash (YENİ!)</option>
                <option value="gemini-2.5-flash-lite">🆕 Gemini 2.5 Flash Lite (YENİ!)</option>
                <option value="gemini-2.5-pro">🆕 Gemini 2.5 Pro (YENİ!)</option>
              </optgroup>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="temperature">Temperature (Creativity)</label>
            <input
              type="range"
              id="temperature"
              name="temperature"
              min="0"
              max="1"
              step="0.1"
              value={formData.temperature}
              onChange={handleChange}
            />
            <span className="text-muted">{formData.temperature}</span>
          </div>

          <div className="form-group">
            <label htmlFor="maxTokens">Max Tokens</label>
            <input
              type="number"
              id="maxTokens"
              name="maxTokens"
              min="100"
              max="8000"
              value={formData.maxTokens}
              onChange={handleChange}
            />
          </div>

          <button 
            className="btn btn-outline btn-sm"
            onClick={testConnection}
          >
            Test Connection
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Preferences</div>
        <div className="card-body">
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                name="autoSave"
                checked={formData.autoSave}
                onChange={handleChange}
                style={{ width: 'auto' }}
              />
              Auto-save generated proposals
            </label>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                name="notifications"
                checked={formData.notifications}
                onChange={handleChange}
                style={{ width: 'auto' }}
              />
              Enable notifications
            </label>
          </div>
        </div>
      </div>

      <button 
        className="btn btn-primary btn-block"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>

      <div className="card mt-3">
        <div className="card-header">About</div>
        <div className="card-body">
          <p className="text-small text-muted">
            Upwork AI Assistant v1.0.0<br />
            Powered by Google Gemini AI<br />
            Made with ❤️ for freelancers
          </p>
        </div>
      </div>
    </div>
  );
};
