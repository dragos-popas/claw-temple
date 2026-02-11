// ============================================================================
// CLAW-TEMPLE - Worktree API Routes
// ============================================================================

import { Router } from 'express';
import { getDb } from '../stores/sqlite.js';
import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

export const worktreeRouter = Router();

// GET all worktrees
worktreeRouter.get('/', async (req, res) => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM worktrees ORDER BY created_at DESC');
  const rows = stmt.all();

  const worktrees = rows.map((row: Record<string, unknown>) => ({
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

// GET single worktree
worktreeRouter.get('/:id', async (req, res) => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM worktrees WHERE id = ?');
  const row = stmt.get(req.params.id);

  if (!row) {
    return res.status(404).json({ error: 'Worktree not found' });
  }

  res.json({
    id: row.id,
    taskId: row.task_id,
    path: row.path,
    branch: row.branch,
    status: row.status,
    createdAt: row.created_at,
    cleanedAt: row.cleaned_at
  });
});

// CREATE worktree for task
worktreeRouter.post('/', async (req, res) => {
  try {
    const { taskId, repoUrl, baseBranch = 'main' } = req.body;

    if (!taskId || !repoUrl) {
      return res.status(400).json({ error: 'taskId and repoUrl are required' });
    }

    const db = getDb();
    const worktreeId = randomUUID();
    const branchName = `ns/task-${taskId.slice(0, 8)}`;
    const worktreePath = `./worktrees/${branchName}`;

    // Create git worktree
    try {
      await execAsync(`git worktree add ${worktreePath} ${baseBranch}`);
      logger.info(`Worktree created: ${worktreePath}`);
    } catch (gitError) {
      // Worktree might already exist
      logger.warn(`Worktree creation warning: ${(gitError as Error).message}`);
    }

    // Record in database
    const stmt = db.prepare(`
      INSERT INTO worktrees (id, task_id, path, branch, status)
      VALUES (?, ?, ?, ?, 'active')
    `);

    stmt.run(worktreeId, taskId, worktreePath, branchName);

    res.status(201).json({
      id: worktreeId,
      taskId,
      path: worktreePath,
      branch: branchName,
      status: 'active',
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// CLEANUP worktree
worktreeRouter.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM worktrees WHERE id = ?');
    const row = stmt.get(req.params.id);

    if (!row) {
      return res.status(404).json({ error: 'Worktree not found' });
    }

    const worktreePath = row.path;

    // Remove git worktree
    try {
      await execAsync(`git worktree remove ${worktreePath} --force`);
      logger.info(`Worktree removed: ${worktreePath}`);
    } catch (gitError) {
      logger.warn(`Worktree removal warning: ${(gitError as Error).message}`);
    }

    // Update database
    const updateStmt = db.prepare(`
      UPDATE worktrees SET status = 'cleaned', cleaned_at = ? WHERE id = ?
    `);
    updateStmt.run(new Date().toISOString(), req.params.id);

    res.json({ message: 'Worktree cleaned', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// CLEANUP all orphan worktrees
worktreeRouter.post('/cleanup-orphans', async (req, res) => {
  try {
    const db = getDb();
    
    // Find all worktrees marked as active
    const stmt = db.prepare("SELECT * FROM worktrees WHERE status = 'active'");
    const rows = stmt.all();

    const cleaned: string[] = [];
    for (const row of rows) {
      const worktreePath = row.path;
      
      // Check if directory exists
      try {
        await execAsync(`test -d ${worktreePath}`);
      } catch {
        // Directory doesn't exist - clean up
        const updateStmt = db.prepare(`
          UPDATE worktrees SET status = 'cleaned', cleaned_at = ? WHERE id = ?
        `);
        updateStmt.run(new Date().toISOString(), row.id);
        cleaned.push(row.id);
      }
    }

    res.json({ message: 'Orphan cleanup complete', cleanedCount: cleaned.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});