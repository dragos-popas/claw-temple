// ============================================================================
// CLAW-TEMPLE - API Router
// ============================================================================

import { Router } from 'express';
import { tasksRouter } from './routes/tasks.js';
import { agentsRouter } from './routes/agents.js';
import { modelsRouter } from './routes/models.js';
import { analyticsRouter } from './routes/analytics.js';
import { templatesRouter } from './routes/templates.js';
import { configRouter } from './routes/config.js';
import { worktreeRouter } from './routes/worktree.js';

export const router = Router();

// Mount route handlers
router.use('/tasks', tasksRouter);
router.use('/agents', agentsRouter);
router.use('/models', modelsRouter);
router.use('/analytics', analyticsRouter);
router.use('/templates', templatesRouter);
router.use('/config', configRouter);
router.use('/worktrees', worktreeRouter);

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '0.0.0'
  });
});