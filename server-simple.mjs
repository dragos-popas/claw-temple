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
const PROJECT_ROOT = path.resolve(__dirname, '..');
const FRONTEND_DIST = path.join(PROJECT_ROOT, 'claw-temple/frontend/dist');

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create comments table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS task_comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  )
`).run();

// Create index for faster queries
db.prepare(`
  CREATE INDEX IF NOT EXISTS idx_task_comments_task_id 
  ON task_comments(task_id)
`).run();

// ============= Migrations =============
// Add new columns to existing tables

// Migration: Add assigned_to column to tasks
const hasAssignedTo = db.prepare(`
  SELECT COUNT(*) as count FROM pragma_table_info('tasks') WHERE name = 'assigned_to'
`).get().count > 0;
if (!hasAssignedTo) {
  db.prepare(`ALTER TABLE tasks ADD COLUMN assigned_to TEXT`).run();
  console.log('[DB] Migration: Added assigned_to column to tasks');
}

// Migration: Add type column to tasks
const hasType = db.prepare(`
  SELECT COUNT(*) as count FROM pragma_table_info('tasks') WHERE name = 'type'
`).get().count > 0;
if (!hasType) {
  db.prepare(`ALTER TABLE tasks ADD COLUMN type TEXT DEFAULT 'scraping'`).run();
  console.log('[DB] Migration: Added type column to tasks');
}

// Migration: Add language column to tasks
const hasLanguage = db.prepare(`
  SELECT COUNT(*) as count FROM pragma_table_info('tasks') WHERE name = 'language'
`).get().count > 0;
if (!hasLanguage) {
  db.prepare(`ALTER TABLE tasks ADD COLUMN language TEXT`).run();
  console.log('[DB] Migration: Added language column to tasks');
}

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

// ============= Task Comments API =============

// Get comments for a task
app.get('/api/tasks/:id/comments', (req, res) => {
  try {
    const comments = db.prepare(`
      SELECT * FROM task_comments 
      WHERE task_id = ? 
      ORDER BY created_at ASC
    `).all(req.params.id);
    
    res.json(comments.map(row => ({
      id: row.id,
      taskId: row.task_id,
      author: row.author,
      content: row.content,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: row.created_at
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments: ' + error.message });
  }
});

// Add comment to task
app.post('/api/tasks/:id/comments', (req, res) => {
  try {
    const { content, author, agentName, tags, type } = req.body;
    
    if (!content) return res.status(400).json({ error: 'Content is required' });
    
    const id = randomUUID();
    const now = new Date().toISOString();
    const finalAuthor = agentName || author || 'Unknown';
    
    db.prepare(`
      INSERT INTO task_comments (id, task_id, author, content, tags, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, finalAuthor, content, JSON.stringify(tags || []), now);
    
    // Emit socket event
    io.to(req.params.id).emit('task:comment:added', {
      id,
      taskId: req.params.id,
      author,
      content,
      tags,
      createdAt: now
    });
    
    res.status(201).json({
      id,
      taskId: req.params.id,
      author: finalAuthor,
      content,
      type: type || 'comment',
      tags: tags || [],
      createdAt: now
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment: ' + error.message });
  }
});

