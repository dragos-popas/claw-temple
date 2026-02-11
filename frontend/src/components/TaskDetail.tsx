import React, { useState, useEffect } from 'react';
import { Task, AgentPool } from '../types';

interface TaskDetailProps {
  task: Task;
  pool?: AgentPool;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
}

interface TaskComment {
  id: string;
  taskId: string;
  agentName: string;
  content: string;
  createdAt: string;
  type: 'comment' | 'finding' | 'update' | 'tag';
  tags?: string[];
}

export function TaskDetail({ task, pool, onClose, onUpdate }: TaskDetailProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);

  // Load comments from localStorage or create mock ones
  useEffect(() => {
    const stored = localStorage.getItem(`task_${task.id}_comments`);
    if (stored) {
      setComments(JSON.parse(stored));
    } else {
      // Initial comment based on task status
      const initialComments: TaskComment[] = [
        {
          id: `init-${Date.now()}`,
          taskId: task.id,
          agentName: 'System',
          content: `Task created: ${task.description || 'No description'}`,
          createdAt: task.createdAt,
          type: 'update',
          tags: task.metadata?.framework ? [task.metadata.framework] : []
        }
      ];
      setComments(initialComments);
      localStorage.setItem(`task_${task.id}_comments`, JSON.stringify(initialComments));
    }
  }, [task]);

  const addComment = () => {
    if (!newComment.trim()) return;

    const comment: TaskComment = {
      id: `comment-${Date.now()}`,
      taskId: task.id,
      agentName: 'Current Agent',
      content: newComment,
      createdAt: new Date().toISOString(),
      type: 'comment'
    };

    const updated = [...comments, comment];
    setComments(updated);
    localStorage.setItem(`task_${task.id}_comments`, JSON.stringify(updated));
    setNewComment('');
  };

  const addFinding = (finding: string) => {
    const comment: TaskComment = {
      id: `finding-${Date.now()}`,
      taskId: task.id,
      agentName: 'Current Agent',
      content: finding,
      createdAt: new Date().toISOString(),
      type: 'finding',
      tags: ['finding']
    };

    const updated = [...comments, comment];
    setComments(updated);
    localStorage.setItem(`task_${task.id}_comments`, JSON.stringify(updated));
  };

  const handleStatusChange = (newStatus: string) => {
    onUpdate(task.id, { status: newStatus as any });
  };

  const handleSaveTitle = () => {
    onUpdate(task.id, { title: editedTitle });
    setEditing(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'finding': return '🔍';
      case 'update': return '📝';
      case 'tag': return '🏷️';
      default: return '💬';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="cyber-card mb-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="cyber-input text-xl font-display font-bold"
                    />
                    <button onClick={handleSaveTitle} className="cyber-button-primary">Save</button>
                    <button onClick={() => setEditing(false)} className="cyber-button">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-display font-bold">{task.title}</h2>
                    <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-white">✏️</button>
                  </div>
                )}
                
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  {/* Status Badge */}
                  <span className={`cyber-badge-${task.status === 'TODO' ? 'gray' : task.status === 'DONE' ? 'green' : task.status === 'DEV' ? 'cyan' : task.status === 'QA' ? 'yellow' : 'purple'}`}>
                    {task.status}
                  </span>
                  
                  {/* Assigned Soul/Agent */}
                  {task.soulId ? (
                    <span className="flex items-center gap-1 px-2 py-1 bg-cyber-pink/20 border border-cyber-pink/50 rounded text-cyber-pink text-sm">
                      <span>👤</span>
                      <span>{task.status === 'RESEARCH' ? '🕷️ Scarlett' : task.status === 'DEV' ? '💻 Scarlett' : '✅ QA Agent'}</span>
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-500/20 border border-gray-500/50 rounded text-gray-400 text-sm">
                      👤 Unassigned
                    </span>
                  )}
                  
                  {/* Model in use */}
                  {task.model && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-cyber-cyan/20 border border-cyber-cyan/50 rounded text-cyber-cyan text-sm">
                      <span>🤖</span>
                      <span>{(task.model.split('/')[1] || task.model).slice(0, 15)}</span>
                    </span>
                  )}
                  
                  {/* Cycle counter */}
                  {task.metadata?.maxDevCycles > 0 && (
                    <span className="px-2 py-1 bg-cyber-yellow/20 border border-cyber-yellow/50 rounded text-cyber-yellow text-sm">
                      🔄 Cycle {task.metadata?.currentCycle || 1}/{task.metadata?.maxDevCycles}
                    </span>
                  )}
                </div>

                <p className="text-gray-400 mt-3">{task.description}</p>
              </div>

              <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>

            {/* Metadata */}
            {task.metadata && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-cyber-gray">
                {task.metadata.framework && (
                  <div>
                    <label className="text-xs text-gray-500">Framework</label>
                    <p className="text-cyber-cyan">{task.metadata.framework === 'crawlee' ? '🕷️ Crawlee' : '🐍 Scrapy'}</p>
                  </div>
                )}
                {task.metadata.maxRequests !== undefined && (
                  <div>
                    <label className="text-xs text-gray-500">Max Requests</label>
                    <p className="text-cyber-yellow">{task.metadata.maxRequests === 0 ? '∞ Unlimited' : task.metadata.maxRequests}</p>
                  </div>
                )}
                {task.metadata.maxDevCycles !== undefined && (
                  <div>
                    <label className="text-xs text-gray-500">Max Cycles</label>
                    <p className="text-cyber-pink">{task.metadata.maxDevCycles === 0 ? '∞ Unlimited' : task.metadata.maxDevCycles}</p>
                  </div>
                )}
                {task.metadata.outputFormat && (
                  <div>
                    <label className="text-xs text-gray-500">Output Format</label>
                    <p className="text-white uppercase">{task.metadata.outputFormat}</p>
                  </div>
                )}
              </div>
            )}

            {/* Status Flow */}
            <div className="mt-4 pt-4 border-t border-cyber-gray">
              <label className="text-xs text-gray-500 mb-2 block">Move to:</label>
              <div className="flex flex-wrap gap-2">
                {['TODO', 'RESEARCH', 'DEV', 'QA', 'DONE'].map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={task.status === status}
                    className={`cyber-button ${task.status === status ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {status === 'TODO' && '📋 To Do'}
                    {status === 'RESEARCH' && '🔬 Research'}
                    {status === 'DEV' && '💻 Development'}
                    {status === 'QA' && '✅ QA'}
                    {status === 'DONE' && '🎉 Done'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Section */}
          <div className="cyber-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-semibold">💬 Activity & Findings</h3>
              <span className="text-sm text-gray-400">{comments.length} items</span>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-cyber-gray">
              <button 
                onClick={() => addFinding('Found selector for product name')}
                className="cyber-button text-xs"
              >
                🔍 Add Finding
              </button>
              <button 
                onClick={() => addFinding('Build successful')}
                className="cyber-button text-xs"
              >
                ✅ Build Passed
              </button>
              <button 
                onClick={() => addFinding('Template selected: cheerio-ts')}
                className="cyber-button text-xs"
              >
                🕷️ Template Selected
              </button>
              <button 
                onClick={() => addComment()}
                className="cyber-button text-xs"
              >
                🏷️ Add Tag/Note
              </button>
            </div>

            {/* Comments Feed */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3 p-3 bg-cyber-dark/50 rounded">
                  <span className="text-xl">{getTypeIcon(comment.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-cyber-cyan">{comment.agentName}</span>
                      <span className="text-gray-500 text-xs">{formatDate(comment.createdAt)}</span>
                      {comment.type === 'finding' && <span className="cyber-badge-yellow text-xs">Finding</span>}
                    </div>
                    <p className="text-gray-300 mt-1">{comment.content}</p>
                    {comment.tags && comment.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {comment.tags.map(tag => (
                          <span key={tag} className="cyber-badge-gray text-xs">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Comment */}
            <div className="mt-4 pt-4 border-t border-cyber-gray">
              <div className="flex gap-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="cyber-input flex-1 h-24 resize-none"
                  placeholder="Add a comment, finding, or note..."
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button 
                  onClick={() => addFinding(newComment)}
                  disabled={!newComment.trim()}
                  className="cyber-button"
                >
                  🔍 Finding
                </button>
                <button 
                  onClick={addComment}
                  disabled={!newComment.trim()}
                  className="cyber-button-primary"
                >
                  💬 Comment
                </button>
              </div>
            </div>
          </div>

          {/* Code/Output Section */}
          <div className="cyber-card mt-4 p-6">
            <h3 className="text-lg font-display font-semibold mb-4">📁 Project Files</h3>
            <div className="text-gray-400 text-sm">
              <p>No files created yet. Complete Development phase to see files here.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}