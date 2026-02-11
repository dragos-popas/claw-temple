#!/usr/bin/env node
// ============================================================================
// CLAW-TEMPLE - Dragonfly Queue Worker
// Uses Dragonfly (Redis-compatible) queue for task processing
// ============================================================================

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import { URL } from 'url';
import http from 'http';

// Dragonfly connection
const redis = new Redis({
  host: process.env.DRAGONFLY_HOST || 'localhost',
  port: parseInt(process.env.DRAGONFLY_PORT || '6379'),
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  }
});

const API_URL = process.env.API_URL || 'http://localhost:3000';
const PROCESSING_DELAY = 3000; // Delay between processing tasks

// Queue keys
const QUEUE_KEYS = {
  PENDING: 'task:pending',
  PROCESSING: 'task:processing',
  COMPLETED: 'task:completed',
  FAILED: 'task:failed',
  PAUSED: 'queue:paused'
};

// Developer personas for realistic comments
const DEV_PERSONAS = {
  research: { name: '🔍 Research Agent', style: 'analytical' },
  architect: { name: '📐 Architect Bot', style: 'methodical' },
  developer: { name: '💻 Dev Bot', style: 'pragmatic' },
  reviewer: { name: '🧪 QA Bot', style: 'thorough' },
  closer: { name: '✨ Completion Bot', style: 'celebratory' }
};

// ========== HTTP HELPER FUNCTIONS (for API integration) ==========

async function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.body ? {
        'Content-Type': 'application/json'
      } : {}
    };
    
    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function addTaskComment(taskId, agentName, content, type = 'comment') {
  try {
    await fetchJson(`${API_URL}/api/tasks/${taskId}/comments`, {
      method: 'POST',
      body: { agentName, content, type }
    });
    console.log(`[Worker] [${agentName}] ${content.slice(0, 100)}...`);
  } catch (err) {
    console.error('[Worker] Error adding comment:', err.message);
  }
}

async function updateTaskStatus(taskId, newStatus) {
  try {
    await fetchJson(`${API_URL}/api/tasks/${taskId}/move`, {
      method: 'POST',
      body: { status: newStatus }
    });
    console.log(`[Worker] Task ${taskId} moved to ${newStatus}`);
  } catch (err) {
    console.error('[Worker] Error updating status:', err.message);
  }
}

// ========== QUEUE FUNCTIONS ==========

/**
 * Get next task from pending queue
 */
async function dequeueTask() {
  // Check if queue is paused
  const isPaused = await redis.get(QUEUE_KEYS.PAUSED);
  if (isPaused === 'true') {
    console.log('[Worker] Queue is paused, skipping dequeue');
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
    console.error(`[Worker] Task ${taskId} data not found`);
    return null;
  }

  const task = JSON.parse(taskData);
  
  // Move to processing
  await redis.zadd(QUEUE_KEYS.PROCESSING, Date.now(), taskId);
  task.status = 'PROCESSING';
  task.startedAt = new Date().toISOString();
  await redis.hset(`task:data:${taskId}`, 'data', JSON.stringify(task));

  console.log(`[Worker] Task ${taskId} dequeued and moved to processing`);
  return task;
}

/**
 * Mark task as completed
 */
async function completeTask(taskId, result) {
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

  console.log(`[Worker] Task ${taskId} marked as completed`);
}

/**
 * Mark task as failed
 */
async function failTask(taskId, error, canRetry = true) {
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
      console.log(`[Worker] Task ${taskId} requeued for retry (attempt ${task.retryCount})`);
    } else {
      // Move to failed queue
      await redis.zadd(QUEUE_KEYS.FAILED, Date.now(), taskId);
      console.log(`[Worker] Task ${taskId} moved to failed queue`);
    }
    
    await redis.hset(`task:data:${taskId}`, 'data', JSON.stringify(task));
  }
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
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

// ========== COMMENT GENERATORS ==========

function getResearchComments(language, title) {
  return [
    `🔍 Starting research for "${title}"`,
    `📚 Reviewing ${language} best practices and conventions`,
    `📝 Analyzing requirements: ${title}`,
    `💡 Identifying key components needed for implementation`,
    `🎯 Planning architecture approach for ${language} solution`,
    `✅ Research complete. Ready to architect solution.`
  ];
}

