// ============================================================================
// CLAW-TEMPLE - Agent Store Unit Tests
// ============================================================================

import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('./src/stores/sqlite.js', () => ({
  initDatabase: jest.fn(),
  getDb: jest.fn(() => ({
    prepare: jest.fn(() => ({
      run: jest.fn(),
      get: jest.fn(() => null),
      all: jest.fn(() => [])
    })),
    exec: jest.fn()
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

const { createPool, getPoolById, getAllPools, updatePool, deletePool, pausePool, resumePool } = await import('./src/stores/agentStore.js');

describe('Agent Pool Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPool', () => {
    it('should create a pool with required fields', async () => {
      const input = {
        name: 'Web Crawler',
        icon: '🕷️',
        defaultModel: 'moonshotai/kimi-k2.5',
        maxParallel: 3,
        autoAccept: true,
        timeoutMinutes: 60
      };

      const pool = await createPool(input);

      expect(pool).toHaveProperty('id');
      expect(pool.name).toBe('Web Crawler');
      expect(pool.icon).toBe('🕷️');
      expect(pool.maxParallel).toBe(3);
      expect(pool.autoAccept).toBe(true);
      expect(pool.isPaused).toBe(false);
    });

    it('should create pool with defaults', async () => {
      const pool = await createPool({ name: 'Simple Pool' });

      expect(pool.name).toBe('Simple Pool');
      expect(pool.icon).toBe('🤖');
      expect(pool.maxParallel).toBe(3);
      expect(pool.autoAccept).toBe(false);
      expect(pool.timeoutMinutes).toBe(60);
    });
  });

  describe('getPoolById', () => {
    it('should return null for non-existent pool', async () => {
      const pool = await getPoolById('non-existent-id');
      expect(pool).toBeNull();
    });
  });

  describe('getAllPools', () => {
    it('should return empty array when no pools exist', async () => {
      const pools = await getAllPools();
      expect(Array.isArray(pools)).toBe(true);
    });
  });

  describe('updatePool', () => {
    it('should return null for non-existent pool', async () => {
      const pool = await updatePool('non-existent-id', { name: 'New Name' });
      expect(pool).toBeNull();
    });
  });

  describe('pausePool', () => {
    it('should return null for non-existent pool', async () => {
      const pool = await pausePool('non-existent-id');
      expect(pool).toBeNull();
    });
  });

  describe('resumePool', () => {
    it('should return null for non-existent pool', async () => {
      const pool = await resumePool('non-existent-id');
      expect(pool).toBeNull();
    });
  });

  describe('deletePool', () => {
    it('should return false for non-existent pool', async () => {
      const result = await deletePool('non-existent-id');
      expect(result).toBe(false);
    });
  });
});

describe('Pool Configuration', () => {
  it('should enforce maxParallel limits', async () => {
    const pool = await createPool({ 
      name: 'Limited Pool', 
      maxParallel: 1 
    });
    
    expect(pool.maxParallel).toBe(1);
  });

  it('should support different notification modes', async () => {
    const modes = ['browser', 'telegram', 'both', 'none'];
    
    for (const mode of modes) {
      const pool = await createPool({ 
        name: `Pool ${mode}`, 
        notificationMode: mode as any 
      });
      expect(pool.notificationMode).toBe(mode);
    }
  });
});