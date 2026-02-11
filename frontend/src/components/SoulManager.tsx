import React, { useState, useEffect } from 'react';
import { GlitchText } from './GlitchText';

interface AgentSoul {
  id: string;
  name: string;
  description: string;
  soul: string;
  identity: string;
  bible: string;
  model: string;
  temperature: number;
  createdAt: string;
}

export function SoulManager() {
  const [souls, setSouls] = useState<AgentSoul[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingSoul, setEditingSoul] = useState<AgentSoul | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadSouls() {
      try {
        const response = await fetch('/api/agents/souls');
        if (!response.ok) throw new Error('Failed to load');
        const data = await response.json();
        if (mounted) {
          setSouls(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (mounted) setError('Failed to load souls');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadSouls();
    return () => { mounted = false; };
  }, []);

  const handleSave = async (soulData: Partial<AgentSoul>) => {
    try {
      const url = editingSoul ? `/api/agents/souls/${editingSoul.id}` : '/api/agents/souls';
      const method = editingSoul ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(soulData)
      });
      if (!response.ok) throw new Error('Failed to save');
      const saved = await response.json();
      setSouls(prev => editingSoul 
        ? prev.map(s => s.id === saved.id ? saved : s)
        : [...prev, saved]
      );
      setShowEditor(false);
      setEditingSoul(null);
    } catch (err) {
      setError('Failed to save soul');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this soul?')) return;
    try {
      await fetch(`/api/agents/souls/${id}`, { method: 'DELETE' });
      setSouls(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setError('Failed to delete');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <GlitchText text="🧠 Agent Souls" className="text-2xl font-display font-bold" />
          <p className="text-gray-400 text-sm mt-1">Define AI personas with personality, identity, and rules</p>
        </div>
        <button onClick={() => setShowEditor(true)} className="cyber-button-primary">
          + New Soul
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-cyber-red/20 border border-cyber-red rounded text-cyber-red text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="cyber-stat-card">
          <div className="cyber-stat-value">{souls.length}</div>
          <div className="cyber-stat-label">Total Souls</div>
        </div>
        <div className="cyber-stat-card">
          <div className="cyber-stat-value text-cyber-cyan">
            {souls.filter(s => s.name.includes('Crawlee')).length}
          </div>
          <div className="cyber-stat-label">Crawlee</div>
        </div>
        <div className="cyber-stat-card">
          <div className="cyber-stat-value text-cyber-yellow">
            {souls.filter(s => s.name.includes('Scrapy')).length}
          </div>
          <div className="cyber-stat-label">Scrapy</div>
        </div>
      </div>

      {/* Souls Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading souls...</div>
      ) : souls.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🧠</div>
          <h3 className="text-xl font-semibold mb-2">No Souls Yet</h3>
          <p className="text-gray-400 mb-4">Create your first agent soul</p>
          <button onClick={() => setShowEditor(true)} className="cyber-button-primary">
            + Create Soul
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {souls.map(soul => (
            <div key={soul.id} className="cyber-card-hover">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{soul.name}</h3>
                  <p className="text-xs text-gray-500 font-mono">{soul.id?.slice(0, 8)}</p>
                </div>
              </div>

              <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                {soul.description || 'No description'}
              </p>

              <div className="text-xs text-gray-500 mb-3">
                <span className="font-mono">{soul.model?.split('/').pop() || 'default'}</span>
                <span className="mx-2">•</span>
                <span>Temp: {soul.temperature}</span>
              </div>

              <div className="flex gap-2 pt-3 border-t border-cyber-gray">
                <button 
                  onClick={() => setEditingSoul(soul)} 
                  className="cyber-button text-xs flex-1"
                >
                  ⚙️ Edit
                </button>
                <button 
                  onClick={() => handleDelete(soul.id)} 
                  className="cyber-button text-cyber-red border-cyber-red text-xs"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Simple Editor Modal */}
      {(showEditor || editingSoul) && (
        <SimpleSoulEditor
          soul={editingSoul}
          onSave={handleSave}
          onClose={() => { setShowEditor(false); setEditingSoul(null); }}
        />
      )}
    </div>
  );
}

function SimpleSoulEditor({ 
  soul, 
  onSave, 
  onClose 
}: { 
  soul?: AgentSoul | null; 
  onSave: (data: Partial<AgentSoul>) => Promise<void>;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: soul?.name || '',
    description: soul?.description || '',
    soul: soul?.soul || '',
    identity: soul?.identity || '',
    bible: soul?.bible || '',
    model: soul?.model || 'deepseek/deepseek-r1',
    temperature: soul?.temperature || 0.3
  });
  const [models, setModels] = useState<{id: string, name: string}[]>([]);
  const [modelFilter, setModelFilter] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch('/api/models');
        if (res.ok) {
          const data = await res.json();
          const modelList = Array.isArray(data) ? data : data.data || [];
          setModels(modelList);
        }
      } catch (err) {
        console.error('Failed to fetch models:', err);
      }
    }
    fetchModels();
  }, []);

  const filteredModels = modelFilter
    ? models.filter((m: any) =>
        (m.id || m).toLowerCase().includes(modelFilter.toLowerCase()) ||
        (m.name || '').toLowerCase().includes(modelFilter.toLowerCase())
      )
    : models;

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-cyber-dark border border-cyber-gray rounded-lg w-full max-w-3xl m-4">
        <div className="p-6 border-b border-cyber-gray">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold">
              {soul ? 'Edit Soul' : 'Create New Soul'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="cyber-input"
                placeholder="e.g., Crawlee Specialist"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Model</label>
              <input
                type="text"
                placeholder="Search models (e.g., qwen, kimi)..."
                className="cyber-input mb-2"
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
              />
              <select
                value={formData.model}
                onChange={(e) => updateField('model', e.target.value)}
                className="cyber-select"
                size={Math.min(filteredModels.length, 10) + 1}
              >
                <option value="">Use pool default</option>
                {filteredModels.map((m: any) => (
                  <option key={m.id || m} value={m.id || m}>
                    {(m.name || (m.id || m)).replace('/', ' / ')}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                {models.length} models available
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="cyber-input"
              placeholder="Brief description"
            />
          </div>

          <div>
            <label className="block text-sm text-cyber-cyan mb-1">SOUL - Core Personality</label>
            <textarea
              value={formData.soul}
              onChange={(e) => updateField('soul', e.target.value)}
              className="cyber-input h-24 font-mono text-sm"
              placeholder="Define the AI's core personality and values..."
            />
          </div>

          <div>
            <label className="block text-sm text-cyber-pink mb-1">IDENTITY - Who This Agent Is</label>
            <textarea
              value={formData.identity}
              onChange={(e) => updateField('identity', e.target.value)}
              className="cyber-input h-24 font-mono text-sm"
              placeholder="Name, role, expertise, background..."
            />
          </div>

          <div>
            <label className="block text-sm text-cyber-yellow mb-1">BIBLE - Rules and Guidelines</label>
            <textarea
              value={formData.bible}
              onChange={(e) => updateField('bible', e.target.value)}
              className="cyber-input h-32 font-mono text-sm"
              placeholder="Specific rules and best practices..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="cyber-button">Cancel</button>
            <button type="submit" disabled={loading} className="cyber-button-primary">
              {loading ? 'Saving...' : 'Save Soul'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}