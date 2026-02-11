// ============================================================================
// CLAW-TEMPLE - Agent Pool Store
// ============================================================================

import { getDb } from './sqlite.js';
import { AgentPool, AgentPoolCreateInput } from '../types/index.js';
import { randomUUID } from 'crypto';

export function createPool(input: AgentPoolCreateInput): AgentPool {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO agent_pools (id, name, icon, default_model, max_parallel, cost_limit, auto_accept, timeout_minutes, retry_count, notification_mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.name,
    input.icon || '🤖',
    input.defaultModel || null,
    input.maxParallel || 3,
    input.costLimit || null,
    input.autoAccept ? 1 : 0,
    input.timeoutMinutes || 60,
    input.retryCount || 2,
    input.notificationMode || 'both'
  );

  return getPoolById(id)!;
}

export function getPoolById(id: string): AgentPool | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM agent_pools WHERE id = ?');
  const row = stmt.get(id);
  return row ? mapRowToPool(row) : null;
}

export function getAllPools(): AgentPool[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM agent_pools ORDER BY name ASC');
  const rows = stmt.all();
  return rows.map(mapRowToPool);
}

export function updatePool(id: string, updates: Partial<AgentPool>): AgentPool | null {
  const db = getDb();
  const existing = getPoolById(id);
  if (!existing) return null;

  const sets: string[] = [];
  const params: unknown[] = [];

  if (updates.name !== undefined) {
    sets.push('name = ?');
    params.push(updates.name);
  }

  if (updates.icon !== undefined) {
    sets.push('icon = ?');
    params.push(updates.icon);
  }

  if (updates.defaultModel !== undefined) {
    sets.push('default_model = ?');
    params.push(updates.defaultModel);
  }

  if (updates.maxParallel !== undefined) {
    sets.push('max_parallel = ?');
    params.push(updates.maxParallel);
  }

  if (updates.costLimit !== undefined) {
    sets.push('cost_limit = ?');
    params.push(updates.costLimit);
  }

  if (updates.autoAccept !== undefined) {
    sets.push('auto_accept = ?');
    params.push(updates.autoAccept ? 1 : 0);
  }

  if (updates.timeoutMinutes !== undefined) {
    sets.push('timeout_minutes = ?');
    params.push(updates.timeoutMinutes);
  }

  if (updates.retryCount !== undefined) {
    sets.push('retry_count = ?');
    params.push(updates.retryCount);
  }

  if (updates.notificationMode !== undefined) {
    sets.push('notification_mode = ?');
    params.push(updates.notificationMode);
  }

  if (updates.isPaused !== undefined) {
    sets.push('is_paused = ?');
    params.push(updates.isPaused ? 1 : 0);
  }

  if (sets.length === 0) return existing;

  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  const stmt = db.prepare(`
    UPDATE agent_pools SET ${sets.join(', ')} WHERE id = ?
  `);

  stmt.run(...params);
  return getPoolById(id);
}

export function deletePool(id: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM agent_pools WHERE id = ?');
  const result = stmt.run(id);
  return (result.changes as number) > 0;
}

export function getActiveAgentCount(poolId: string): number {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM agent_instances 
    WHERE pool_id = ? AND status = 'running'
  `);
  const row = stmt.get(poolId);
  return (row as { count: number }).count;
}

export function getPoolWithStats(poolId: string): (AgentPool & { activeCount: number; totalTasks: number }) | null {
  const pool = getPoolById(poolId);
  if (!pool) return null;

  const db = getDb();
  
  const activeStmt = db.prepare(`
    SELECT COUNT(*) as count FROM agent_instances 
    WHERE pool_id = ? AND status = 'running'
  `);
  const activeRow = activeStmt.get(poolId);

  const totalStmt = db.prepare(`
    SELECT COUNT(*) as count FROM tasks WHERE pool_id = ?
  `);
  const totalRow = totalStmt.get(poolId);

  return {
    ...pool,
    activeCount: (activeRow as { count: number }).count,
    totalTasks: (totalRow as { count: number }).count
  };
}

export function pausePool(id: string): AgentPool | null {
  return updatePool(id, { isPaused: true });
}

export function resumePool(id: string): AgentPool | null {
  return updatePool(id, { isPaused: false });
}

function mapRowToPool(row: Record<string, unknown>): AgentPool {
  return {
    id: row.id as string,
    name: row.name as string,
    icon: row.icon as string,
    defaultModel: row.default_model as string | null,
    maxParallel: row.max_parallel as number,
    costLimit: row.cost_limit as number | null,
    autoAccept: Boolean(row.auto_accept),
    timeoutMinutes: row.timeout_minutes as number,
    retryCount: row.retry_count as number,
    notificationMode: row.notification_mode as 'browser' | 'telegram' | 'both' | 'none',
    isPaused: Boolean(row.is_paused),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}