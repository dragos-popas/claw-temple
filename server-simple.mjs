#!/usr/bin/env node
// ============================================================================
// CLAW-TEMPLE - Simple Server (No TypeScript compilation required)
// ============================================================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DB_PATH = process.env.DATABASE_PATH || './data/claw-temple.db';
const FRONTEND_DIST = path.join(__dirname, '../frontend/dist');

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Make io accessible to routes
app.set('io', io);

// Utility functions
function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ============= API Routes =============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '0.0.0' });
});

// Tasks
app.get('/api/tasks', (req, res) => {
  const { status, poolId } = req.query;
  let query = 'SELECT * FROM tasks';
  const params = [];
  const conditions = [];
  
  if (status) { conditions.push('status = ?'); params.push(status); }
  if (poolId) { conditions.push('pool_id = ?'); params.push(poolId); }
  
  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY priority DESC, created_at ASC';
  
  const stmt = db.prepare(query);
  const tasks = stmt.all(...params).map(row => ({
    id: row.id,
    title: row.title,
    description: row.description,
    repoUrl: row.repo_url,
    templateId: row.template_id,
    poolId: row.pool_id,
    model: row.model,
    status: row.status,
    priority: row.priority,
    costEstimate: row.cost_estimate,
    actualCost: row.actual_cost,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined
  }));
  
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const id = randomUUID();
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO tasks (id, title, description, repo_url, template_id, pool_id, model, status, priority, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'TODO', ?, ?)
  `).run(
    id, req.body.title, req.body.description || null, req.body.repoUrl || null,
    req.body.templateId || null, req.body.poolId || null, req.body.model || null,
    req.body.priority || 0, req.body.metadata ? JSON.stringify(req.body.metadata) : null
  );
  
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  io.emit('task:created', task);
  res.status(201).json(task);
});

app.get('/api/tasks/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.put('/api/tasks/:id', (req, res) => {
  const sets = [];
  const params = [];
  
  if (req.body.status !== undefined) { sets.push('status = ?'); params.push(req.body.status); }
  if (req.body.title !== undefined) { sets.push('title = ?'); params.push(req.body.title); }
  if (req.body.description !== undefined) { sets.push('description = ?'); params.push(req.body.description); }
  if (req.body.poolId !== undefined) { sets.push('pool_id = ?'); params.push(req.body.poolId); }
  if (req.body.model !== undefined) { sets.push('model = ?'); params.push(req.body.model); }
  if (req.body.actualCost !== undefined) { sets.push('actual_cost = ?'); params.push(req.body.actualCost); }
  if (req.body.completedAt !== undefined) { sets.push('completed_at = ?'); params.push(req.body.completedAt); }
  
  if (sets.length === 0) return res.status(400).json({ error: 'No updates provided' });
  
  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(req.params.id);
  
  db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  io.emit('task:updated', task);
  res.json(task);
});

app.post('/api/tasks/:id/move', (req, res) => {
  const { status } = req.body;
  if (!['TODO', 'RESEARCH', 'DEV', 'QA', 'DONE'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  const completedAt = status === 'DONE' ? new Date().toISOString() : null;
  db.prepare(`UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?`)
    .run(status, completedAt, new Date().toISOString(), req.params.id);
  
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  io.emit('task:updated', task);
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Task not found' });
  io.emit('task:deleted', { taskId: req.params.id });
  res.status(204).send();
});

app.get('/api/tasks/counts', (req, res) => {
  const counts = { TODO: 0, RESEARCH: 0, DEV: 0, QA: 0, DONE: 0 };
  const rows = db.prepare('SELECT status, COUNT(*) as count FROM tasks GROUP BY status').all();
  for (const row of rows) counts[row.status] = row.count;
  res.json(counts);
});

// Agent Pools
app.get('/api/agents/pools', (req, res) => {
  const pools = db.prepare('SELECT * FROM agent_pools ORDER BY name ASC').all().map(row => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    defaultModel: row.default_model,
    maxParallel: row.max_parallel,
    costLimit: row.cost_limit,
    autoAccept: Boolean(row.auto_accept),
    timeoutMinutes: row.timeout_minutes,
    retryCount: row.retry_count,
    notificationMode: row.notification_mode,
    isPaused: Boolean(row.is_paused),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    activeCount: 0 // Would need separate query
  }));
  res.json(pools);
});

app.post('/api/agents/pools', (req, res) => {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO agent_pools (id, name, icon, default_model, max_parallel, cost_limit, auto_accept, timeout_minutes, retry_count, notification_mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, req.body.name, req.body.icon || '🤖', req.body.defaultModel || null,
    req.body.maxParallel || 3, req.body.costLimit || null,
    req.body.autoAccept ? 1 : 0, req.body.timeoutMinutes || 60,
    req.body.retryCount || 2, req.body.notificationMode || 'both'
  );
  const pool = db.prepare('SELECT * FROM agent_pools WHERE id = ?').get(id);
  res.status(201).json(pool);
});

app.put('/api/agents/pools/:id', (req, res) => {
  const sets = [];
  const params = [];
  
  if (req.body.name !== undefined) { sets.push('name = ?'); params.push(req.body.name); }
  if (req.body.icon !== undefined) { sets.push('icon = ?'); params.push(req.body.icon); }
  if (req.body.defaultModel !== undefined) { sets.push('default_model = ?'); params.push(req.body.defaultModel); }
  if (req.body.maxParallel !== undefined) { sets.push('max_parallel = ?'); params.push(req.body.maxParallel); }
  if (req.body.isPaused !== undefined) { sets.push('is_paused = ?'); params.push(req.body.isPaused ? 1 : 0); }
  
  if (sets.length === 0) return res.status(400).json({ error: 'No updates provided' });
  
  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(req.params.id);
  
  db.prepare(`UPDATE agent_pools SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  const pool = db.prepare('SELECT * FROM agent_pools WHERE id = ?').get(req.params.id);
  res.json(pool);
});

