import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTasks } from '../hooks/useTasks';
import { useAgents } from '../hooks/useAgents';
import { Task, TaskStatus } from '../types';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'TODO', title: 'To Do', color: 'border-gray-500' },
  { id: 'RESEARCH', title: 'Research', color: 'border-cyber-purple' },
  { id: 'DEV', title: 'Development', color: 'border-cyber-cyan' },
  { id: 'QA', title: 'Quality Assurance', color: 'border-cyber-yellow' },
  { id: 'DONE', title: 'Done', color: 'border-cyber-green' }
];

export function KanbanBoard() {
  const { tasks, moveTask, loading } = useTasks();
  const { pools } = useAgents();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const getTasksByColumn = (columnId: TaskStatus) => {
    return tasks.filter(task => task.status === columnId);
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
        <button 
          onClick={() => setShowCreateModal(true)}
          className="cyber-button-primary"
        >
          + New Task
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(column => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`cyber-column min-w-[280px] flex-1 ${
                    snapshot.isDraggingOver ? 'border-cyber-pink bg-cyber-gray/80' : ''
                  }`}
                >
                  <div className={`cyber-column-header border-l-4 pl-3 ${column.color}`}>
                    <h3 className="font-display font-semibold">{column.title}</h3>
                    <span className="cyber-badge-gray">
                      {getTasksByColumn(column.id).length}
                    </span>
                  </div>

                  <div className="space-y-3 mt-3">
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
        />
      )}
    </>
  );
}