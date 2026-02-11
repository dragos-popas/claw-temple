// ============================================================================
// CLAW-TEMPLE - Worktree Service (Placeholder)
// ============================================================================

import { logger } from '../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export class WorktreeService {
  private basePath: string;

  constructor(basePath: string = './worktrees') {
    this.basePath = basePath;
  }

  async createWorktree(taskId: string, repoUrl: string, baseBranch: string = 'main'): Promise<string> {
    const branchName = `ns/task-${taskId.slice(0, 8)}`;
    const worktreePath = path.join(this.basePath, branchName);

    try {
      // Clone or create worktree
      await execAsync(`git worktree add ${worktreePath} ${baseBranch}`);
      logger.info('Worktree created', { taskId, path: worktreePath });

      return worktreePath;
    } catch (error) {
      logger.error('Failed to create worktree', { taskId, error: (error as Error).message });
      throw error;
    }
  }

  async removeWorktree(worktreePath: string): Promise<void> {
    try {
      await execAsync(`git worktree remove ${worktreePath} --force`);
      logger.info('Worktree removed', { path: worktreePath });
    } catch (error) {
      logger.error('Failed to remove worktree', { path: worktreePath, error: (error as Error).message });
      throw error;
    }
  }

  async cleanupOrphanWorktrees(): Promise<number> {
    let cleaned = 0;

    try {
      // List all worktrees
      const { stdout } = await execAsync('git worktree list --porcelain');
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        const match = line.match(/worktree (.+)/);
        if (match) {
          const worktreePath = match[1];
          try {
            // Check if directory exists
            await execAsync(`test -d ${worktreePath}`);
          } catch {
            // Directory doesn't exist, remove from worktree list
            await execAsync(`git worktree remove ${worktreePath} --force --ignore-remote`);
            cleaned++;
          }
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup orphan worktrees', { error: (error as Error).message });
    }

    return cleaned;
  }

  async getWorktreeStatus(worktreePath: string): Promise<{
    exists: boolean;
    branch: string;
    commitsAhead: number;
  }> {
    try {
      const { stdout } = await execAsync(`cd ${worktreePath} && git status --porcelain`);

      const branchResult = await execAsync(`cd ${worktreePath} && git rev-parse --abbrev-ref HEAD`);
      const branch = branchResult.stdout.trim();

      return {
        exists: true,
        branch,
        commitsAhead: 0 // TODO: Calculate properly
      };
    } catch (error) {
      return {
        exists: false,
        branch: '',
        commitsAhead: 0
      };
    }
  }
}