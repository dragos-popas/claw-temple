import React, { useState } from 'react';
import { GlitchText } from './GlitchText';
import { api } from '../services/api';

interface AgentSoul {
  id?: string;
  name: string;
  description: string;
  role: string;
  soul: string;
  identity: string;
  bible: string;
  expertise: string[];
  model: string;
  temperature: number;
}

interface SoulEditorProps {
  soul?: AgentSoul;
  onSave: (soul: AgentSoul) => Promise<void>;
  onClose: () => void;
}

export function SoulEditor({ soul, onSave, onClose }: SoulEditorProps) {
  const [formData, setFormData] = useState<AgentSoul>(soul || {
    name: '',
    description: '',
    role: '',
    soul: '',
    identity: '',
    bible: '',
    expertise: [],
    model: '',
    temperature: 0.7
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
            <GlitchText text={soul ? 'Edit Soul' : 'Create New Soul'} className="text-xl font-display font-bold" />
            <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <p className="text-gray-400 text-sm mt-1">Define AI persona with SOUL, IDENTITY, and BIBLE</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Soul Name *</label>
              <input type="text" value={formData.name} onChange={(e) => updateField('name', e.target.value)}
                className="cyber-input" placeholder="e.g., Crawlee Specialist" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Role *</label>
              <input type="text" value={formData.role} onChange={(e) => updateField('role', e.target.value)}
                className="cyber-input" placeholder="e.g., Web Scraping Expert" required />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <input type="text" value={formData.description} onChange={(e) => updateField('description', e.target.value)}
              className="cyber-input" placeholder="Brief description of this agent's purpose" />
          </div>

          {/* SOUL - Core Personality */}
          <div className="border border-cyber-cyan/30 rounded-lg p-4 bg-cyber-cyan/5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-cyber-cyan">🧠</span>
              <h3 className="font-semibold text-cyber-cyan">SOUL - Core Personality</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">The fundamental personality and values. How the AI thinks and approaches problems.</p>
            <textarea value={formData.soul} onChange={(e) => updateField('soul', e.target.value)}
              className="cyber-input h-32 font-mono text-sm"
              placeholder="You are a meticulous web scraping specialist. You value accuracy, efficiency, and ethical data collection. You always verify your selectors before extraction and handle errors gracefully. You prefer clean, maintainable code over quick hacks." />
          </div>

          {/* IDENTITY - Who This Agent Is */}
          <div className="border border-cyber-pink/30 rounded-lg p-4 bg-cyber-pink/5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-cyber-pink">🎭</span>
              <h3 className="font-semibold text-cyber-pink">IDENTITY - Who This Agent Is</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">Name, role, expertise areas, and background.</p>
            <textarea value={formData.identity} onChange={(e) => updateField('identity', e.target.value)}
              className="cyber-input h-32 font-mono text-sm"
              placeholder="Name: Crawler Queen | Role: Web Scraping Specialist | Expertise: Dynamic content, anti-detection, data validation | Background: 10 years of building web scrapers" />
          </div>

          {/* BIBLE - Rules and Guidelines */}
          <div className="border border-cyber-yellow/30 rounded-lg p-4 bg-cyber-yellow/5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-cyber-yellow">📜</span>
              <h3 className="font-semibold text-cyber-yellow">BIBLE - Rules and Guidelines</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">Specific rules, best practices, and constraints for this agent.</p>
            <textarea value={formData.bible} onChange={(e) => updateField('bible', e.target.value)}
              className="cyber-input h-40 font-mono text-sm"
              placeholder="1. Always use Cheerio/JSDOM for static content extraction
2. Use Puppeteer/Playwright for JavaScript-rendered pages
3. Implement exponential backoff on rate limits
4. Respect robots.txt unless explicitly authorized
5. Always validate extracted data before returning
6. Log all scraping activities for debugging" />
          </div>

          {/* Model & Temperature */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Model</label>
              <input
                type="text"
                placeholder="Search models (e.g., qwen, kimi)..."
                className="cyber-input mb-2"
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
              />
              <select value={formData.model} onChange={(e) => updateField('model', e.target.value)}
                className="cyber-select" size={Math.min(filteredModels.length, 10) + 1}>
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
            <div>
              <label className="block text-sm text-gray-400 mb-1">Temperature: {formData.temperature}</label>
              <input type="range" min="0" max="1" step="0.1" value={formData.temperature}
                onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
                className="w-full accent-cyber-cyan" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-cyber-gray">
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