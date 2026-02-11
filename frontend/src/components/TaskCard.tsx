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
      className={`
        cyber-task-card cursor-pointer hover:border-cyber-cyan transition-all 
        ${isDragging ? 'shadow-neon-pink scale-105' : ''}
        touch-manipulation active:scale-98
      `}
      onClick={onClick}
    >
      {/* Header - Compact on mobile */}
      <div className="flex items-start justify-between mb-1 sm:mb-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${statusColors[task.status]}`} />
          <span className="text-[10px] sm:text-xs text-gray-500 font-mono hidden sm:inline">
            {task.id.slice(0, 8)}
          </span>
        </div>
        {task.priority > 0 && (
          <span className="text-[10px] sm:text-xs text-cyber-pink">⚡</span>
        )}
      </div>

      {/* Title - More compact on mobile */}
      <h4 className="font-semibold text-xs sm:text-sm mb-1 sm:mb-2 line-clamp-2">{task.title}</h4>

      {/* Description - Hide on very small screens */}
      {task.description && (
        <p className="text-[10px] sm:text-xs text-gray-400 mb-2 sm:mb-3 line-clamp-2 hidden sm:block">
          {task.description}
        </p>
      )}

      {/* Footer - Compact */}
      <div className="flex items-center justify-between text-[10px] sm:text-xs">
        {/* Pool/Agent - Compact */}
        <div className="flex items-center gap-1 truncate">
          {pool ? (
            <>
              <span className="text-sm sm:text-base">{pool.icon}</span>
              <span className="text-gray-400 hidden sm:inline truncate max-w-[80px]">{pool.name}</span>
            </>
          ) : (
            <span className="text-gray-500 text-[10px]">Unassigned</span>
          )}
        </div>

        {/* Model - Hide on mobile if too long */}
        {task.model && (
          <span className="text-cyber-cyan font-mono hidden sm:inline">
            {task.model.split('/')[1] || task.model}
          </span>
        )}
      </div>

      {/* Meta - Compact on mobile */}
      <div className="flex items-center justify-between mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-cyber-gray/50 text-[10px] sm:text-xs text-gray-500">
        <span className="truncate">
          {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
        </span>
        {task.actualCost && (
          <span className="text-cyber-green ml-2">
            ${task.actualCost.toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
}