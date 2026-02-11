// ============================================================================
// CLAW-TEMPLE - Task Store
// ============================================================================

import { getDb } from './sqlite.js';
import { Task, TaskStatus, TaskCreateInput } from '../types/index.js';
import { randomUUID } from 'crypto';

export function createTask(input: TaskCreateInput): Task {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO tasks (id, title, description, repo_url, template_id, pool_id, model, status, priority, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'TODO', ?, ?)
  `);

  stmt.run(
    id,
    input.title,
    input.description || null,
    input.repoUrl || null,
    input.templateId || null,
    input.poolId || null,
    input.model || null,
    input.priority || 0,
    input.metadata ? JSON.stringify(input.metadata) : null
  );

  return getTaskById(id)!;
}

export function getTaskById(id: string): Task | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  const row = stmt.get(id);
  return row ? mapRowToTask(row) : null;
}

export function getAllTasks(filter?: { status?: TaskStatus; poolId?: string }): Task[] {
  const db = getDb();
  
  let query = 'SELECT * FROM tasks';
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter?.status) {
    conditions.push('status = ?');
    params.push(filter.status);
  }

  if (filter?.poolId) {
    conditions.push('pool_id = ?');
    params.push(filter.poolId);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY priority DESC, created_at ASC';

  const stmt = db.prepare(query);
  const rows = stmt.all(...params);
  return rows.map(mapRowToTask);
}

export function updateTask(id: string, updates: Partial<Task>): Task | null {
  const db = getDb();
  const existing = getTaskById(id);
  if (!existing) return null;

  const sets: string[] = [];
  const params: unknown[] = [];

  if (updates.status !== undefined) {
    sets.push('status = ?');
    params.push(updates.status);
  }

  if (updates.poolId !== undefined) {
    sets.push('pool_id = ?');
    params.push(updates.poolId);
  }

  if (updates.model !== undefined) {
    sets.push('model = ?');
    params.push(updates.model);
  }

  if (updates.actualCost !== undefined) {
    sets.push('actual_cost = ?');
    params.push(updates.actualCost);
  }

  if (updates.completedAt !== undefined) {
    sets.push('completed_at = ?');
    params.push(updates.completedAt);
  }

  if (updates.title !== undefined) {
    sets.push('title = ?');
    params.push(updates.title);
  }

  if (updates.description !== undefined) {
    sets.push('description = ?');
    params.push(updates.description);
  }

  if (sets.length === 0) return existing;

  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  const stmt = db.prepare(`
    UPDATE tasks SET ${sets.join(', ')} WHERE id = ?
  `);

  stmt.run(...params);
  return getTaskById(id);
}

export function moveTask(id: string, newStatus: TaskStatus): Task | null {
  const updates: Partial<Task> = { status: newStatus };
  
  if (newStatus === 'DONE') {
    updates.completedAt = new Date().toISOString();
  }

  return updateTask(id, updates);
}

export function deleteTask(id: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
  const result = stmt.run(id);
  return (result.changes as number) > 0;
}

export function getTaskCountByStatus(): Record<TaskStatus, number> {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT status, COUNT(*) as count FROM tasks GROUP BY status
  `);
  const rows = stmt.all();

  const counts: Record<TaskStatus, number> = {
    TODO: 0,
    RESEARCH: 0,
    DEV: 0,
    QA: 0,
    DONE: 0
  };

  for (const row of rows) {
    counts[row.status as TaskStatus] = row.count;
  }

  return counts;
}

function mapRowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | null,
    repoUrl: row.repo_url as string | null,
    templateId: row.template_id as string | null,
    poolId: row.pool_id as string | null,
    model: row.model as string | null,
    status: row.status as TaskStatus,
    priority: row.priority as number,
    costEstimate: row.cost_estimate as number | null,
    actualCost: row.actual_cost as number | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    completedAt: row.completed_at as string | null,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined
  };
}