import React from 'react';
import { Task, AgentPool } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface TaskCardProps {
  task: Task;
  pool?: AgentPool;
  isDragging?: boolean;
  onClick?: () => void;
}

export function TaskCard({ task, pool, isDragging, onClick }: TaskCardProps) {
  const statusColors: Record<string, string> = {
    TODO: 'bg-gray-500',
    RESEARCH: 'bg-cyber-purple',
    DEV: 'bg-cyber-cyan',
    QA: 'bg-cyber-yellow',
    DONE: 'bg-cyber-green'
  };

  return (
    <div 
      className={`cyber-task-card cursor-pointer hover:border-cyber-cyan transition-all ${isDragging ? 'shadow-neon-pink scale-105' : ''}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColors[task.status]}`} />
          <span className="text-xs text-gray-500 font-mono">
            {task.id.slice(0, 8)}
          </span>
        </div>
        {task.priority > 0 && (
          <span className="text-xs text-cyber-pink">⚡ Priority</span>
        )}
      </div>

      {/* Title */}
      <h4 className="font-semibold text-sm mb-2 line-clamp-2">{task.title}</h4>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-400 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        {/* Pool/Agent */}
        <div className="flex items-center gap-1">
          {pool ? (
            <>
              <span>{pool.icon}</span>
              <span className="text-gray-400">{pool.name}</span>
            </>
          ) : (
            <span className="text-gray-500">Unassigned</span>
          )}
        </div>

        {/* Model */}
        {task.model && (
          <span className="text-cyber-cyan font-mono">
            {task.model.split('/')[1] || task.model}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-cyber-gray/50 text-xs text-gray-500">
        <span>
          {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
        </span>
        {task.actualCost && (
          <span className="text-cyber-green">
            ${task.actualCost.toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
}