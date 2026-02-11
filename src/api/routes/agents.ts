// ============================================================================
// CLAW-TEMPLE - Agents API Routes
// ============================================================================

import { Router } from 'express';
import { 
  createPool, 
  getAllPools, 
  getPoolById, 
  updatePool, 
  deletePool,
  pausePool,
  resumePool,
  getActiveAgentCount,
  getPoolWithStats
} from '../stores/agentStore.js';
import { AgentPoolCreateInput } from '../types/index.js';

export const agentsRouter = Router();

// GET all pools
agentsRouter.get('/pools', (req, res) => {
  const pools = getAllPools();
  
  // Add stats to each pool
  const poolsWithStats = pools.map(pool => ({
    ...pool,
    activeCount: getActiveAgentCount(pool.id)
  }));

  res.json(poolsWithStats);
});

// GET pool with stats
agentsRouter.get('/pools/:id', (req, res) => {
  const pool = getPoolWithStats(req.params.id);
  if (!pool) {
    return res.status(404).json({ error: 'Pool not found' });
  }
  res.json(pool);
});

// CREATE pool
agentsRouter.post('/pools', (req, res) => {
  try {
    const input: AgentPoolCreateInput = {
      name: req.body.name,
      icon: req.body.icon,
      defaultModel: req.body.defaultModel,
      maxParallel: req.body.maxParallel,
      costLimit: req.body.costLimit,
      autoAccept: req.body.autoAccept,
      timeoutMinutes: req.body.timeoutMinutes,
      retryCount: req.body.retryCount,
      notificationMode: req.body.notificationMode
    };

    if (!input.name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const pool = createPool(input);
    res.status(201).json(pool);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// UPDATE pool
agentsRouter.put('/pools/:id', (req, res) => {
  const pool = updatePool(req.params.id, req.body);
  if (!pool) {
    return res.status(404).json({ error: 'Pool not found' });
  }
  res.json(pool);
});

// PAUSE pool
agentsRouter.post('/pools/:id/pause', (req, res) => {
  const pool = pausePool(req.params.id);
  if (!pool) {
    return res.status(404).json({ error: 'Pool not found' });
  }

  const io = req.app.get('io');
  io?.emit('agent:pool:paused', { poolId: pool.id });

  res.json(pool);
});

// RESUME pool
agentsRouter.post('/pools/:id/resume', (req, res) => {
  const pool = resumePool(req.params.id);
  if (!pool) {
    return res.status(404).json({ error: 'Pool not found' });
  }

  const io = req.app.get('io');
  io?.emit('agent:pool:resumed', { poolId: pool.id });

  res.json(pool);
});

// DELETE pool
agentsRouter.delete('/pools/:id', (req, res) => {
  const deleted = deletePool(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Pool not found' });
  }
  res.status(204).send();
});

// GET active instances
agentsRouter.get('/instances', (req, res) => {
  // TODO: Implement agent instances tracking
  res.json([]);
});

// GET pool capacity
agentsRouter.get('/pools/:id/capacity', (req, res) => {
  const pool = getPoolById(req.params.id);
  if (!pool) {
    return res.status(404).json({ error: 'Pool not found' });
  }

  const activeCount = getActiveAgentCount(req.params.id);
  const available = pool.maxParallel - activeCount;

  res.json({
    poolId: pool.id,
    poolName: pool.name,
    maxParallel: pool.maxParallel,
    activeCount,
    available: Math.max(0, available),
    isPaused: pool.isPaused
  });
});