// Delete comment
app.delete('/api/tasks/:taskId/comments/:commentId', (req, res) => {
  try {
    const result = db.prepare(`
      DELETE FROM task_comments 
      WHERE id = ? AND task_id = ?
    `).run(req.params.commentId, req.params.taskId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    io.to(req.params.taskId).emit('task:comment:deleted', {
      commentId: req.params.commentId,
      taskId: req.params.taskId
    });
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete comment: ' + error.message });
  }
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
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    assignedTo: row.assigned_to,
    soulId: row.soul_id,
    type: row.type || 'scraping',
    language: row.language
  }));
  
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const id = randomUUID();
  const now = new Date().toISOString();
  
  const taskType = req.body.type || 'scraping';
  const framework = req.body.metadata?.framework || 'crawlee';
  const language = req.body.language || 'typescript';
  
  // Auto-assign based on task type
  let soulId = null;
  let poolId = null;
  let initialStatus = 'TODO';
  
  if (taskType === 'scraping') {
    if (framework === 'crawlee') {
      // Assign to Scarlett (Crawlee soul)
      const crawleeSoul = db.prepare("SELECT id FROM agent_souls WHERE name LIKE '%Scarlett%' OR name LIKE '%Crawlee%' LIMIT 1").get();
      if (crawleeSoul) {
        soulId = crawleeSoul.id;
        initialStatus = 'RESEARCH';
      }
    } else if (framework === 'scrapy') {
      // Assign to Scrapy soul
      const scrapySoul = db.prepare("SELECT id FROM agent_souls WHERE name LIKE '%Scrapy%' LIMIT 1").get();
      if (scrapySoul) {
        soulId = scrapySoul.id;
        initialStatus = 'RESEARCH';
      }
    }
  } else if (taskType === 'general') {
    // Assign to General soul
    const generalSoul = db.prepare("SELECT id FROM agent_souls WHERE name LIKE '%General%' LIMIT 1").get();
    if (generalSoul) {
      soulId = generalSoul.id;
      initialStatus = 'RESEARCH';
    }
  }
  
  db.prepare(`
    INSERT INTO tasks (id, title, description, repo_url, template_id, pool_id, model, soul_id, status, priority, metadata, type, language)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, req.body.title, req.body.description || null, req.body.repoUrl || null,
    req.body.templateId || null, req.body.poolId || null, req.body.model || null,
    soulId, initialStatus, req.body.priority || 0, req.body.metadata ? JSON.stringify(req.body.metadata) : null,
    taskType, language
  );
  
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  const task = {
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
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    assignedTo: row.assigned_to,
    soulId: row.soul_id,
    type: row.type || 'scraping',
    language: row.language
  };
  io.emit('task:created', task);
  
  // Emit event that agent can listen to
  if (soulId) {
    io.emit('task:assigned', { taskId: id, soulId, framework, taskType });
  }
  
  res.status(201).json(task);
});

app.get('/api/tasks/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Task not found' });
  
  const task = {
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
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    assignedTo: row.assigned_to,
    soulId: row.soul_id,
    type: row.type || 'scraping',
    language: row.language
  };
  
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
  if (req.body.soulId !== undefined || req.body.soul_id !== undefined) { 
    sets.push('soul_id = ?'); 
    params.push(req.body.soulId || req.body.soul_id); 
  }
  if (req.body.assignedTo !== undefined) { 
    sets.push('assigned_to = ?'); 
    params.push(req.body.assignedTo); 
  }
  if (req.body.type !== undefined) { 
    sets.push('type = ?'); 
    params.push(req.body.type); 
  }
  if (req.body.language !== undefined) { 
    sets.push('language = ?'); 
    params.push(req.body.language); 
  }
  
  if (sets.length === 0) return res.status(400).json({ error: 'No updates provided' });
  
  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(req.params.id);
  
  db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  const task = {
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
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    assignedTo: row.assigned_to,
    soulId: row.soul_id,
    type: row.type || 'scraping',
    language: row.language
  };
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
  const pools = db.prepare('SELECT * FROM agent_pools ORDER BY name ASC').all().map(row => {
    // Get active agents from heartbeats (stale after 30s)
    const staleTime = new Date(Date.now() - 30000).toISOString();
    const activeAgents = db.prepare(
      'SELECT COUNT(*) as count FROM agent_heartbeats WHERE pool_id = ? AND last_seen >= ?'
    ).get(row.id, staleTime).count;
    
    return ({
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
    activeAgents,
    maxAgents: row.max_parallel,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    activeCount: activeAgents // For compatibility
  });
  });
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

// Agent heartbeat - reports agent activity
app.post('/api/agents/pools/:id/heartbeat', (req, res) => {
  const { agentName, status, pid } = req.body;
  const now = new Date().toISOString();
  
  // Upsert heartbeat
  const existing = db.prepare('SELECT * FROM agent_heartbeats WHERE pool_id = ? AND agent_name = ?')
    .get(req.params.id, agentName);
  
  if (existing) {
    db.prepare(`
      UPDATE agent_heartbeats SET status = ?, last_seen = ?, pid = ?, metadata = ?
      WHERE pool_id = ? AND agent_name = ?
    `).run(status || 'active', now, pid || null, JSON.stringify(req.body.metadata || {}), req.params.id, agentName);
  } else {
    db.prepare(`
      INSERT INTO agent_heartbeats (id, pool_id, agent_name, status, last_seen, pid, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), req.params.id, agentName, status || 'active', now, pid || null, JSON.stringify(req.body.metadata || {}));
  }
  
  // Clean up stale heartbeats (> 30 seconds)
  const staleTime = new Date(Date.now() - 30000).toISOString();
  db.prepare('DELETE FROM agent_heartbeats WHERE last_seen < ?').run(staleTime);
  
  // Get active count
  const activeCount = db.prepare('SELECT COUNT(*) as count FROM agent_heartbeats WHERE pool_id = ? AND last_seen >= ?')
    .get(req.params.id, staleTime).count;
  
  res.json({ status: 'ok', activeCount, lastSeen: now });
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

