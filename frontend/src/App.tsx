import React, { useState } from 'react';
import { useTasks } from './hooks/useTasks';
import { useAgents } from './hooks/useAgents';
import { useAnalytics } from './hooks/useAnalytics';
import { useSocket } from './hooks/useSocket';
import { KanbanBoard } from './components/KanbanBoard';
import { AgentPoolManager } from './components/AgentPool';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { GlitchText } from './components/GlitchText';

type Tab = 'kanban' | 'agents' | 'analytics' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('kanban');
  const { tasks, refreshTasks } = useTasks();
  const { pools, refreshPools } = useAgents();
  const { analytics } = useAnalytics();
  useSocket();

  const navItems = [
    { id: 'kanban', label: '📋 Kanban', icon: '📋' },
    { id: 'agents', label: '🤖 Agents', icon: '🤖' },
    { id: 'analytics', label: '📊 Analytics', icon: '📊' },
    { id: 'settings', label: '⚙️ Settings', icon: '⚙️' }
  ];

  return (
    <div className="min-h-screen bg-cyber-black flex">
      {/* Sidebar */}
      <aside className="w-64 bg-cyber-dark border-r border-cyber-gray flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-cyber-gray">
          <GlitchText 
            text="🦀 CLAW-TEMPLE" 
            className="text-2xl font-display font-bold text-gradient-pink"
          />
          <p className="text-xs text-gray-500 mt-1 font-mono">v0.0.0</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id as Tab)}
                  className={activeTab === item.id ? 'cyber-nav-item-active' : 'cyber-nav-item'}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Status */}
        <div className="p-4 border-t border-cyber-gray">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 bg-cyber-green rounded-full animate-pulse"></span>
            <span className="text-gray-400">System Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="h-16 bg-cyber-dark border-b border-cyber-gray flex items-center justify-between px-6">
          <h1 className="text-xl font-display font-semibold">
            {navItems.find(n => n.id === activeTab)?.label}
          </h1>
          
          <div className="flex items-center gap-4">
            {/* Quick Stats */}
            <div className="flex items-center gap-4 text-sm">
              <span className="cyber-badge-cyan">
                {tasks.filter(t => t.status === 'TODO').length} Queue
              </span>
              <span className="cyber-badge-green">
                {tasks.filter(t => t.status === 'DONE').length} Done
              </span>
            </div>

            {/* Refresh Button */}
            <button 
              onClick={() => {
                refreshTasks();
                refreshPools();
              }}
              className="cyber-button"
            >
              🔄 Refresh
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'kanban' && <KanbanBoard />}
          {activeTab === 'agents' && <AgentPoolManager />}
          {activeTab === 'analytics' && <Analytics data={analytics} />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
}