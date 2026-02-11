import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { requestNotificationPermission } from '../hooks/useSocket';

export function Settings() {
  const [config, setConfig] = useState({
    defaultRepo: 'https://github.com/dragos-popas/location-scrapers',
    columnLimits: {
      TODO: 100,
      RESEARCH: 2,
      DEV: 3,
      QA: 2,
      DONE: 100
    },
    notificationSettings: {
      browser: true,
      telegram: true
    },
    theme: 'dark'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await api.getConfig();
      setConfig(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.error('Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateConfig('settings', config);
      alert('Settings saved!');
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationRequest = () => {
    requestNotificationPermission();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cyber-cyan animate-pulse">Loading settings...</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-display font-bold mb-6">⚙️ Settings</h2>

      <div className="space-y-6 max-w-2xl">
        {/* Default Repository */}
        <div className="cyber-card">
          <h3 className="font-semibold mb-4">🎯 Default Repository</h3>
          <input
            type="text"
            value={config.defaultRepo}
            onChange={(e) => setConfig(prev => ({ ...prev, defaultRepo: e.target.value }))}
            className="cyber-input"
            placeholder="https://github.com/..."
          />
          <p className="text-xs text-gray-500 mt-2">
            This repo will be pre-filled when creating new tasks
          </p>
        </div>

        {/* Column Limits */}
        <div className="cyber-card">
          <h3 className="font-semibold mb-4">📋 Column Limits</h3>
          <p className="text-xs text-gray-500 mb-4">
            Maximum tasks that can be in each column (0 = unlimited)
          </p>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(config.columnLimits).map(([column, limit]) => (
              <div key={column} className="flex items-center gap-3">
                <label className="w-24 text-sm text-gray-400">
                  {column === 'TODO' ? 'To Do' : 
                   column === 'RESEARCH' ? 'Research' : 
                   column === 'DEV' ? 'Dev' : 
                   column === 'QA' ? 'QA' : 'Done'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={limit}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    columnLimits: {
                      ...prev.columnLimits,
                      [column]: parseInt(e.target.value)
                    }
                  }))}
                  className="cyber-input w-24"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="cyber-card">
          <h3 className="font-semibold mb-4">🔔 Notifications</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.notificationSettings.browser}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  notificationSettings: {
                    ...prev.notificationSettings,
                    browser: e.target.checked
                  }
                }))}
                className="rounded border-cyber-gray w-5 h-5"
              />
              <div>
                <span className="text-sm font-medium">Browser Notifications</span>
                <p className="text-xs text-gray-500">
                  Show desktop notifications for task updates
                </p>
              </div>
              {config.notificationSettings.browser && (
                <button
                  type="button"
                  onClick={handleNotificationRequest}
                  className="cyber-button text-xs ml-auto"
                >
                  Enable Permission
                </button>
              )}
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.notificationSettings.telegram}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  notificationSettings: {
                    ...prev.notificationSettings,
                    telegram: e.target.checked
                  }
                }))}
                className="rounded border-cyber-gray w-5 h-5"
              />
              <div>
                <span className="text-sm font-medium">Telegram Notifications</span>
                <p className="text-xs text-gray-500">
                  Send task updates to your Telegram via OpenClaw
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Theme */}
        <div className="cyber-card">
          <h3 className="font-semibold mb-4">🎨 Theme</h3>
          <div className="flex gap-4">
            <button
              onClick={() => setConfig(prev => ({ ...prev, theme: 'dark' }))}
              className={`flex-1 p-4 rounded border ${
                config.theme === 'dark' 
                  ? 'border-cyber-pink bg-cyber-gray/50' 
                  : 'border-cyber-gray'
              }`}
            >
              <div className="w-full h-12 bg-cyber-black rounded mb-2" />
              <span className="text-sm">Dark (Cyberpunk)</span>
            </button>
            <button
              onClick={() => setConfig(prev => ({ ...prev, theme: 'light' }))}
              className={`flex-1 p-4 rounded border ${
                config.theme === 'light' 
                  ? 'border-cyber-pink bg-cyber-gray/50' 
                  : 'border-cyber-gray'
              }`}
            >
              <div className="w-full h-12 bg-gray-100 rounded mb-2" />
              <span className="text-sm">Light</span>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={loadConfig}
            className="cyber-button"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="cyber-button-primary"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Debug Info */}
        <div className="cyber-card">
          <h3 className="font-semibold mb-4">🔧 Debug</h3>
          <div className="text-xs font-mono text-gray-400">
            <p>Version: 0.0.0</p>
            <p>Environment: {import.meta.env.MODE}</p>
            <p>API URL: {import.meta.env.VITE_API_URL || '/api'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}