import React, { useState } from 'react';
import { AgentPool } from '../types';
import { useTasks } from '../hooks/useTasks';
import { api } from '../services/api';

interface TaskModalProps {
  onClose: () => void;
  pools: AgentPool[];
}

export function TaskModal({ onClose, pools }: TaskModalProps) {
  const { createTask } = useTasks();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    poolId: '',
    model: '',
    priority: 0,
    metadata: {
      targetUrl: '',
      library: 'puppeteer',
      crawlDepth: 3
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createTask({
        title: formData.title,
        description: formData.description,
        poolId: formData.poolId || undefined,
        model: formData.model || undefined,
        priority: formData.priority,
        metadata: formData.metadata
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-cyber-dark border border-cyber-gray rounded-lg w-full max-w-lg p-6">
        <h2 className="text-xl font-display font-bold mb-4">Create New Task</h2>

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

          {/* Model Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Model (OpenRouter)</label>
            <select
              value={formData.model}
              onChange={(e) => handleChange('model', e.target.value)}
              className="cyber-select"
            >
              <option value="">Default for pool</option>
              <option value="openrouter/auto">Auto (Best)</option>
              <option value="deepseek/deepseek-chat">DeepSeek Chat</option>
              <option value="moonshotai/kimi-k2.5">Kimi K2.5</option>
              <option value="google/gemini-3-flash-preview">Gemini 3 Flash</option>
              <option value="xiaomi/mimo-v2-flash">Xiaomi Mimo Flash</option>
            </select>
          </div>

          {/* Crawler-specific fields */}
          <div className="border-t border-cyber-gray pt-4">
            <h3 className="text-sm font-semibold text-cyber-cyan mb-3">Web Crawler Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Target URL</label>
                <input
                  type="text"
                  value={formData.metadata.targetUrl}
                  onChange={(e) => handleChange('metadata', { ...formData.metadata, targetUrl: e.target.value })}
                  className="cyber-input"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Library</label>
                <select
                  value={formData.metadata.library}
                  onChange={(e) => handleChange('metadata', { ...formData.metadata, library: e.target.value })}
                  className="cyber-select"
                >
                  <option value="puppeteer">Puppeteer</option>
                  <option value="playwright">Playwright</option>
                  <option value="cheerio">Cheerio</option>
                  <option value="http">HTTP + Cheerio</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm text-gray-400 mb-1">Crawl Depth</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.metadata.crawlDepth}
                onChange={(e) => handleChange('metadata', { ...formData.metadata, crawlDepth: parseInt(e.target.value) })}
                className="cyber-input w-24"
              />
            </div>
          </div>

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
              disabled={loading}
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