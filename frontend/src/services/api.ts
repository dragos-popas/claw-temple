import axios, { AxiosInstance } from 'axios';
import { Task, TaskStatus, AgentPool, TaskComment } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Tasks
  async getTasks(filter?: { status?: TaskStatus; poolId?: string }): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filter?.status) params.append('status', filter.status);
    if (filter?.poolId) params.append('poolId', filter.poolId);
    
    const { data } = await this.client.get(`/tasks?${params.toString()}`);
    return data;
  }

  async getTaskById(id: string): Promise<Task> {
    const { data } = await this.client.get(`/tasks/${id}`);
    return data;
  }

  async createTask(task: Partial<Task>): Promise<Task> {
    const { data } = await this.client.post('/tasks', task);
    return data;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const { data } = await this.client.put(`/tasks/${id}`, updates);
    return data;
  }

  async moveTask(id: string, status: TaskStatus): Promise<Task> {
    const { data } = await this.client.post(`/tasks/${id}/move`, { status });
    return data;
  }

  async deleteTask(id: string): Promise<void> {
    await this.client.delete(`/tasks/${id}`);
  }

  async getTaskCounts(): Promise<Record<TaskStatus, number>> {
    const { data } = await this.client.get('/tasks/counts');
    return data;
  }

  async getTaskComments(taskId: string): Promise<TaskComment[]> {
    const { data } = await this.client.get(`/tasks/${taskId}/comments`);
    return data;
  }

  async addTaskComment(taskId: string, comment: { agentName?: string; content: string; type?: string }): Promise<TaskComment> {
    const { data } = await this.client.post(`/tasks/${taskId}/comments`, comment);
    return data;
  }

  // Agents
  async getPools(): Promise<AgentPool[]> {
    const { data } = await this.client.get('/agents/pools');
    return data;
  }

  async getPoolById(id: string): Promise<AgentPool> {
    const { data } = await this.client.get(`/agents/pools/${id}`);
    return data;
  }

  async createPool(pool: Partial<AgentPool>): Promise<AgentPool> {
    const { data } = await this.client.post('/agents/pools', pool);
    return data;
  }

  async updatePool(id: string, updates: Partial<AgentPool>): Promise<AgentPool> {
    const { data } = await this.client.put(`/agents/pools/${id}`, updates);
    return data;
  }

  async pausePool(id: string): Promise<AgentPool> {
    const { data } = await this.client.post(`/agents/pools/${id}/pause`);
    return data;
  }

  async resumePool(id: string): Promise<AgentPool> {
    const { data } = await this.client.post(`/agents/pools/${id}/resume`);
    return data;
  }

  async deletePool(id: string): Promise<void> {
    await this.client.delete(`/agents/pools/${id}`);
  }

  // Models
  async getModels(): Promise<Array<{ id: string; name: string; pricing: { prompt: number; completion: number } }>> {
    const { data } = await this.client.get('/models');
    return data;
  }

  // Templates
  async getTemplates(): Promise<any[]> {
    const { data } = await this.client.get('/templates');
    return data;
  }

  // Config
  async getConfig(): Promise<Record<string, unknown>> {
    const { data } = await this.client.get('/config');
    return data;
  }

  async updateConfig(key: string, value: unknown): Promise<void> {
    await this.client.put('/config', { key, value });
  }

  // Analytics
  async getDashboard(): Promise<any> {
    const { data } = await this.client.get('/analytics/dashboard');
    return data;
  }

  async getSpendMetrics(period: 'daily' | 'weekly' | 'monthly'): Promise<any> {
    const { data } = await this.client.get(`/analytics/spend?period=${period}`);
    return data;
  }

  // Worktrees
  async createWorktree(taskId: string, repoUrl: string): Promise<any> {
    const { data } = await this.client.post('/worktrees', { taskId, repoUrl });
    return data;
  }

  async cleanupWorktree(id: string): Promise<void> {
    await this.client.delete(`/worktrees/${id}`);
  }

  // Health
  async healthCheck(): Promise<{ status: string; version: string }> {
    const { data } = await this.client.get('/health');
    return data;
  }
}

export const api = new ApiService();