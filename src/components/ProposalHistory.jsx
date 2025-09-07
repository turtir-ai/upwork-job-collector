import React, { useState, useEffect } from 'react';

export const ProposalHistory = () => {
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getProposals' });
      if (response.success) {
        setProposals(response.proposals || []);
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (proposalId) => {
    if (!confirm('Are you sure you want to delete this proposal?')) return;
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'deleteProposal',
        proposalId
      });
      
      if (response.success) {
        setProposals(prev => prev.filter(p => p.id !== proposalId));
        if (selectedProposal?.id === proposalId) {
          setSelectedProposal(null);
        }
      }
    } catch (error) {
      console.error('Error deleting proposal:', error);
    }
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    alert('Proposal copied to clipboard!');
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="text-center">Loading proposals...</div>;
  }

  if (proposals.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📝</div>
        <div className="empty-state-title">No Proposals Yet</div>
        <div className="empty-state-text">
          Your generated proposals will appear here
        </div>
      </div>
    );
  }

  return (
    <div className="proposal-history">
      {selectedProposal ? (
        <div className="proposal-detail">
          <button 
            className="btn btn-outline btn-sm mb-2"
            onClick={() => setSelectedProposal(null)}
          >
            ← Back to List
          </button>
          
          <div className="card">
            <div className="card-header">
              <div className="flex-between">
                <div>
                  {selectedProposal.jobTitle || 'Untitled Job'}
                </div>
                <div className="text-small text-muted">
                  {formatDate(selectedProposal.timestamp)}
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="proposal-content" style={{ whiteSpace: 'pre-wrap' }}>
                {selectedProposal.proposal || selectedProposal.content}
              </div>
              
              <div className="list-item-actions mt-3">
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => handleCopy(selectedProposal.proposal || selectedProposal.content)}
                >
                  📋 Copy
                </button>
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(selectedProposal.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="proposal-list">
          {proposals.map(proposal => (
            <div 
              key={proposal.id} 
              className="list-item"
              onClick={() => setSelectedProposal(proposal)}
            >
              <div className="list-item-header">
                <div className="list-item-title">
                  {proposal.jobTitle || 'Untitled Job'}
                </div>
                <div className="list-item-date">
                  {formatDate(proposal.timestamp)}
                </div>
              </div>
              <div className="list-item-content">
                {(proposal.proposal || proposal.content || '').substring(0, 150)}...
              </div>
              <div className="list-item-actions" onClick={e => e.stopPropagation()}>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => handleCopy(proposal.proposal || proposal.content)}
                >
                  Copy
                </button>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => handleDelete(proposal.id)}
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
