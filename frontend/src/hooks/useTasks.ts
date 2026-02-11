import { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus } from '../types';
import { api } from '../services/api';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getTasks();
      setTasks(response);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(async (task: Partial<Task>) => {
    try {
      const newTask = await api.createTask(task);
      setTasks(prev => [...prev, newTask]);
      return newTask;
    } catch (err) {
      throw err;
    }
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    try {
      const updatedTask = await api.updateTask(id, updates);
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
      return updatedTask;
    } catch (err) {
      throw err;
    }
  }, []);

  const moveTask = useCallback(async (id: string, status: TaskStatus) => {
    try {
      const updatedTask = await api.moveTask(id, status);
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
      return updatedTask;
    } catch (err) {
      throw err;
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    refreshTasks: fetchTasks,
    createTask,
    updateTask,
    moveTask,
    deleteTask
  };
}