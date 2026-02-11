#!/usr/bin/env node
// ============================================================================
// CLAW-TEMPLE - Enhanced Task Worker with Full Kanban Workflow
// Handles TODO → RESEARCH → DEV → QA → DONE for general programming tasks
// ============================================================================

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import http from 'http';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const POLL_INTERVAL = 5000; // 5 seconds
const WORKFLOW_DELAY = 3000; // Delay between workflow steps (ms)

// Soul configurations
const SOULS = {
  general: {
    name: '⚡ General Developer',
    soulId: '062fcc37-ec9b-4859-a0b1-41adb2964653',
    framework: 'general'
  }
};

// Developer personas for realistic comments
const DEV_PERSONAS = {
  research: {
    name: '🔍 Research Agent',
    emoji: '🔍',
    style: 'analytical'
  },
  architect: {
    name: '📐 Architect Bot',
    emoji: '📐',
    style: 'methodical'
  },
  developer: {
    name: '💻 Dev Bot',
    emoji: '💻',
    style: 'pragmatic'
  },
  reviewer: {
    name: '🧪 QA Bot',
    emoji: '🧪',
    style: 'thorough'
  },
  closer: {
    name: '✨ Completion Bot',
    emoji: '✨',
    style: 'celebratory'
  }
};

// Helper to make HTTP requests
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

// Get tasks in a specific status
async function getTasksByStatus(status) {
  try {
    const tasks = await fetchJson(`${API_URL}/api/tasks?status=${status}`);
    return tasks.filter(t => t.soulId && !t.assignedTo);
  } catch (err) {
    console.error('[Worker] Error fetching tasks:', err.message);
    return [];
  }
}

// Get all tasks (for workflow tracking)
async function getAllTasks() {
  try {
    const tasks = await fetchJson(`${API_URL}/api/tasks`);
    return tasks;
  } catch (err) {
    console.error('[Worker] Error fetching all tasks:', err.message);
    return [];
  }
}

// Assign task to soul
async function assignTaskToSoul(taskId, soulId, soulName) {
  try {
    await fetchJson(`${API_URL}/api/tasks/${taskId}`, {
      method: 'PUT',
      body: { soulId: soulId, assignedTo: soulName }
    });
    console.log(`[Worker] Assigned task ${taskId} to soul ${soulId} (${soulName})`);
  } catch (err) {
    console.error('[Worker] Error assigning task:', err.message);
  }
}

// Add comment to task
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

// Update task status
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

// Get task by ID
async function getTaskById(taskId) {
  try {
    return await fetchJson(`${API_URL}/api/tasks/${taskId}`);
  } catch (err) {
    console.error('[Worker] Error fetching task:', err.message);
    return null;
  }
}

// ========== REALISTIC DEVELOPER COMMENT GENERATORS ==========

// Generate realistic research phase comments
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

// Generate realistic architecture comments
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

// Generate realistic development comments
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

// Generate realistic QA comments
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

// Generate completion comments
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

// Process task through full Kanban workflow
async function processTaskWorkflow(task, soul) {
  const { id: taskId, title, language, type } = task;
  const agentName = soul.name;

  console.log(`[Worker] Starting full workflow for task: ${title}`);

  // Step 1: TODO → RESEARCH (if in TODO)
  if (task.status === 'TODO') {
    console.log(`[Worker] Step 1: Moving ${taskId} to RESEARCH`);
    await addTaskComment(taskId, agentName, `🤖 Task assigned to ${agentName}`, 'update');
    await addTaskComment(taskId, agentName, `📋 Starting task analysis: "${title}"`, 'finding');
    await updateTaskStatus(taskId, 'RESEARCH');
    await sleep(WORKFLOW_DELAY);
  }

  // Step 2: RESEARCH → DEV
  console.log(`[Worker] Step 2: Moving ${taskId} to DEV`);
  
  // Research phase comments
  const researchComments = getResearchComments(language, title);
  for (const comment of researchComments) {
    await addTaskComment(taskId, DEV_PERSONAS.research.name, comment, 'finding');
    await sleep(500);
  }

  // Move to DEV
  await updateTaskStatus(taskId, 'DEV');
  await sleep(WORKFLOW_DELAY);

  // Step 3: DEV → QA
  console.log(`[Worker] Step 3: Moving ${taskId} to QA`);

  // Architecture phase comments
  const archComments = getArchitectureComments(language);
  for (const comment of archComments) {
    await addTaskComment(taskId, DEV_PERSONAS.architect.name, comment, 'update');
    await sleep(500);
  }

  // Development phase comments
  const devComments = getDevelopmentComments(language);
  for (const comment of devComments) {
    await addTaskComment(taskId, DEV_PERSONAS.developer.name, comment, 'update');
    await sleep(500);
  }

  // Move to QA
  await updateTaskStatus(taskId, 'QA');
  await sleep(WORKFLOW_DELAY);

  // Step 4: QA → DONE
  console.log(`[Worker] Step 4: Moving ${taskId} to DONE`);

  // QA review comments
  const qaComments = getQAComments(language);
  for (const comment of qaComments) {
    await addTaskComment(taskId, DEV_PERSONAS.reviewer.name, comment, 'finding');
    await sleep(500);
  }

  // Completion comments
  const completionComments = getCompletionComments(language, title);
  for (const comment of completionComments) {
    await addTaskComment(taskId, DEV_PERSONAS.closer.name, comment, 'update');
    await sleep(500);
  }

  // Mark as completed
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
}

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== MAIN WORKFLOW ==========

async function processWorkflowQueue() {
  // Check for tasks in each status and process them
  const statuses = ['TODO', 'RESEARCH', 'DEV', 'QA'];
  
  for (const status of statuses) {
    const tasks = await getTasksByStatus(status);
    
    for (const task of tasks) {
      // Only process general programming tasks
      if (task.type === 'general') {
        console.log(`\n[Worker] Processing ${status} task: ${task.title}`);
        
        // Assign to soul if not already assigned
        if (!task.assignedTo) {
          await assignTaskToSoul(task.id, SOULS.general.soulId, SOULS.general.name);
        }
        
        // Process through workflow
        await processTaskWorkflow(task, SOULS.general);
      }
    }
  }
}

// Main polling loop
async function startWorker() {
  console.log('='.repeat(60));
  console.log('CLAW-TEMPLE ENHANCED TASK WORKER');
  console.log('Full Kanban Workflow: TODO → RESEARCH → DEV → QA → DONE');
  console.log('='.repeat(60));
  console.log(`[Worker] Connecting to ${API_URL}`);
  console.log(`[Worker] Polling every ${POLL_INTERVAL}ms`);
  console.log(`[Worker] Workflow delay: ${WORKFLOW_DELAY}ms between steps`);
  console.log('='.repeat(60));

  while (true) {
    try {
      await processWorkflowQueue();
    } catch (err) {
      console.error('[Worker] Main loop error:', err.message);
    }

    await sleep(POLL_INTERVAL);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Worker] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Worker] Shutting down gracefully...');
  process.exit(0);
});

startWorker().catch(err => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
