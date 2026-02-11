// ============================================================================
// CLAW-TEMPLE - Tasks API Routes
// ============================================================================

import { Router } from 'express';
import { createTask, getAllTasks, getTaskById, updateTask, moveTask, deleteTask, getTaskCountByStatus, getTaskComments, addTaskComment } from '../../stores/taskStore.js';
import { TaskCreateInput, TaskStatus } from '../../types/index.js';

export const tasksRouter = Router();

// GET all tasks
tasksRouter.get('/', (req, res) => {
  const { status, poolId } = req.query;
  
  const tasks = getAllTasks({
    status: status as TaskStatus | undefined,
    poolId: poolId as string | undefined
  });

  res.json(tasks);
});

// GET task counts by status
tasksRouter.get('/counts', (req, res) => {
  const counts = getTaskCountByStatus();
  res.json(counts);
});

// GET single task
tasksRouter.get('/:id', (req, res) => {
  const task = getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// CREATE task
tasksRouter.post('/', (req, res) => {
  try {
    const input: TaskCreateInput = {
      title: req.body.title,
      description: req.body.description,
      repoUrl: req.body.repoUrl,
      templateId: req.body.templateId,
      poolId: req.body.poolId,
      model: req.body.model,
      priority: req.body.priority,
      metadata: req.body.metadata
    };

    if (!input.title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const task = createTask(input);
    
    // Emit socket event
    const io = req.app.get('io');
    io?.emit('task:created', task);

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// UPDATE task
tasksRouter.put('/:id', (req, res) => {
  const task = updateTask(req.params.id, req.body);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const io = req.app.get('io');
  io?.emit('task:updated', task);

  res.json(task);
});

// MOVE task to new status
tasksRouter.post('/:id/move', (req, res) => {
  const { status } = req.body;
  
  if (!status || !['TODO', 'RESEARCH', 'DEV', 'QA', 'DONE'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const task = moveTask(req.params.id, status as TaskStatus);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const io = req.app.get('io');
  io?.emit('task:updated', task);
  io?.emit('task:moved', { taskId: task.id, from: req.body.from, to: status });

  res.json(task);
});

// REASSIGN task (change pool/model)
tasksRouter.post('/:id/reassign', (req, res) => {
  const updates: Record<string, unknown> = {};
  
  if (req.body.poolId) updates.poolId = req.body.poolId;
  if (req.body.model) updates.model = req.body.model;

  const task = updateTask(req.params.id, updates);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const io = req.app.get('io');
  io?.emit('task:updated', task);

  res.json(task);
});

// DELETE task
tasksRouter.delete('/:id', (req, res) => {
  const deleted = deleteTask(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const io = req.app.get('io');
  io?.emit('task:deleted', { taskId: req.params.id });

  res.status(204).send();
});

// GET task comments
tasksRouter.get('/:id/comments', (req, res) => {
  const task = getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const comments = getTaskComments(req.params.id);
  res.json(comments);
});

// POST add comment to task
tasksRouter.post('/:id/comments', (req, res) => {
  const task = getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { agentName, content, type } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const comment = addTaskComment(req.params.id, agentName || null, content, type || 'comment');
  
  // Emit socket event
  const io = req.app.get('io');
  io?.emit('task:comment', { taskId: req.params.id, comment });

  res.status(201).json(comment);
});