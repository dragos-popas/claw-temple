import React, { useState } from 'react';
import { useTasks } from './hooks/useTasks';
import { useAgents } from './hooks/useAgents';
import { useAnalytics } from './hooks/useAnalytics';
import { useSocket } from './hooks/useSocket';
import { KanbanBoard } from './components/KanbanBoard';
import { AgentPoolManager } from './components/AgentPool';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { SoulManager } from './components/SoulManager';
import { GlitchText } from './components/GlitchText';

type Tab = 'kanban' | 'agents' | 'souls' | 'analytics' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('kanban');
  const { tasks, refreshTasks } = useTasks();
  const { pools, refreshPools } = useAgents();
  const { analytics } = useAnalytics();
  useSocket();

  const navItems = [
    { id: 'kanban', label: '📋 Kanban', icon: '📋' },
    { id: 'agents', label: '🤖 Agents', icon: '🤖' },
    { id: 'souls', label: '🧠 Souls', icon: '🧠' },
    { id: 'analytics', label: '📊 Analytics', icon: '📊' },
    { id: 'settings', label: '⚙️ Settings', icon: '⚙️' }
  ];

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cyber-black flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 
        bg-cyber-dark border-r border-cyber-gray flex flex-col shrink-0
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-cyber-gray flex items-center justify-between">
          <div>
            <GlitchText 
              text="🦀 CLAW-TEMPLE" 
              className="text-2xl font-display font-bold"
            />
            <p className="text-xs text-gray-500 mt-1 font-mono">v0.0.1</p>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setActiveTab(item.id as Tab);
                    setSidebarOpen(false); // Close sidebar on mobile after selection
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg 
                    transition-colors duration-200
                    ${activeTab === item.id 
                      ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30' 
                      : 'text-gray-300 hover:bg-cyber-gray/20 hover:text-white'
                    }
                  `}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
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
      <main className="flex-1 overflow-auto min-h-screen">
        {/* Header - Mobile */}
        <header className="h-16 bg-cyber-dark border-b border-cyber-gray flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-cyber-gray/20 rounded-lg"
            >
              ☰
            </button>
            
            <h1 className="text-lg lg:text-xl font-display font-semibold">
              {navItems.find(n => n.id === activeTab)?.label}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Quick Stats - Stacked on mobile */}
            <div className="hidden sm:flex items-center gap-2 lg:gap-4 text-xs lg:text-sm">
              <span className="cyber-badge-cyan text-xs lg:text-sm">
                {tasks.filter(t => t.status === 'TODO').length} Queue
              </span>
              <span className="cyber-badge-green text-xs lg:text-sm">
                {tasks.filter(t => t.status === 'DONE').length} Done
              </span>
            </div>

            {/* Stats for mobile (icon only) */}
            <div className="sm:hidden flex items-center gap-2">
              <span className="text-cyber-cyan text-sm font-bold">
                {tasks.filter(t => t.status === 'TODO').length}
              </span>
              <span className="text-cyber-green text-sm font-bold">
                {tasks.filter(t => t.status === 'DONE').length}
              </span>
            </div>

            {/* Refresh Button */}
            <button 
              onClick={() => {
                refreshTasks();
                refreshPools();
              }}
              className="cyber-button text-sm px-3 py-2"
            >
              🔄
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-3 lg:p-6">
          {activeTab === 'kanban' && <KanbanBoard />}
          {activeTab === 'agents' && <AgentPoolManager />}
          {activeTab === 'souls' && <SoulManager />}
          {activeTab === 'analytics' && <Analytics data={analytics} />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
}