// ============================================================================
// AGENT CUSTOMIZATION (SOUL/IDENTITY/BIBLE STYLE)
// ============================================================================

// Agent Souls table - stores AI persona configurations
db.exec(`
  CREATE TABLE IF NOT EXISTS agent_souls (
    id TEXT PRIMARY KEY,
    pool_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    soul TEXT NOT NULL,         -- Core personality (SOUL.md style)
    identity TEXT NOT NULL,      -- Identity configuration (IDENTITY.md style)
    bible TEXT NOT NULL,         -- Rules and principles (BIBLE.md style)
    system_prompt TEXT,           -- Full system prompt for LLM
    model TEXT,                   -- Default model for this soul
    temperature REAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 4096,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pool_id) REFERENCES agent_pools(id)
  )
`);

// Agent Soul Routes
app.get('/api/agents/souls', (req, res) => {
  const { poolId } = req.query;
  let query = 'SELECT * FROM agent_souls';
  const params = [];
  
  if (poolId) {
    query += ' WHERE pool_id = ?';
    params.push(poolId);
  }
  
  query += ' ORDER BY name ASC';
  
  const souls = db.prepare(query).all(...params).map((row) => ({
    id: row.id,
    poolId: row.pool_id,
    name: row.name,
    description: row.description,
    soul: row.soul,
    identity: row.identity,
    bible: row.bible,
    systemPrompt: row.system_prompt,
    model: row.model,
    temperature: row.temperature,
    maxTokens: row.max_tokens,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
  
  res.json(souls);
});

app.get('/api/agents/souls/:id', (req, res) => {
  const soulRecord = db.prepare('SELECT * FROM agent_souls WHERE id = ?').get(req.params.id);
  if (!soulRecord) return res.status(404).json({ error: 'Soul not found' });
  
  res.json({
    id: soul.id,
    poolId: soul.pool_id,
    name: poolSoul.name,
    description: soul.description,
    soul: soul.soul,
    identity: soul.identity,
    bible: soul.bible,
    systemPrompt: poolSoul.system_prompt,
    model: poolSoul.model,
    temperature: poolSoul.temperature,
    maxTokens: soul.max_tokens,
    createdAt: soul.created_at,
    updatedAt: soul.updated_at
  });
});

app.post('/api/agents/souls', (req, res) => {
  const id = randomUUID();
  const now = new Date().toISOString();
  
  const { poolId, name, description, soul, identity, bible, systemPrompt, model, temperature, maxTokens } = req.body;
  
  if (!poolId || !name || !soul || !identity || !bible) {
    return res.status(400).json({ error: 'poolId, name, soul, identity, and bible are required' });
  }
  
  // Build system prompt from components
  const fullSystemPrompt = systemPrompt || `
=== SOUL ===
${soul}

=== IDENTITY ===
${identity}

=== BIBLE (RULES) ===
${bible}
`.trim();

  db.prepare(`
    INSERT INTO agent_souls (id, pool_id, name, description, soul, identity, bible, system_prompt, model, temperature, max_tokens, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, poolId, name, description || null, soul, identity, bible, fullSystemPrompt, model || null,
    temperature || 0.7, maxTokens || 4096, now, now
  );
  
  const soulCreated = db.prepare('SELECT * FROM agent_souls WHERE id = ?').get(id);
  res.status(201).json(soulCreated);
});

app.put('/api/agents/souls/:id', (req, res) => {
  const now = new Date().toISOString();
  const { name, description, soul, identity, bible, systemPrompt, model, temperature, maxTokens } = req.body;
  
  const sets = [];
  const params = [];
  
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (description !== undefined) { sets.push('description = ?'); params.push(description); }
  if (soul !== undefined) { sets.push('soul = ?'); params.push(soul); }
  if (identity !== undefined) { sets.push('identity = ?'); params.push(identity); }
  if (bible !== undefined) { sets.push('bible = ?'); params.push(bible); }
  if (systemPrompt !== undefined) { sets.push('system_prompt = ?'); params.push(systemPrompt); }
  if (model !== undefined) { sets.push('model = ?'); params.push(model); }
  if (temperature !== undefined) { sets.push('temperature = ?'); params.push(temperature); }
  if (maxTokens !== undefined) { sets.push('max_tokens = ?'); params.push(maxTokens); }
  
  if (sets.length === 0) return res.status(400).json({ error: 'No updates provided' });
  
  sets.push('updated_at = ?');
  params.push(now);
  params.push(req.params.id);
  
  db.prepare(`UPDATE agent_souls SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  
  const soulRecord = db.prepare('SELECT * FROM agent_souls WHERE id = ?').get(req.params.id);
  if (!soulRecord) return res.status(404).json({ error: 'Soul not found' });
  
  res.json(soulRecord);
});

app.delete('/api/agents/souls/:id', (req, res) => {
  const result = db.prepare('DELETE FROM agent_souls WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Soul not found' });
  res.status(204).send();
});

// Get soul for a pool (returns default soul or first available)
app.get('/api/agents/pools/:id/soul', (req, res) => {
  const poolSoul = db.prepare('SELECT * FROM agent_souls WHERE pool_id = ? ORDER BY created_at ASC LIMIT 1').get(req.params.id);
  if (!poolSoul) return res.status(404).json({ error: 'No soul found for this pool' });
  
  res.json({
    id: soul.id,
    poolId: soul.pool_id,
    name: poolSoul.name,
    systemPrompt: poolSoul.system_prompt,
    model: poolSoul.model,
    temperature: poolSoul.temperature
  });
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

// OpenRouter API Key (from environment or fallback)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';

// Cache for models
let modelsCache = null;
let modelsCacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Models (real OpenRouter API)
app.get('/api/models', async (req, res) => {
  try {
    // Check cache
    if (modelsCache && Date.now() - modelsCacheTime < CACHE_DURATION) {
      return res.json(modelsCache);
    }

    // Fetch from OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform and sort models
    modelsCache = data.data
      .filter(m => m.id && m.name)
      .map(m => ({
        id: m.id,
        name: m.name,
        pricing: {
          prompt: m.pricing?.prompt || 0,
          completion: m.pricing?.completion || 0
        },
        contextLength: m.context_length || 8192
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    modelsCacheTime = Date.now();
    
    console.log(`✅ Loaded ${modelsCache.length} models from OpenRouter`);
    res.json(modelsCache);
  } catch (error) {
    console.error('Failed to fetch models:', error);
    // Fallback to minimal model list
    res.json([
      { id: 'openrouter/auto', name: 'Auto (Best)', pricing: { prompt: 0.00001, completion: 0.00003 }, contextLength: 128000 },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', pricing: { prompt: 0.000014, completion: 0.000028 }, contextLength: 64000 },
      { id: 'moonshotai/kimi-k2.5', name: 'Kimi K2.5', pricing: { prompt: 0.00002, completion: 0.00006 }, contextLength: 200000 },
      { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', pricing: { prompt: 0.00001, completion: 0.00003 }, contextLength: 1000000 },
      { id: 'xiaomi/mimo-v2-flash', name: 'Xiaomi Mimo Flash', pricing: { prompt: 0.000008, completion: 0.00002 }, contextLength: 131072 }
    ]);
  }
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

// Seed default souls (Crawlee & Scrapy specialists)
app.post('/api/agents/souls/seed-defaults', (req, res) => {
  const now = new Date().toISOString();
  const shortId = () => Math.random().toString(36).slice(2, 10);

  // Crawlee Soul (TypeScript/Node.js focused)
  const crawleeId = 'crawlee-' + shortId();
  const crawleeSoul = `You are Crawlee, a TypeScript-first web scraping specialist built on the Crawlee framework. You have deep expertise in Node.js/TypeScript with native support for Cheerio, Playwright, and Puppeteer integrations.

Your core values:
- Type Safety: You use TypeScript interfaces for all data structures
- Precision: You verify every selector before extraction
- Efficiency: You design scrapers that minimize requests while maximizing data yield
- Ethics: You respect robots.txt, implement polite crawling, and avoid overwhelming targets
- Resilience: You handle CAPTCHAs, rate limits, and blocks gracefully with appropriate strategies
- Maintainability: You write clean, typed code with comprehensive JSDoc`;

  const crawleeIdentity = `Name: Crawlee
Role: TypeScript Web Scraping Specialist
Expertise: Node.js, TypeScript, Cheerio, Playwright, Puppeteer, Anti-detection, Data validation
Background: A modern Crawlee practitioner specializing in TypeScript/Node.js scraping solutions. You've extracted data from millions of pages across e-commerce, real estate, job boards, and research databases using strictly typed code.
Languages: TypeScript (primary), JavaScript (secondary)
Key Capabilities: Cheerio scraping, Playwright browser automation, Puppeteer control, Request queue management, Proxy rotation, Typed data extraction`;

  const crawleeBible = `TYPESCRIPT SCRAPING RULES (Follow these always):
1. Always check robots.txt before crawling; respect crawl-delay directives
2. Implement exponential backoff on 429/503 responses (start with 1s, double each retry, max 60s)
3. Use Cheerio for static HTML pages - it's 10x faster than browser automation
4. Use Playwright/Puppeteer ONLY when content is JavaScript-rendered
5. Rotate user-agents and implement proper request headers
6. Extract and validate data immediately with TypeScript interfaces - don't let bad data persist
7. Log all scraping decisions for debugging and audit trails
8. Store data in structured JSON formats with proper typing
9. Handle errors gracefully - one failed URL shouldn't crash the entire job
10. Report extraction statistics: success rate, errors, data quality metrics

TYPESCRIPT-SPECIFIC BEST PRACTICES:
- Define interfaces for all extracted data structures
- Use 'unknown' type for untrusted input, cast only after validation
- Prefer const assertions for literal types
- Use Zod or similar for runtime validation
- Never use 'any' type - be explicit about all types
- Use async/await with proper error handling
- Implement proper cleanup in finally blocks
- Use type guards for conditional type narrowing`;

  // Scrapy Soul
  const scrapyId = 'scrapy-' + shortId();
  const scrapySoul = `You are Scrapy, a battle-tested web scraping veteran built on the legendary Scrapy framework. You represent over 15 years of production scraping experience, specializing in large-scale data extraction with enterprise-grade reliability.

Your core values:
- Scale: You design systems that can process millions of URLs reliably
- Reliability: Your pipelines are fault-tolerant with comprehensive error handling
- Performance: You optimize for throughput without sacrificing data quality
- Standards: You follow PEP 8, Scrapy best practices, and web scraping ethics
- Documentation: Every spider you write is self-documenting with clear purpose and logic`;

  const scrapyIdentity = `Name: Scrapy
Role: Senior Data Extraction Engineer & Pipeline Architect
Expertise: Large-scale crawling, SPA navigation, API extraction, data pipelines, distributed scraping
Background: A pioneer of modern web scraping, I've extracted petabytes of data for research, business intelligence, and competitive analysis. My spiders have crawled every type of site - from simple blogs to complex enterprise platforms.
Languages: Python (native speaker)
Key Capabilities: XPath mastery, CSS selector optimization, Scrapy Middleware development, Item pipeline design, Feed exports, Redis integration for distributed crawling`;

  const scrapyBible = `PIPELINE RULES (Follow these always):
1. Use XPath for complex HTML structures - it's more powerful than CSS for nested content
2. Write item pipelines for data cleaning - one spider, many cleaning steps
3. Configure CONCURRENT_REQUESTS based on target's tolerance (start conservative: 8-16)
4. Use AUTOThROTTLE enabled - adapt to server response times automatically
5. Set appropriate DOWNLOAD_DELAY (0.25-1s minimum for polite scraping)
6. Implement CLOSESPIDER_* signals for graceful shutdown on errors
7. Use Items with defined fields for type safety and validation
8. Export via FEED_EXPORTERS to JSONL/CSV/XML as needed

SCRAPY-SPECIFIC PATTERNS:
- parse() returns Requests or Items - never mix responsibilities
- start_urls is deprecated - build URLs programmatically in start_requests()
- Use form requests for login/search POST operations
- Middleware for retry, user-agent, and proxy rotation
- Signals (item_scraped, spider_closed) for metrics and cleanup
- Don't forget to close() the spider properly for resource cleanup`;

  try {
    // Insert Crawlee Soul
    db.prepare(`
      INSERT INTO agent_souls (id, pool_id, name, description, soul, identity, bible, model, temperature)
      VALUES (?, NULL, ?, ?, ?, ?, ?, 'deepseek/deepseek-r1', 0.3)
    `).run(
      crawleeId,
      '🕷️ Crawlee Specialist',
      'Expert Crawlee framework scraper with Cheerio/Playwright/Puppeteer support',
      crawleeSoul,
      crawleeIdentity,
      crawleeBible
    );

    // Insert Scrapy Soul
    db.prepare(`
      INSERT INTO agent_souls (id, pool_id, name, description, soul, identity, bible, model, temperature)
      VALUES (?, NULL, ?, ?, ?, ?, ?, 'deepseek/deepseek-r1', 0.3)
    `).run(
      scrapyId,
      '🕸️ Scrapy Veteran',
      'Enterprise Scrapy framework scraper with XPath and pipeline expertise',
      scrapySoul,
      scrapyIdentity,
      scrapyBible
    );

    res.json({
      success: true,
      souls: [
        { id: crawleeId, name: '🕷️ Crawlee Specialist' },
        { id: scrapyId, name: '🕸️ Scrapy Veteran' }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to seed souls: ' + error.message });
  }
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