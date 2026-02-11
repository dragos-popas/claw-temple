import React, { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTasks } from '../hooks/useTasks';
import { useAgents } from '../hooks/useAgents';
import { Task, TaskStatus } from '../types';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { TaskDetail } from './TaskDetail';

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'TODO', title: 'To Do', color: 'border-gray-500' },
  { id: 'RESEARCH', title: 'Research', color: 'border-cyber-purple' },
  { id: 'DEV', title: 'Development', color: 'border-cyber-cyan' },
  { id: 'QA', title: 'Quality Assurance', color: 'border-cyber-yellow' },
  { id: 'DONE', title: 'Done', color: 'border-cyber-green' }
];

export function KanbanBoard() {
  const { tasks, moveTask, updateTask, loading } = useTasks();
  const { pools } = useAgents();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [taskType, setTaskType] = useState<'scraping' | 'general'>('scraping');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getTasksByColumn = (columnId: TaskStatus) => {
    return tasks.filter(task => task.status === columnId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateTask = (type: 'scraping' | 'general') => {
    setTaskType(type);
    setShowDropdown(false);
    setShowCreateModal(true);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as TaskStatus;

    moveTask(draggableId, newStatus);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cyber-cyan animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-display font-semibold">Task Board</h2>
          <span className="text-sm text-gray-400">{tasks.length} tasks</span>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="cyber-button-primary flex items-center gap-2"
          >
            + New
            <svg className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-cyber-dark border border-cyber-gray rounded-lg shadow-xl z-50 overflow-hidden">
              <button
                onClick={() => handleCreateTask('scraping')}
                className="w-full text-left px-4 py-3 hover:bg-cyber-gray/50 flex items-center gap-3 transition-colors"
              >
                <span className="text-xl">🕷️</span>
                <div>
                  <div className="font-semibold text-sm">Scraping Task</div>
                  <div className="text-xs text-gray-400">Web crawler / scraper</div>
                </div>
              </button>
              <div className="border-t border-cyber-gray/50"></div>
              <button
                onClick={() => handleCreateTask('general')}
                className="w-full text-left px-4 py-3 hover:bg-cyber-gray/50 flex items-center gap-3 transition-colors"
              >
                <span className="text-xl">⚡</span>
                <div>
                  <div className="font-semibold text-sm">General Task</div>
                  <div className="text-xs text-gray-400">Programming / coding</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3 lg:gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(column => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`cyber-column min-w-[220px] sm:min-w-[280px] flex-1 ${
                    snapshot.isDraggingOver ? 'border-cyber-pink bg-cyber-gray/80' : ''
                  }`}
                >
                  <div className={`cyber-column-header border-l-4 pl-3 ${column.color}`}>
                    <h3 className="font-display font-semibold text-sm sm:text-base">{column.title}</h3>
                    <span className="cyber-badge-gray text-xs">
                      {getTasksByColumn(column.id).length}
                    </span>
                  </div>

                  <div className="space-y-2 sm:space-y-3 mt-2 sm:mt-3">
                    {getTasksByColumn(column.id).map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={provided.draggableProps.style}
                          >
                            <TaskCard 
                              task={task} 
                              pool={pools.find(p => p.id === task.poolId)}
                              isDragging={snapshot.isDragging}
                              onClick={() => setSelectedTask(task)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {showCreateModal && (
        <TaskModal 
          onClose={() => setShowCreateModal(false)}
          pools={pools}
          taskType={taskType}
        />
      )}

      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          pool={pools.find(p => p.id === selectedTask.poolId)}
          onClose={() => setSelectedTask(null)}
          onUpdate={(taskId, updates) => {
            updateTask(taskId, updates);
            setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
          }}
        />
      )}
    </>
  );
}