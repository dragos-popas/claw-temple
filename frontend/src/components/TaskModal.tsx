import React, { useState, useEffect } from 'react';
import { AgentPool } from '../types';
import { useTasks } from '../hooks/useTasks';
import { api } from '../services/api';

interface TaskModalProps {
  onClose: () => void;
  pools: AgentPool[];
  taskType: 'scraping' | 'general';
}

interface OpenRouterModel {
  id: string;
  name: string;
  pricing: { prompt: number; completion: number };
}

export function TaskModal({ onClose, pools, taskType }: TaskModalProps) {
  const { createTask } = useTasks();
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [modelFilter, setModelFilter] = useState('');
  const [loadingModels, setLoadingModels] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    poolId: '',
    model: '',
    priority: 0,
    language: 'typescript',
    metadata: {
      targetUrl: '',
      framework: 'crawlee',
      outputFormat: 'json',
      maxRequests: 100,
      maxConcurrency: 10,
      maxRetries: 3,
      maxDevCycles: 5
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch models from real OpenRouter API
  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await api.getModels();
        // Handle both array format and {data: [...]} format
        const modelList = Array.isArray(response) ? response : response.data || [];
        setModels(modelList);
      } catch (err) {
        console.error('Failed to fetch models:', err);
      } finally {
        setLoadingModels(false);
      }
    }
    fetchModels();
  }, []);

  // Filter models based on search
  const filteredModels = modelFilter
    ? models.filter(m =>
        (m.id || '').toLowerCase().includes(modelFilter.toLowerCase()) ||
        (m.name || '').toLowerCase().includes(modelFilter.toLowerCase())
      )
    : models;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const taskData: any = {
        title: formData.title,
        description: formData.description,
        poolId: formData.poolId || undefined,
        model: formData.model || undefined,
        priority: formData.priority,
        type: taskType
      };

      if (taskType === 'scraping') {
        taskData.metadata = {
          targetUrl: formData.metadata.targetUrl,
          framework: formData.metadata.framework,
          outputFormat: formData.metadata.outputFormat,
          maxRequests: formData.metadata.maxRequests,
          maxConcurrency: formData.metadata.maxConcurrency,
          maxRetries: formData.metadata.maxRetries,
          maxDevCycles: formData.metadata.maxDevCycles
        };
      } else {
        taskData.language = formData.language;
        taskData.metadata = {
          maxDevCycles: formData.metadata.maxDevCycles
        };
      }

      await createTask(taskData);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: unknown) => {
    if (field.startsWith('metadata.')) {
      const key = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        metadata: { ...prev.metadata, [key]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-start justify-center z-50 overflow-y-auto py-8">
      <div className="bg-cyber-dark border border-cyber-gray rounded-lg w-full max-w-2xl mx-4 p-6">
        <h2 className="text-xl font-display font-bold mb-4">
          Create {taskType === 'scraping' ? '🕷️ Scraping' : '⚡ General'} Task
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="cyber-input"
              placeholder="e.g., Scrape product prices from store.com"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="cyber-input h-24 resize-none"
              placeholder="Describe what needs to be done..."
            />
          </div>

          {/* Pool Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Agent Pool</label>
            <select
              value={formData.poolId}
              onChange={(e) => handleChange('poolId', e.target.value)}
              className="cyber-select"
            >
              <option value="">Auto-assign</option>
              {pools.map(pool => (
                <option key={pool.id} value={pool.id}>
                  {pool.icon} {pool.name}
                </option>
              ))}
            </select>
          </div>

          {/* Model Selection - WITH SEARCH */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Model {loadingModels ? '(Loading...)' : `(${models.length} available)`}
            </label>
            <input
              type="text"
              placeholder="Search models (e.g., qwen, kimi, deepseek)..."
              className="cyber-input mb-2"
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
            />
            <select
              value={formData.model}
              onChange={(e) => handleChange('model', e.target.value)}
              className="cyber-select"
              disabled={loadingModels}
              size={Math.min(filteredModels.length, 10) + 1}
            >
              <option value="">Default for pool</option>
              {filteredModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          {/* Task Type Specific Settings */}
          {taskType === 'scraping' ? (
            <div className="border-t border-cyber-gray pt-4">
              <h3 className="text-sm font-semibold text-cyber-cyan mb-3">🌐 Web Crawler Settings</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Target URL</label>
                  <input
                    type="text"
                    value={formData.metadata.targetUrl}
                    onChange={(e) => handleChange('metadata.targetUrl', e.target.value)}
                    className="cyber-input"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Framework</label>
                  <select
                    value={formData.metadata.framework}
                    onChange={(e) => handleChange('metadata.framework', e.target.value)}
                    className="cyber-select"
                  >
                    <option value="crawlee">🕷️ Crawlee (TypeScript)</option>
                    <option value="scrapy">🐍 Scrapy (Python)</option>
                    <option value="puppeteer">🎭 Puppeteer (Node.js)</option>
                    <option value="playwright">🎭 Playwright (Node.js)</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm text-gray-400 mb-1">Output Format</label>
                <select
                  value={formData.metadata.outputFormat}
                  onChange={(e) => handleChange('metadata.outputFormat', e.target.value)}
                  className="cyber-select"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="sqlite">SQLite</option>
                  <option value="mongodb">MongoDB</option>
                </select>
              </div>

              {/* Loop Limits */}
              <div className="mt-4 pt-4 border-t border-cyber-gray/50">
                <h4 className="text-sm font-semibold text-cyber-yellow mb-3">🔄 Loop Limits</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Max Requests</label>
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      value={formData.metadata.maxRequests}
                      onChange={(e) => handleChange('metadata.maxRequests', parseInt(e.target.value) || 0)}
                      className="cyber-input"
                      placeholder="0 = unlimited"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Max Concurrency</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.metadata.maxConcurrency}
                      onChange={(e) => handleChange('metadata.maxConcurrency', parseInt(e.target.value) || 10)}
                      className="cyber-input"
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Max Retries</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={formData.metadata.maxRetries}
                      onChange={(e) => handleChange('metadata.maxRetries', parseInt(e.target.value) || 3)}
                      className="cyber-input"
                      placeholder="3"
                    />
                  </div>
                </div>
              </div>

              {/* Dev Cycles */}
              <div className="mt-4 pt-4 border-t border-cyber-gray/50">
                <h4 className="text-sm font-semibold text-cyber-pink mb-3">🔄 Dev Cycles (Dev↔QA loops)</h4>
                <div className="flex items-center gap-4">
                  <div className="w-40">
                    <label className="block text-xs text-gray-400 mb-1">Max Cycles</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={formData.metadata.maxDevCycles}
                      onChange={(e) => handleChange('metadata.maxDevCycles', parseInt(e.target.value) || 0)}
                      className="cyber-input"
                      placeholder="5 = default"
                    />
                  </div>
                  <div className="text-xs text-gray-400">
                    <p>💡 <strong>0</strong> = unlimited cycles</p>
                    <p>After N cycles → auto-escalate to human</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t border-cyber-gray pt-4">
              <h3 className="text-sm font-semibold text-cyber-cyan mb-3">⚡ Programming Task Settings</h3>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Programming Language</label>
                <select
                  value={formData.language}
                  onChange={(e) => handleChange('language', e.target.value)}
                  className="cyber-select"
                >
                  <option value="typescript">📘 TypeScript</option>
                  <option value="python">🐍 Python</option>
                  <option value="javascript">📒 JavaScript</option>
                  <option value="go">🔵 Go</option>
                </select>
              </div>

              {/* Dev Cycles */}
              <div className="mt-4 pt-4 border-t border-cyber-gray/50">
                <h4 className="text-sm font-semibold text-cyber-pink mb-3">🔄 Dev Cycles (Dev↔QA loops)</h4>
                <div className="flex items-center gap-4">
                  <div className="w-40">
                    <label className="block text-xs text-gray-400 mb-1">Max Cycles</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={formData.metadata.maxDevCycles}
                      onChange={(e) => handleChange('metadata.maxDevCycles', parseInt(e.target.value) || 0)}
                      className="cyber-input"
                      placeholder="5 = default"
                    />
                  </div>
                  <div className="text-xs text-gray-400">
                    <p>💡 <strong>0</strong> = unlimited cycles</p>
                    <p>After N cycles → auto-escalate to human</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Priority */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="priority"
              checked={formData.priority > 0}
              onChange={(e) => handleChange('priority', e.target.checked ? 1 : 0)}
              className="rounded border-cyber-gray"
            />
            <label htmlFor="priority" className="text-sm text-gray-400">
              High Priority
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="text-cyber-red text-sm">{error}</div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="cyber-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || loadingModels}
              className="cyber-button-primary"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}