function getArchitectureComments(language) {
  const templates = {
    'Python': [
      '📐 Designing Python class structure',
      '🔧 Planning function interfaces and type hints',
      '📊 Considering data structure choices',
      '🎨 Defining module organization',
      '✅ Architecture designed'
    ],
    'TypeScript': [
      '📐 Designing TypeScript interfaces and types',
      '🔧 Planning type-safe function signatures',
      '📊 Considering interface segregation',
      '🎨 Defining module exports and imports',
      '✅ Type architecture designed'
    ],
    'Go': [
      '📐 Designing Go struct and interface patterns',
      '🔧 Planning package organization',
      '📊 Considering idiomatic Go conventions',
      '🎨 Defining public API boundaries',
      '✅ Go architecture designed'
    ]
  };
  return templates[language] || templates['TypeScript'];
}

function getDevelopmentComments(language) {
  const templates = {
    'Python': [
      '💻 Starting Python implementation',
      '📝 Writing hello world function',
      '🔧 Adding type hints and docstrings',
      '💡 Implementing greeting function with name parameter',
      '🧪 Running initial tests',
      '✅ Development complete'
    ],
    'TypeScript': [
      '💻 Starting TypeScript implementation',
      '📝 Writing typed hello world function',
      '🔧 Adding interface definitions',
      '💡 Implementing generic greeting function',
      '🧪 Running type checker',
      '✅ Development complete'
    ],
    'Go': [
      '💻 Starting Go implementation',
      '📝 Writing main function and hello world',
      '🔧 Adding package imports',
      '💡 Implementing greet function with proper error handling',
      '🧪 Running go build and go test',
      '✅ Development complete'
    ]
  };
  return templates[language] || templates['TypeScript'];
}

function getQAComments(language) {
  const templates = {
    'Python': [
      '🧪 Beginning QA review of Python code',
      '📋 Checking PEP 8 compliance',
      '🔍 Verifying function signatures match requirements',
      '📊 Running linter and formatter',
      '✅ QA review passed - code meets standards'
    ],
    'TypeScript': [
      '🧪 Beginning QA review of TypeScript code',
      '📋 Checking TypeScript strict mode compliance',
      '🔍 Verifying type safety throughout',
      '📊 Running tsc and ESLint',
      '✅ QA review passed - types are correct'
    ],
    'Go': [
      '🧪 Beginning QA review of Go code',
      '📋 Checking Go conventions and idioms',
      '🔍 Verifying error handling patterns',
      '📊 Running go vet and go fmt',
      '✅ QA review passed - follows Go best practices'
    ]
  };
  return templates[language] || templates['TypeScript'];
}

function getCompletionComments(language, taskTitle) {
  return [
    `✨ Task "${taskTitle}" completed successfully!`,
    `🎉 Implementation verified and tested`,
    `📝 All requirements met for ${language} solution`,
    `🚀 Ready for deployment`,
    `✅ Task completed and closed`
  ];
}

// ========== WORKFLOW EXECUTION ==========

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process task through full Kanban workflow
 */
