export interface Task {
  id: string;
  title: string;
  description?: string | null;
  repoUrl?: string | null;
  templateId?: string | null;
  poolId?: string | null;
  model?: string | null;
  status: TaskStatus;
  priority: number;
  costEstimate?: number | null;
  actualCost?: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  metadata?: Record<string, unknown>;
  assignedTo?: string;
  soulId?: string;
  type?: 'scraping' | 'general';
  language?: string;
}

export type TaskStatus = 'TODO' | 'RESEARCH' | 'DEV' | 'QA' | 'DONE';

export interface TaskComment {
  id: string;
  taskId: string;
  agentName?: string;
  content: string;
  type: 'comment' | 'update' | 'finding' | 'error' | 'completion';
  createdAt: string;
}

export interface AgentPool {
  id: string;
  name: string;
  icon: string;
  defaultModel?: string | null;
  maxParallel: number;
  costLimit?: number | null;
  autoAccept: boolean;
  timeoutMinutes: number;
  retryCount: number;
  notificationMode: 'browser' | 'telegram' | 'both' | 'none';
  isPaused: boolean;
  createdAt: string;
  updatedAt: string;
  activeCount?: number;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  config: TemplateConfig;
  createdAt: string;
}

export interface TemplateConfig {
  columns: TaskStatus[];
  defaults: {
    poolId?: string;
    model?: string;
  };
  autoAdvance: boolean;
}

export interface NotificationPayload {
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
  taskId?: string;
}