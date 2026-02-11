import React, { useState, useEffect } from 'react';
import { useAgents } from '../hooks/useAgents';
import { AgentPool } from '../types';
import { GlitchText } from './GlitchText';
import { api } from '../services/api';

interface OpenRouterModel {
  id: string;
  name: string;
  pricing: { prompt: number; completion: number };
}

export function AgentPoolManager() {
  const { pools, createPool, updatePool, pausePool, resumePool, deletePool } = useAgents();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPool, setEditingPool] = useState<AgentPool | null>(null);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await api.getModels();
        setModels(response);
      } catch (err) {
        console.error('Failed to fetch models:', err);
      } finally {
        setLoadingModels(false);
      }
    }
    fetchModels();
  }, []);

  const getStatusInfo = (pool: AgentPool) => {
    if (pool.isPaused) {
      return { color: 'text-gray-500', dot: 'bg-gray-500', text: 'Paused' };
    }
    const activeCount = (pool as any).activeCount || 0;
    if (activeCount >= pool.maxParallel) {
      return { color: 'text-cyber-yellow', dot: 'bg-cyber-yellow animate-pulse', text: `${activeCount}/${pool.maxParallel}` };
    }
    return { color: 'text-cyber-green', dot: 'bg-cyber-green', text: `${activeCount}/${pool.maxParallel}` };
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <GlitchText text="🤖 Agent Pools" className="text-2xl font-display font-bold" />
          <p className="text-gray-400 text-sm mt-1">Manage your agent workforce</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="cyber-button-primary">
          + New Pool
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="cyber-stat-card">
          <div className="cyber-stat-value">{pools.length}</div>
          <div className="cyber-stat-label">Total Pools</div>
        </div>
        <div className="cyber-stat-card">
          <div className="cyber-stat-value text-cyber-green">{pools.filter(p => !p.isPaused).length}</div>
          <div className="cyber-stat-label">Active</div>
        </div>
        <div className="cyber-stat-card">
          <div className="cyber-stat-value text-cyber-pink">
            {pools.reduce((acc, p) => acc + ((p as any).activeCount || 0), 0)}
          </div>
          <div className="cyber-stat-label">Running Agents</div>
        </div>
        <div className="cyber-stat-card">
          <div className="cyber-stat-value text-cyber-cyan">
            {pools.reduce((acc, p) => acc + p.maxParallel, 0)}
          </div>
          <div className="cyber-stat-label">Total Capacity</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {pools.map(pool => {
          const status = getStatusInfo(pool);
          return (
            <div key={pool.id} className="cyber-card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{pool.icon}</span>
                  <div>
                    <h3 className="font-semibold">{pool.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">{pool.id.slice(0, 8)}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 ${status.color}`}>
                  <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                  <span className="text-xs">{status.text}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Default Model</span>
                  <span className="font-mono text-cyber-cyan text-xs max-w-[150px] truncate">
                    {pool.defaultModel?.split('/').pop() || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Auto-accept</span>
                  <span>{pool.autoAccept ? '✅' : '❌'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Timeout</span>
                  <span>{pool.timeoutMinutes}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Notifications</span>
                  <span className="text-xs">{pool.notificationMode}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-cyber-gray">
                <button onClick={() => setEditingPool(pool)} className="cyber-button text-xs flex-1">⚙️ Edit</button>
                {pool.isPaused ? (
                  <button onClick={() => resumePool(pool.id)} className="cyber-button-secondary text-xs flex-1">▶️ Resume</button>
                ) : (
                  <button onClick={() => pausePool(pool.id)} className="cyber-button text-xs flex-1">⏸️ Pause</button>
                )}
                <button onClick={() => deletePool(pool.id)} className="cyber-button text-cyber-red border-cyber-red hover:bg-cyber-red/20 text-xs">🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {(showCreateModal || editingPool) && (
        <PoolModal
          pool={editingPool}
          models={models}
          loadingModels={loadingModels}
          onClose={() => { setShowCreateModal(false); setEditingPool(null); }}
          onSave={async (data) => {
            if (editingPool) await updatePool(editingPool.id, data);
            else await createPool(data);
            setShowCreateModal(false);
            setEditingPool(null);
          }}
        />
      )}
    </div>
  );
}

function PoolModal({ pool, models, loadingModels, onClose, onSave }: { 
  pool: AgentPool | null; 
  models: OpenRouterModel[];
  loadingModels: boolean;
  onClose: () => void;
  onSave: (data: Partial<AgentPool>) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    name: pool?.name || '',
    icon: pool?.icon || '🤖',
    defaultModel: pool?.defaultModel || '',
    maxParallel: pool?.maxParallel || 3,
    autoAccept: pool?.autoAccept || false,
    timeoutMinutes: pool?.timeoutMinutes || 60,
    retryCount: pool?.retryCount || 2,
    notificationMode: pool?.notificationMode || 'both' as const
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-cyber-dark border border-cyber-gray rounded-lg w-full max-w-md p-6">
        <h2 className="text-xl font-display font-bold mb-4">{pool ? 'Edit Pool' : 'Create Pool'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="cyber-input" placeholder="e.g., Web Crawler" required />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Icon (emoji)</label>
            <input type="text" value={formData.icon} onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
              className="cyber-input w-20" placeholder="🤖" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Default Model {loadingModels ? '(Loading...)' : `(${models.length} available)`}
            </label>
            <select value={formData.defaultModel} onChange={(e) => setFormData(prev => ({ ...prev, defaultModel: e.target.value }))}
              className="cyber-select" disabled={loadingModels}>
              <option value="">Not set (let task decide)</option>
              <option value="openrouter/auto">🔮 Auto Router (best for task)</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Parallel</label>
            <input type="number" min="1" max="10" value={formData.maxParallel}
              onChange={(e) => setFormData(prev => ({ ...prev, maxParallel: parseInt(e.target.value) }))}
              className="cyber-input w-24" />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.autoAccept}
                onChange={(e) => setFormData(prev => ({ ...prev, autoAccept: e.target.checked }))}
                className="rounded border-cyber-gray" />
              <span className="text-sm text-gray-400">Auto-accept tasks</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="cyber-button">Cancel</button>
            <button type="submit" className="cyber-button-primary">{pool ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}