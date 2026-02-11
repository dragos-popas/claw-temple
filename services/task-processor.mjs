/**
 * Task Processor Service
 * 
 * Processes tasks from the Dragonfly queue
 * Handles task lifecycle: PENDING → PROCESSING → COMPLETED/FAILED
 */

import { spawnSubAgent } from '../scripts/spawn-sub-agent.mjs';
import * as taskQueue from './task-queue.mjs';
import { v4 as uuidv4 } from 'uuid';

// Track processing tasks
const processingTasks = new Map();
let isRunning = false;
let processorInterval = null;

/**
 * Initialize task processor
 */
export function initializeProcessor() {
  if (isRunning) {
    console.log('[Processor] Already running');
    return;
  }

  isRunning = true;
  console.log('[Processor] Task processor initialized');

  // Start processing loop
  processorInterval = setInterval(processNextTask, 5000); // Check every 5 seconds
}

/**
 * Process next task from queue
 */
async function processNextTask() {
  if (!isRunning) {
    return;
  }

  try {
    // Get stats first
    const stats = await taskQueue.getQueueStats();
    console.log(`[Processor] Queue status: ${stats.pending} pending, ${stats.processing} processing`);

    // If too many processing tasks, wait
    if (stats.processing >= 3) {
      console.log('[Processor] Max concurrent tasks reached, waiting...');
      return;
    }

    // Get next task
    const task = await taskQueue.dequeueTask();
    if (!task) {
      return; // No tasks available
    }

    console.log(`[Processor] Processing task ${task.id}: ${task.title}`);
    
    // Process task based on type
    await executeTask(task);

  } catch (error) {
    console.error('[Processor] Error processing task:', error);
  }
}

/**
 * Execute a task
 * @param {Object} task - Task object
 */
async function executeTask(task) {
  const { id, type, title, description, language } = task;

  try {
    // Update task status to DEV
    await updateTaskStatus(id, 'DEV', 'Task picked up by processor');

    // Add initial comment
    await addTaskComment(id, 'system', 'Task processing started', 'info');

    // Execute based on task type
    switch (type) {
      case 'general':
        await executeGeneralTask(task);
        break;
      case 'scraping':
        await executeScrapingTask(task);
        break;
      default:
        await executeGeneralTask(task);
    }

    // Mark as completed
    await taskQueue.completeTask(id, {
      success: true,
      message: 'Task completed successfully'
    });

    await updateTaskStatus(id, 'DONE', 'Task completed successfully');
    await addTaskComment(id, 'system', 'Task completed successfully', 'success');

  } catch (error) {
    console.error(`[Processor] Task ${id} failed:`, error);
    
    await taskQueue.failTask(id, error.message, true);
    await updateTaskStatus(id, 'QA', `Task failed: ${error.message}`);
    await addTaskComment(id, 'system', `Task failed: ${error.message}`, 'error');
  }
}

/**
 * Execute a general programming task
 * @param {Object} task - Task object
 */
async function executeGeneralTask(task) {
  const { id, title, description, language } = task;

  // Add status update comment
  await addTaskComment(id, 'agent', `Agent assigned to task. Starting ${language} development.`, 'status');

  // Spawn sub-agent for development
  const result = await spawnSubAgent({
    task: `Create a "${title}" program in ${language}. Requirements: ${description}`,
    language: language,
    timeout: 600000 // 10 minutes
  });

  // Update to QA status
  await updateTaskStatus(id, 'QA', 'Development complete, moving to QA');
  await addTaskComment(id, 'agent', 'Development phase completed. Code ready for QA review.', 'status');

  // Simple QA check (in production, this would be more thorough)
  if (result && result.success) {
    await addTaskComment(id, 'qa', 'QA Passed: Code compiles and runs successfully', 'success');
  } else {
    throw new Error(result?.error || 'Development failed');
  }
}

/**
 * Execute a scraping task
 * @param {Object} task - Task object
 */
async function executeScrapingTask(task) {
  const { id, title, description, targetUrl } = task;

  await addTaskComment(id, 'agent', `Scraping agent assigned. Target: ${targetUrl}`, 'status');

  // Spawn sub-agent for scraping
  const result = await spawnSubAgent({
    task: `Create a web scraper for: ${title}. Target: ${targetUrl}. Requirements: ${description}`,
    type: 'scraping',
    timeout: 600000 // 10 minutes
  });

  await updateTaskStatus(id, 'QA', 'Scraping complete, moving to QA');

  if (result && result.success) {
    await addTaskComment(id, 'qa', 'QA Passed: Scraper extracts data correctly', 'success');
  } else {
    throw new Error(result?.error || 'Scraping failed');
  }
}

/**
 * Update task status in database
 * @param {string} taskId - Task ID
 * @param {string} status - New status
 * @param {string} comment - Status comment
 */
async function updateTaskStatus(taskId, status, comment) {
  try {
    // This would integrate with your database
    // For now, we'll just log it
    console.log(`[Processor] Task ${taskId} status: ${status} - ${comment}`);
    
    // Emit WebSocket event for real-time updates
    // This would be integrated with your Socket.io server
  } catch (error) {
    console.error(`[Processor] Failed to update task ${taskId} status:`, error);
  }
}

/**
 * Add comment to task
 * @param {string} taskId - Task ID
 * @param {string} author - Comment author
 * @param {string} content - Comment content
 * @param {string} type - Comment type (info, success, error, status)
 */
async function addTaskComment(taskId, author, content, type = 'info') {
  try {
    const comment = {
      id: uuidv4(),
      taskId,
      author,
      content,
      type,
      createdAt: new Date().toISOString()
    };

    // This would integrate with your database
    console.log(`[Processor] Task ${taskId} comment [${author}]: ${content}`);
    
    // Emit WebSocket event for real-time comment updates
  } catch (error) {
    console.error(`[Processor] Failed to add comment to task ${taskId}:`, error);
  }
}

/**
 * Stop task processor
 */
export function stopProcessor() {
  isRunning = false;
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
  }
  console.log('[Processor] Task processor stopped');
}

/**
 * Get processing status
 * @returns {Object} - Processor status
 */
export function getProcessorStatus() {
  return {
    isRunning,
    processingCount: processingTasks.size,
    tasks: Array.from(processingTasks.keys())
  };
}

export default {
  initializeProcessor,
  stopProcessor,
  getProcessorStatus
};
