// ============================================================================
// CLAW-TEMPLE - Orchestrator Service (Placeholder)
// ============================================================================

import { logger } from '../utils/logger.js';
import { Task, TaskStatus } from '../types/index.js';
import { getAllTasks, moveTask, updateTask } from '../stores/taskStore.js';
import { getPoolById, getActiveAgentCount } from '../stores/agentStore.js';

export class OrchestratorService {
  private isRunning = false;

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Orchestrator already running');
      return;
    }

    this.isRunning = true;
    logger.info('Orchestrator started');

    // Start the main loop
    this.runLoop();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    logger.info('Orchestrator stopped');
  }

  private async runLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processQueues();
      } catch (error) {
        logger.error('Orchestrator loop error', { error: (error as Error).message });
      }

      // Wait 5 seconds before next iteration
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  private async processQueues(): Promise<void> {
    // Check each column and dispatch agents if capacity allows
    const columns: TaskStatus[] = ['RESEARCH', 'DEV', 'QA'];

    for (const column of columns) {
      const tasks = getAllTasks({ status: column });

      for (const task of tasks) {
        if (task.poolId) {
          const pool = getPoolById(task.poolId);
          if (pool && !pool.isPaused) {
            const activeCount = getActiveAgentCount(pool.id);
            if (activeCount < pool.maxParallel) {
              // Dispatch agent for this task
              await this.dispatchAgent(task);
            }
          }
        }
      }
    }
  }

  private async dispatchAgent(task: Task): Promise<void> {
    logger.info('Dispatching agent for task', { taskId: task.id, title: task.title });
    // TODO: Implement agent dispatching via OpenClaw sessions_spawn
  }

  async advanceTask(taskId: string): Promise<void> {
    const task = getAllTasks().find(t => t.id === taskId);
    if (!task) return;

    const flow: Record<TaskStatus, TaskStatus> = {
      TODO: 'RESEARCH',
      RESEARCH: 'DEV',
      DEV: 'QA',
      QA: 'DONE',
      DONE: 'DONE'
    };

    const nextStatus = flow[task.status];
    if (nextStatus !== task.status) {
      moveTask(taskId, nextStatus);
      logger.info('Task advanced', { taskId, from: task.status, to: nextStatus });
    }
  }
}

export const orchestratorService = new OrchestratorService();