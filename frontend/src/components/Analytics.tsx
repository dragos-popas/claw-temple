import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { useAnalytics } from '../hooks/useAnalytics';

const COLORS = ['#FF0055', '#00F0FF', '#FCEE0A', '#B829E6', '#00FF66'];

export function Analytics({ data }: { data: ReturnType<typeof useAnalytics>['analytics'] }) {
  const { loading } = useAnalytics();

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cyber-cyan animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold">📊 Analytics Dashboard</h2>
        <p className="text-gray-400 text-sm">Track your agent productivity and spending</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="cyber-stat-card">
          <div className="cyber-stat-value text-cyber-pink">
            ${data.spend.total.toFixed(4)}
          </div>
          <div className="cyber-stat-label">Total Spend</div>
        </div>
        <div className="cyber-stat-card">
          <div className="cyber-stat-value text-cyber-green">
            {data.productivity.tasksCompleted}
          </div>
          <div className="cyber-stat-label">Tasks Completed</div>
        </div>
        <div className="cyber-stat-card">
          <div className="cyber-stat-value text-cyber-cyan">
            {data.productivity.avgCycleTimeMinutes.toFixed(1)}m
          </div>
          <div className="cyber-stat-label">Avg Cycle Time</div>
        </div>
        <div className="cyber-stat-card">
          <div className="cyber-stat-value text-cyber-yellow">
            {data.queue.TODO + data.queue.RESEARCH + data.queue.DEV + data.queue.QA}
          </div>
          <div className="cyber-stat-label">In Progress</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Spend Chart */}
        <div className="cyber-card">
          <h3 className="font-semibold mb-4">Daily Spend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.spend.daily.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280" 
                fontSize={12}
                tickFormatter={(value) => value.slice(5)}
              />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1A1A1A', 
                  border: '1px solid #2A2A2A',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="amount" fill="#FF0055" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Model Usage */}
        <div className="cyber-card">
          <h3 className="font-semibold mb-4">Model Usage</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data.modelUsage}
                dataKey="cost"
                nameKey="model"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ model }) => model.split('/')[1]}
              >
                {data.modelUsage.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1A1A1A', 
                  border: '1px solid #2A2A2A',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Queue Status */}
        <div className="cyber-card">
          <h3 className="font-semibold mb-4">Queue Status</h3>
          <div className="space-y-3">
            {[
              { label: 'TODO', count: data.queue.TODO, color: 'bg-gray-500' },
              { label: 'Research', count: data.queue.RESEARCH, color: 'bg-cyber-purple' },
              { label: 'Dev', count: data.queue.DEV, color: 'bg-cyber-cyan' },
              { label: 'QA', count: data.queue.QA, color: 'bg-cyber-yellow' },
              { label: 'Done', count: data.queue.DONE, color: 'bg-cyber-green' }
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-sm text-gray-400 w-20">{item.label}</span>
                <div className="flex-1 h-2 bg-cyber-gray rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} transition-all duration-500`}
                    style={{ 
                      width: `${Math.min(100, (item.count / Math.max(1, data.queue.DONE)) * 100)}%` 
                    }}
                  />
                </div>
                <span className="text-sm font-mono">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="cyber-card">
          <h3 className="font-semibold mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-cyber-gray/50 rounded">
              <div className="text-2xl font-bold text-cyber-pink">
                {data.modelUsage.length}
              </div>
              <div className="text-xs text-gray-400">Models Used</div>
            </div>
            <div className="text-center p-3 bg-cyber-gray/50 rounded">
              <div className="text-2xl font-bold text-cyber-cyan">
                {data.spend.daily.length}
              </div>
              <div className="text-xs text-gray-400">Active Days</div>
            </div>
            <div className="text-center p-3 bg-cyber-gray/50 rounded">
              <div className="text-2xl font-bold text-cyber-green">
                {data.productivity.tasksCompleted > 0 ? 
                  (data.productivity.avgCycleTimeMinutes / 60).toFixed(1) : '0'
                }h
              </div>
              <div className="text-xs text-gray-400">Avg Completion</div>
            </div>
            <div className="text-center p-3 bg-cyber-gray/50 rounded">
              <div className="text-2xl font-bold text-cyber-yellow">
                {data.queue.TODO + data.queue.RESEARCH + data.queue.DEV + data.queue.QA > 0 ? 
                  ((data.productivity.tasksCompleted / 
                    (data.spend.daily.length || 1)).toFixed(1)) : '0'
                }
              </div>
              <div className="text-xs text-gray-400">Tasks/Day Avg</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}