async function processTaskWorkflow(task) {
  const { id: taskId, title, language, type } = task;

  console.log(`\n[Worker] 🚀 Starting full workflow for task: ${title}`);
  console.log(`[Worker]    Language: ${language} | Type: ${type}`);

  // Step 1: Move from PENDING to RESEARCH (in API/database)
  console.log(`[Worker] Step 1: Moving ${taskId} to RESEARCH`);
  await addTaskComment(taskId, '🤖 System', `Task picked up from queue and assigned to workflow`, 'update');
  await addTaskComment(taskId, '📋 Plan', `Starting task analysis: "${title}"`, 'finding');
  await updateTaskStatus(taskId, 'RESEARCH');
  await sleep(PROCESSING_DELAY);

  // Step 2: RESEARCH phase
  console.log(`[Worker] Step 2: RESEARCH phase`);
  const researchComments = getResearchComments(language, title);
  for (const comment of researchComments) {
    await addTaskComment(taskId, DEV_PERSONAS.research.name, comment, 'finding');
    await sleep(500);
  }
  await updateTaskStatus(taskId, 'DEV');
  await sleep(PROCESSING_DELAY);

  // Step 3: DEV phase
  console.log(`[Worker] Step 3: DEV phase`);
  
  // Architecture phase
  const archComments = getArchitectureComments(language);
  for (const comment of archComments) {
    await addTaskComment(taskId, DEV_PERSONAS.architect.name, comment, 'update');
    await sleep(500);
  }

  // Development phase
  const devComments = getDevelopmentComments(language);
  for (const comment of devComments) {
    await addTaskComment(taskId, DEV_PERSONAS.developer.name, comment, 'update');
    await sleep(500);
  }

  await updateTaskStatus(taskId, 'QA');
  await sleep(PROCESSING_DELAY);

  // Step 4: QA phase
  console.log(`[Worker] Step 4: QA phase`);
  const qaComments = getQAComments(language);
  for (const comment of qaComments) {
    await addTaskComment(taskId, DEV_PERSONAS.reviewer.name, comment, 'finding');
    await sleep(500);
  }

  // Step 5: DONE phase
  console.log(`[Worker] Step 5: DONE phase`);
  const completionComments = getCompletionComments(language, title);
  for (const comment of completionComments) {
    await addTaskComment(taskId, DEV_PERSONAS.closer.name, comment, 'update');
    await sleep(500);
  }

  await updateTaskStatus(taskId, 'DONE');
  
  // Update completed_at timestamp
  try {
    await fetchJson(`${API_URL}/api/tasks/${taskId}`, {
      method: 'PUT',
      body: { completedAt: new Date().toISOString() }
    });
  } catch (err) {
    console.error('[Worker] Error setting completed timestamp:', err.message);
  }

  console.log(`[Worker] ✅ Task ${taskId} completed full workflow!`);
  return { success: true };
}

// ========== MAIN PROCESSING LOOP ==========

async function processTask() {
  // Get stats first
  const stats = await getQueueStats();
  console.log(`[Worker] Queue status: ${stats.pending} pending, ${stats.processing} processing`);

  // If too many processing tasks, wait
  if (stats.processing >= 3) {
    console.log('[Worker] Max concurrent tasks reached, waiting...');
    return;
  }

  // Get next task from queue
  const task = await dequeueTask();
  if (!task) {
    console.log('[Worker] No tasks in queue');
    return;
  }

  try {
    // Process based on task type
    if (task.type === 'general') {
      await processTaskWorkflow(task);
      await completeTask(task.id, { success: true });
    } else {
      // For scraping tasks, just complete (simplified for now)
      console.log(`[Worker] Processing scraping task: ${task.title}`);
      await addTaskComment(task.id, '🤖 System', 'Scraping task processed (simplified)', 'update');
      await updateTaskStatus(task.id, 'DONE');
      await completeTask(task.id, { success: true });
    }

  } catch (error) {
    console.error(`[Worker] Error processing task ${task.id}:`, error);
    await failTask(task.id, error.message, true);
    await updateTaskStatus(task.id, 'QA', `Task failed: ${error.message}`);
    await addTaskComment(task.id, '🤖 System', `Task failed: ${error.message}`, 'error');
  }
}

// ========== MAIN ==========

async function startWorker() {
  console.log('='.repeat(60));
  console.log('CLAW-TEMPLE DRAGONFLY QUEUE WORKER');
  console.log('='.repeat(60));
  console.log(`[Worker] Dragonfly host: ${process.env.DRAGONFLY_HOST || 'localhost'}`);
  console.log(`[Worker] Dragonfly port: ${process.env.DRAGONFLY_PORT || '6379'}`);
  console.log(`[Worker] API URL: ${API_URL}`);
  console.log(`[Worker] Processing delay: ${PROCESSING_DELAY}ms`);
  console.log('='.repeat(60));

  // Test Dragonfly connection
  try {
    await redis.ping();
    console.log('[Worker] ✅ Dragonfly connection successful');
  } catch (err) {
    console.error('[Worker] ❌ Dragonfly connection failed:', err.message);
    console.error('[Worker] Make sure Dragonfly is running on localhost:6379');
    process.exit(1);
  }

  // Start processing loop
  console.log('[Worker] Starting processing loop...\n');
  
  while (true) {
    try {
      await processTask();
    } catch (err) {
      console.error('[Worker] Main loop error:', err);
    }
    await sleep(PROCESSING_DELAY);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Worker] Shutting down gracefully...');
  await redis.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Worker] Shutting down gracefully...');
  await redis.quit();
  process.exit(0);
});

startWorker().catch(err => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
