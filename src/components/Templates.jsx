import React, { useState, useEffect } from 'react';

export const Templates = ({ settings, onSave }) => {
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '' });
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    if (settings?.templates) {
      setTemplates(settings.templates);
    }
  }, [settings]);

  const handleSaveTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content) {
      alert('Please enter both name and content for the template');
      return;
    }

    const updatedTemplates = [
      ...templates,
      {
        id: Date.now().toString(),
        name: newTemplate.name,
        content: newTemplate.content,
        timestamp: new Date().toISOString()
      }
    ];

    const success = await onSave({ ...settings, templates: updatedTemplates });
    if (success) {
      setTemplates(updatedTemplates);
      setNewTemplate({ name: '', content: '' });
      setShowNewForm(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate.name || !editingTemplate.content) {
      alert('Please enter both name and content for the template');
      return;
    }

    const updatedTemplates = templates.map(t => 
      t.id === editingTemplate.id ? editingTemplate : t
    );

    const success = await onSave({ ...settings, templates: updatedTemplates });
    if (success) {
      setTemplates(updatedTemplates);
      setEditingTemplate(null);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    const updatedTemplates = templates.filter(t => t.id !== id);
    const success = await onSave({ ...settings, templates: updatedTemplates });
    if (success) {
      setTemplates(updatedTemplates);
    }
  };

  if (editingTemplate) {
    return (
      <div className="template-editor">
        <button 
          className="btn btn-outline btn-sm mb-2"
          onClick={() => setEditingTemplate(null)}
        >
          ← Back to Templates
        </button>
        
        <div className="form-group">
          <label>Template Name</label>
          <input
            type="text"
            value={editingTemplate.name}
            onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
            placeholder="e.g., Web Development Template"
          />
        </div>
        
        <div className="form-group">
          <label>Template Content</label>
          <textarea
            value={editingTemplate.content}
            onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
            placeholder="Enter your template content..."
            style={{ minHeight: '200px' }}
          />
        </div>
        
        <button 
          className="btn btn-primary btn-block"
          onClick={handleUpdateTemplate}
        >
          Save Changes
        </button>
      </div>
    );
  }

  if (showNewForm) {
    return (
      <div className="template-editor">
        <button 
          className="btn btn-outline btn-sm mb-2"
          onClick={() => setShowNewForm(false)}
        >
          ← Back to Templates
        </button>
        
        <div className="form-group">
          <label>Template Name</label>
          <input
            type="text"
            value={newTemplate.name}
            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
            placeholder="e.g., Web Development Template"
          />
        </div>
        
        <div className="form-group">
          <label>Template Content</label>
          <textarea
            value={newTemplate.content}
            onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
            placeholder="Enter your template content..."
            style={{ minHeight: '200px' }}
          />
        </div>
        
        <button 
          className="btn btn-primary btn-block"
          onClick={handleSaveTemplate}
        >
          Create Template
        </button>
      </div>
    );
  }

  return (
    <div className="templates">
      <button 
        className="btn btn-primary btn-block mb-3"
        onClick={() => setShowNewForm(true)}
      >
        + Create New Template
      </button>

      {templates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <div className="empty-state-title">No Templates Yet</div>
          <div className="empty-state-text">
            Create templates to speed up your proposal writing
          </div>
        </div>
      ) : (
        <div className="template-list">
          {templates.map(template => (
            <div key={template.id} className="list-item">
              <div className="list-item-header">
                <div className="list-item-title">{template.name}</div>
              </div>
              <div className="list-item-content">
                {template.content.substring(0, 100)}...
              </div>
              <div className="list-item-actions">
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => setEditingTemplate(template)}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(template.content);
                    alert('Template copied to clipboard!');
                  }}
                >
                  Copy
                </button>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => handleDeleteTemplate(template.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
