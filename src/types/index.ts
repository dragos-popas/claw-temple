// ============================================================================
// CLAW-TEMPLE - Core Types
// ============================================================================

export interface Task {
  id: string;
  title: string;
  description: string;
  repoUrl: string;
  templateId?: string;
  poolId?: string;
  model?: string;
  status: TaskStatus;
  priority: number;
  costEstimate?: number;
  actualCost?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
  assignedTo?: string;
  soulId?: string;
  type?: 'scraping' | 'general';
  language?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  agentName?: string;
  content: string;
  type: 'comment' | 'update' | 'finding' | 'error' | 'completion';
  createdAt: string;
}

export type TaskStatus = 'TODO' | 'RESEARCH' | 'DEV' | 'QA' | 'DONE';

export interface TaskCreateInput {
  title: string;
  description?: string;
  repoUrl?: string;
  templateId?: string;
  poolId?: string;
  model?: string;
  priority?: number;
  metadata?: Record<string, unknown>;
  type?: 'scraping' | 'general';
  language?: string;
}

export interface AgentPool {
  id: string;
  name: string;
  icon: string;
  defaultModel?: string;
  maxParallel: number;
  costLimit?: number;
  autoAccept: boolean;
  timeoutMinutes: number;
  retryCount: number;
  notificationMode: 'browser' | 'telegram' | 'both' | 'none';
  isPaused: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentPoolCreateInput {
  name: string;
  icon?: string;
  defaultModel?: string;
  maxParallel?: number;
  costLimit?: number;
  autoAccept?: boolean;
  timeoutMinutes?: number;
  retryCount?: number;
  notificationMode?: 'browser' | 'telegram' | 'both' | 'none';
}

export interface AgentInstance {
  id: string;
  taskId: string;
  poolId: string;
  sessionKey?: string;
  status: AgentStatus;
  startedAt: string;
  completedAt?: string;
  cost?: number;
  output?: string;
  error?: string;
}

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

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

export interface AnalyticsEvent {
  id: string;
  eventType: string;
  eventData?: Record<string, unknown>;
  cost?: number;
  timestamp: string;
}

export interface SpendMetrics {
  daily: { date: string; amount: number }[];
  weekly: { week: string; amount: number }[];
  monthly: { month: string; amount: number }[];
  total: number;
}

export interface ProductivityMetrics {
  tasksCompleted: number;
  avgCycleTimeMinutes: number;
  byPool: { poolId: string; completed: number; avgTime: number }[];
}

export interface ModelUsage {
  model: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface QueueMetrics {
  TODO: number;
  RESEARCH: number;
  DEV: number;
  QA: number;
  DONE: number;
}

export interface Config {
  defaultRepo: string;
  columnLimits: Record<TaskStatus, number>;
  notificationSettings: {
    browser: boolean;
    telegram: boolean;
  };
  theme: 'dark' | 'light';
}

export interface Worktree {
  id: string;
  taskId: string;
  path: string;
  branch: string;
  status: 'active' | 'cleaned';
  createdAt: string;
  cleanedAt?: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: number;
    completion: number;
  };
  contextLength: number;
}

export interface NotificationPayload {
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
  taskId?: string;
}