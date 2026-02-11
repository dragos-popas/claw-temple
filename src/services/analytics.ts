// ============================================================================
// CLAW-TEMPLE - Analytics Service
// ============================================================================

import { getDb } from '../stores/sqlite.js';
import { SpendMetrics, ProductivityMetrics, ModelUsage, QueueMetrics } from '../types/index.js';
import { logger } from '../utils/logger.js';

export async function getSpendMetrics(period: 'daily' | 'weekly' | 'monthly'): Promise<SpendMetrics> {
  const db = getDb();
  
  let dateFormat: string;
  let groupBy: string;

  switch (period) {
    case 'daily':
      dateFormat = '%Y-%m-%d';
      groupBy = "DATE(timestamp)";
      break;
    case 'weekly':
      dateFormat = '%Y-W%W';
      groupBy = "strftime('%Y-W%W', timestamp)";
      break;
    case 'monthly':
      dateFormat = '%Y-%m';
      groupBy = "DATE(timestamp, 'start of month')";
      break;
    default:
      dateFormat = '%Y-%m-%d';
      groupBy = "DATE(timestamp)";
  }

  try {
    // Get total spend
    const totalStmt = db.prepare(`
      SELECT COALESCE(SUM(cost), 0) as total 
      FROM analytics_events 
      WHERE event_type = 'model_usage'
    `);
    const totalRow = totalStmt.get() as { total: number };

    // Get daily/weekly/monthly breakdown
    const breakdownStmt = db.prepare(`
      SELECT 
        ${period === 'daily' ? "DATE(timestamp)" : 
          period === 'weekly' ? "strftime('%Y-W%W', timestamp)" : 
          "DATE(timestamp, 'start of month')"} as period,
        COALESCE(SUM(cost), 0) as amount
      FROM analytics_events 
      WHERE event_type = 'model_usage'
      GROUP BY period
      ORDER BY period DESC
      LIMIT 30
    `);
    const breakdown = breakdownStmt.all();

    const data = breakdown.map((row: { period: string; amount: number }) => ({
      date: row.period,
      amount: row.amount
    }));

    return {
      daily: data,
      weekly: data,
      monthly: data,
      total: totalRow.total
    };
  } catch (error) {
    logger.error('Failed to get spend metrics', { error: (error as Error).message });
    return { daily: [], weekly: [], monthly: [], total: 0 };
  }
}

export async function getProductivityMetrics(): Promise<ProductivityMetrics> {
  const db = getDb();

  try {
    // Tasks completed
    const completedStmt = db.prepare(`
      SELECT COUNT(*) as count FROM tasks WHERE status = 'DONE'
    `);
    const completedRow = completedStmt.get() as { count: number };

    // Average cycle time
    const cycleTimeStmt = db.prepare(`
      SELECT 
        AVG(
          CASE 
            WHEN completed_at IS NOT NULL AND created_at IS NOT NULL
            THEN (julianday(completed_at) - julianday(created_at)) * 24 * 60
            ELSE NULL
          END
        ) as avg_minutes
      FROM tasks 
      WHERE status = 'DONE' AND completed_at IS NOT NULL
    `);
    const cycleTimeRow = cycleTimeStmt.get() as { avg_minutes: number | null };

    // By pool
    const byPoolStmt = db.prepare(`
      SELECT 
        pool_id,
        COUNT(*) as completed,
        AVG(
          CASE 
            WHEN completed_at IS NOT NULL AND created_at IS NOT NULL
            THEN (julianday(completed_at) - julianday(created_at)) * 24 * 60
            ELSE NULL
          END
        ) as avg_time
      FROM tasks 
      WHERE status = 'DONE' AND completed_at IS NOT NULL
      GROUP BY pool_id
    `);
    const byPool = byPoolStmt.all();

    return {
      tasksCompleted: completedRow.count,
      avgCycleTimeMinutes: cycleTimeRow.avg_minutes || 0,
      byPool: (byPool as Array<{ pool_id: string; completed: number; avg_time: number | null }>).map(row => ({
        poolId: row.pool_id || 'unknown',
        completed: row.completed,
        avgTime: row.avg_time || 0
      }))
    };
  } catch (error) {
    logger.error('Failed to get productivity metrics', { error: (error as Error).message });
    return { tasksCompleted: 0, avgCycleTimeMinutes: 0, byPool: [] };
  }
}

export async function getModelUsage(): Promise<ModelUsage[]> {
  const db = getDb();

  try {
    const stmt = db.prepare(`
      SELECT 
        event_data,
        SUM(cost) as cost
      FROM analytics_events 
      WHERE event_type = 'model_usage'
      GROUP BY event_data
      LIMIT 50
    `);
    const rows = stmt.all();

    return (rows as Array<{ event_data: string; cost: number }>).map(row => {
      try {
        const data = JSON.parse(row.event_data);
        return {
          model: data.model || 'unknown',
          requests: 1,
          inputTokens: data.inputTokens || 0,
          outputTokens: data.outputTokens || 0,
          cost: row.cost
        };
      } catch {
        return {
          model: 'unknown',
          requests: 1,
          inputTokens: 0,
          outputTokens: 0,
          cost: row.cost
        };
      }
    });
  } catch (error) {
    logger.error('Failed to get model usage', { error: (error as Error).message });
    return [];
  }
}

export async function getQueueMetrics(): Promise<QueueMetrics> {
  const db = getDb();

  try {
    const stmt = db.prepare(`
      SELECT status, COUNT(*) as count FROM tasks GROUP BY status
    `);
    const rows = stmt.all();

    const metrics: QueueMetrics = {
      TODO: 0,
      RESEARCH: 0,
      DEV: 0,
      QA: 0,
      DONE: 0
    };

    for (const row of rows) {
      const status = row.status as keyof QueueMetrics;
      if (status in metrics) {
        metrics[status] = row.count;
      }
    }

    return metrics;
  } catch (error) {
    logger.error('Failed to get queue metrics', { error: (error as Error).message });
    return { TODO: 0, RESEARCH: 0, DEV: 0, QA: 0, DONE: 0 };
  }
}

export function recordAnalyticsEvent(
  eventType: string,
  eventData?: Record<string, unknown>,
  cost?: number
): void {
  const db = getDb();
  const id = crypto.randomUUID();

  const stmt = db.prepare(`
    INSERT INTO analytics_events (id, event_type, event_data, cost)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(id, eventType, eventData ? JSON.stringify(eventData) : null, cost || null);
}