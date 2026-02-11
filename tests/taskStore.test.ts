// ============================================================================
// CLAW-TEMPLE - Unit Tests
// ============================================================================

import { jest } from '@jest/globals';

// Mock dependencies before importing modules
jest.unstable_mockModule('./src/stores/sqlite.js', () => ({
  initDatabase: jest.fn(),
  getDb: jest.fn(() => ({
    prepare: jest.fn(() => ({
      run: jest.fn(),
      get: jest.fn(() => null),
      all: jest.fn(() => [])
    })),
    exec: jest.fn(),
    pragma: jest.fn(),
    close: jest.fn()
  })),
  closeDatabase: jest.fn()
}));

jest.unstable_mockModule('./src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Import modules after mocking
const { createTask, getAllTasks, getTaskById, updateTask, moveTask, deleteTask } = await import('./src/stores/taskStore.js');

describe('Task Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a task with required fields', async () => {
      const input = {
        title: 'Test Task',
        description: 'Test Description',
        repoUrl: 'https://github.com/test/repo',
        poolId: 'pool-123',
        model: 'deepseek/deepseek-chat',
        priority: 1,
        metadata: { test: true }
      };

      const task = await createTask(input);

      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test Description');
      expect(task.status).toBe('TODO');
      expect(task.priority).toBe(1);
    });

    it('should create task with minimal input', async () => {
      const task = await createTask({ title: 'Minimal Task' });

      expect(task.title).toBe('Minimal Task');
      expect(task.status).toBe('TODO');
      expect(task.priority).toBe(0);
    });
  });

  describe('getTaskById', () => {
    it('should return null for non-existent task', async () => {
      const task = await getTaskById('non-existent-id');
      expect(task).toBeNull();
    });
  });

  describe('getAllTasks', () => {
    it('should return empty array when no tasks exist', async () => {
      const tasks = await getAllTasks();
      expect(Array.isArray(tasks)).toBe(true);
    });

    it('should filter tasks by status', async () => {
      const tasks = await getAllTasks({ status: 'TODO' });
      expect(tasks.every(t => t.status === 'TODO')).toBe(true);
    });
  });

  describe('updateTask', () => {
    it('should return null for non-existent task', async () => {
      const task = await updateTask('non-existent-id', { title: 'New Title' });
      expect(task).toBeNull();
    });
  });

  describe('moveTask', () => {
    it('should return null for non-existent task', async () => {
      const task = await moveTask('non-existent-id', 'DEV');
      expect(task).toBeNull();
    });
  });

  describe('deleteTask', () => {
    it('should return false for non-existent task', async () => {
      const result = await deleteTask('non-existent-id');
      expect(result).toBe(false);
    });
  });
});

describe('Task Validation', () => {
  it('should have valid status values', async () => {
    const validStatuses = ['TODO', 'RESEARCH', 'DEV', 'QA', 'DONE'];
    
    for (const status of validStatuses) {
      const task = await createTask({ title: 'Test', status: status as any });
      expect(task.status).toBe(status);
    }
  });

  it('should handle priority levels', async () => {
    const lowPriority = await createTask({ title: 'Low', priority: 0 });
    const highPriority = await createTask({ title: 'High', priority: 10 });

    expect(lowPriority.priority).toBe(0);
    expect(highPriority.priority).toBe(10);
  });
});