app.post('/api/agents/pools/:id/pause', (req, res) => {
  db.prepare('UPDATE agent_pools SET is_paused = 1, updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), req.params.id);
  const pool = db.prepare('SELECT * FROM agent_pools WHERE id = ?').get(req.params.id);
  io.emit('agent:pool:paused', { poolId: req.params.id });
  res.json(pool);
});

app.post('/api/agents/pools/:id/resume', (req, res) => {
  db.prepare('UPDATE agent_pools SET is_paused = 0, updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), req.params.id);
  const pool = db.prepare('SELECT * FROM agent_pools WHERE id = ?').get(req.params.id);
  io.emit('agent:pool:resumed', { poolId: req.params.id });
  res.json(pool);
});

app.delete('/api/agents/pools/:id', (req, res) => {
  const result = db.prepare('DELETE FROM agent_pools WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Pool not found' });
  res.status(204).send();
});

// Templates
app.get('/api/templates', (req, res) => {
  const templates = db.prepare('SELECT * FROM templates ORDER BY name ASC').all().map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    config: JSON.parse(row.config),
    createdAt: row.created_at
  }));
  res.json(templates);
});

// Config
app.get('/api/config', (req, res) => {
  const config = {
    defaultRepo: 'https://github.com/dragos-popas/location-scrapers',
    columnLimits: { TODO: 100, RESEARCH: 2, DEV: 3, QA: 2, DONE: 100 },
    notificationSettings: { browser: true, telegram: true },
    theme: 'dark'
  };
  res.json(config);
});

// Analytics
app.get('/api/analytics/dashboard', (req, res) => {
  const tasksCompleted = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'DONE'").get().count;
  const queue = { TODO: 0, RESEARCH: 0, DEV: 0, QA: 0, DONE: 0 };
  const queueRows = db.prepare('SELECT status, COUNT(*) as count FROM tasks GROUP BY status').all();
  for (const row of queueRows) queue[row.status] = row.count;
  
  res.json({
    spend: { daily: [], weekly: [], monthly: [], total: 0 },
    productivity: { tasksCompleted, avgCycleTimeMinutes: 0, byPool: [] },
    modelUsage: [],
    queue,
    generatedAt: new Date().toISOString()
  });
});

// Models (mock)
app.get('/api/models', (req, res) => {
  res.json([
    { id: 'openrouter/auto', name: 'Auto (Best)', pricing: { prompt: 0.00001, completion: 0.00003 }, contextLength: 128000 },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', pricing: { prompt: 0.000014, completion: 0.000028 }, contextLength: 64000 },
    { id: 'moonshotai/kimi-k2.5', name: 'Kimi K2.5', pricing: { prompt: 0.00002, completion: 0.00006 }, contextLength: 200000 },
    { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', pricing: { prompt: 0.00001, completion: 0.00003 }, contextLength: 1000000 },
    { id: 'xiaomi/mimo-v2-flash', name: 'Xiaomi Mimo Flash', pricing: { prompt: 0.000008, completion: 0.00002 }, contextLength: 131072 }
  ]);
});

// Worktrees
app.get('/api/worktrees', (req, res) => {
  const worktrees = db.prepare('SELECT * FROM worktrees ORDER BY created_at DESC').all().map(row => ({
    id: row.id,
    taskId: row.task_id,
    path: row.path,
    branch: row.branch,
    status: row.status,
    createdAt: row.created_at,
    cleanedAt: row.cleaned_at
  }));
  res.json(worktrees);
});

// Socket.io
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.join('global');
  socket.on('disconnect', () => console.log(`Client disconnected: ${socket.id}`));
});

// Serve frontend
app.use(express.static(FRONTEND_DIST));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (fs.existsSync(path.join(FRONTEND_DIST, 'index.html'))) {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  } else {
    res.json({ status: 'ok', message: 'CLAW-TEMPLE server running', frontend: 'not built' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
httpServer.listen(PORT, HOST, () => {
  console.log(`\n🦀 CLAW-TEMPLE running on http://${HOST}:${PORT}`);
  console.log('   Ready for cyberpunk orchestration!\n');
});