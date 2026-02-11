/**
 * Task Queue Service - Dragonfly Implementation
 * 
 * Provides Redis-compatible queue operations for CLAW-TEMPLE
 * using Dragonfly (multi-threaded Redis alternative)
 */

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

// Dragonfly connection
const redis = new Redis({
  host: process.env.DRAGONFLY_HOST || 'localhost',
  port: parseInt(process.env.DRAGONFLY_PORT || '6379'),
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  }
});

// Queue keys
const QUEUE_KEYS = {
  PENDING: 'task:pending',
  PROCESSING: 'task:processing',
  COMPLETED: 'task:completed',
  FAILED: 'task:failed',
  PAUSED: 'queue:paused'
};

/**
 * Add a task to the pending queue
 * @param {Object} task - Task object
 * @returns {Promise<string>} - Task ID
 */
export async function enqueueTask(task) {
  const taskId = task.id || uuidv4();
  const taskData = {
    ...task,
    id: taskId,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Store task data in hash
  await redis.hset(`task:data:${taskId}`, 'data', JSON.stringify(taskData));
  
  // Add to pending queue (sorted by priority, then timestamp)
  const score = Date.now() + (task.priority || 0) * 1000000;
  await redis.zadd(QUEUE_KEYS.PENDING, score, taskId);

  console.log(`[Queue] Task ${taskId} enqueued with priority ${task.priority || 0}`);
  return taskId;
}

/**
 * Get next task from pending queue
 * @returns {Promise<Object|null>} - Task object or null if empty
 */
export async function dequeueTask() {
  // Check if queue is paused
  const isPaused = await redis.get(QUEUE_KEYS.PAUSED);
  if (isPaused === 'true') {
    console.log('[Queue] Queue is paused, skipping dequeue');
    return null;
  }

  // Get highest priority task (lowest score)
  const result = await redis.zpopmin(QUEUE_KEYS.PENDING, 1);
  if (!result || result.length === 0) {
    return null;
  }

  const taskId = result[0];
  
  // Get task data
  const taskData = await redis.hget(`task:data:${taskId}`, 'data');
  if (!taskData) {
    console.error(`[Queue] Task ${taskId} data not found`);
    return null;
  }

  const task = JSON.parse(taskData);
  
  // Move to processing
  await redis.zadd(QUEUE_KEYS.PROCESSING, Date.now(), taskId);
  task.status = 'PROCESSING';
  task.startedAt = new Date().toISOString();
  await redis.hset(`task:data:${taskId}`, 'data', JSON.stringify(task));

  console.log(`[Queue] Task ${taskId} dequeued and moved to processing`);
  return task;
}

/**
 * Mark task as completed
 * @param {string} taskId - Task ID
 * @param {Object} result - Task result
 */
export async function completeTask(taskId, result) {
  // Remove from processing
  await redis.zrem(QUEUE_KEYS.PROCESSING, taskId);
  
  // Update task data
  const taskData = await redis.hget(`task:data:${taskId}`, 'data');
  if (taskData) {
    const task = JSON.parse(taskData);
    task.status = 'COMPLETED';
    task.completedAt = new Date().toISOString();
    task.result = result;
    await redis.hset(`task:data:${taskId}`, 'data', JSON.stringify(task));
  }

  // Add to completed queue
  await redis.zadd(QUEUE_KEYS.COMPLETED, Date.now(), taskId);
  
  // Set TTL for completed tasks (keep for 7 days)
  await redis.expire(`task:data:${taskId}`, 7 * 24 * 60 * 60);

  console.log(`[Queue] Task ${taskId} marked as completed`);
}

/**
 * Mark task as failed
 * @param {string} taskId - Task ID
 * @param {string} error - Error message
 * @param {boolean} canRetry - Whether task can be retried
 */
export async function failTask(taskId, error, canRetry = true) {
  // Remove from processing
  await redis.zrem(QUEUE_KEYS.PROCESSING, taskId);
  
  // Update task data
  const taskData = await redis.hget(`task:data:${taskId}`, 'data');
  if (taskData) {
    const task = JSON.parse(taskData);
    task.status = 'FAILED';
    task.failedAt = new Date().toISOString();
    task.error = error;
    task.retryCount = (task.retryCount || 0) + 1;
    
    if (canRetry && task.retryCount < 3) {
      // Requeue for retry with backoff
      const backoffMs = Math.pow(2, task.retryCount) * 1000;
      const score = Date.now() + backoffMs;
      await redis.zadd(QUEUE_KEYS.PENDING, score, taskId);
      task.status = 'PENDING';
      console.log(`[Queue] Task ${taskId} requeued for retry (attempt ${task.retryCount})`);
    } else {
      // Move to failed queue
      await redis.zadd(QUEUE_KEYS.FAILED, Date.now(), taskId);
      console.log(`[Queue] Task ${taskId} moved to failed queue`);
    }
    
    await redis.hset(`task:data:${taskId}`, 'data', JSON.stringify(task));
  }
}

/**
 * Get queue statistics
 * @returns {Promise<Object>} - Queue stats
 */
export async function getQueueStats() {
  const [pending, processing, completed, failed, isPaused] = await Promise.all([
    redis.zcard(QUEUE_KEYS.PENDING),
    redis.zcard(QUEUE_KEYS.PROCESSING),
    redis.zcard(QUEUE_KEYS.COMPLETED),
    redis.zcard(QUEUE_KEYS.FAILED),
    redis.get(QUEUE_KEYS.PAUSED)
  ]);

  return {
    pending,
    processing,
    completed,
    failed,
    isPaused: isPaused === 'true'
  };
}

/**
 * Pause queue processing
 */
export async function pauseQueue() {
  await redis.set(QUEUE_KEYS.PAUSED, 'true');
  console.log('[Queue] Queue processing paused');
}

/**
 * Resume queue processing
 */
export async function resumeQueue() {
  await redis.set(QUEUE_KEYS.PAUSED, 'false');
  console.log('[Queue] Queue processing resumed');
}

/**
 * Retry a failed task
 * @param {string} taskId - Task ID to retry
 */
export async function retryTask(taskId) {
  // Remove from failed
  await redis.zrem(QUEUE_KEYS.FAILED, taskId);
  
  // Get task data
  const taskData = await redis.hget(`task:data:${taskId}`, 'data');
  if (taskData) {
    const task = JSON.parse(taskData);
    task.status = 'PENDING';
    task.retryCount = 0;
    task.error = null;
    task.failedAt = null;
    await redis.hset(`task:data:${taskId}`, 'data', JSON.stringify(task));
    
    // Add to pending queue
    const score = Date.now() + (task.priority || 0) * 1000000;
    await redis.zadd(QUEUE_KEYS.PENDING, score, taskId);
    
    console.log(`[Queue] Task ${taskId} manually retried`);
    return true;
  }
  return false;
}

/**
 * Get task by ID
 * @param {string} taskId - Task ID
 * @returns {Promise<Object|null>} - Task object or null
 */
export async function getTask(taskId) {
  const taskData = await redis.hget(`task:data:${taskId}`, 'data');
  if (taskData) {
    return JSON.parse(taskData);
  }
  return null;
}

/**
 * List tasks in a queue
 * @param {string} queueType - 'pending', 'processing', 'completed', 'failed'
 * @param {number} limit - Max number of tasks to return
 * @returns {Promise<Array>} - Array of task objects
 */
export async function listTasks(queueType, limit = 100) {
  const key = QUEUE_KEYS[queueType.toUpperCase()];
  if (!key) {
    throw new Error(`Unknown queue type: ${queueType}`);
  }

  const taskIds = await redis.zrange(key, 0, limit - 1);
  const tasks = [];

  for (const taskId of taskIds) {
    const taskData = await redis.hget(`task:data:${taskId}`, 'data');
    if (taskData) {
      tasks.push(JSON.parse(taskData));
    }
  }

  return tasks;
}

/**
 * Close Redis connection
 */
export async function closeQueue() {
  await redis.quit();
  console.log('[Queue] Connection closed');
}

export default {
  enqueueTask,
  dequeueTask,
  completeTask,
  failTask,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  retryTask,
  getTask,
  listTasks,
  closeQueue
};
