import { useState, useEffect, useCallback } from 'react';
import { AgentPool } from '../types';
import { api } from '../services/api';

export function useAgents() {
  const [pools, setPools] = useState<AgentPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getPools();
      setPools(response);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPool = useCallback(async (pool: Partial<AgentPool>) => {
    try {
      const newPool = await api.createPool(pool);
      setPools(prev => [...prev, newPool]);
      return newPool;
    } catch (err) {
      throw err;
    }
  }, []);

  const updatePool = useCallback(async (id: string, updates: Partial<AgentPool>) => {
    try {
      const updatedPool = await api.updatePool(id, updates);
      setPools(prev => prev.map(p => p.id === id ? updatedPool : p));
      return updatedPool;
    } catch (err) {
      throw err;
    }
  }, []);

  const pausePool = useCallback(async (id: string) => {
    try {
      const updatedPool = await api.pausePool(id);
      setPools(prev => prev.map(p => p.id === id ? updatedPool : p));
      return updatedPool;
    } catch (err) {
      throw err;
    }
  }, []);

  const resumePool = useCallback(async (id: string) => {
    try {
      const updatedPool = await api.resumePool(id);
      setPools(prev => prev.map(p => p.id === id ? updatedPool : p));
      return updatedPool;
    } catch (err) {
      throw err;
    }
  }, []);

  const deletePool = useCallback(async (id: string) => {
    try {
      await api.deletePool(id);
      setPools(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  return {
    pools,
    loading,
    error,
    refreshPools: fetchPools,
    createPool,
    updatePool,
    pausePool,
    resumePool,
    deletePool
  };
}