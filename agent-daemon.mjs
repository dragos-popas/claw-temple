#!/usr/bin/env node
// ============================================================================
// CLAW-TEMPLE - Agent Daemon
// Long-running agent that polls for tasks and executes them
// Supports: model selection, comment-based persistence, graceful shutdown
// ============================================================================

import http from 'http';
import { spawn } from 'child_process';
import readline from 'readline';
import { randomUUID } from 'crypto';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const POOL_ID = process.env.POOL_ID || '3d198b3c-a7f7-42cc-b662-71aa5b19e7bc';
const AGENT_NAME = process.env.AGENT_NAME || '🕷️ Scarlett';
const SOUL_ID = process.env.SOUL_ID || 'crawlee-cpl4wwgt';
const POLL_INTERVAL = 3000; // 3 seconds
const HEARTBEAT_INTERVAL = 10000; // 10 seconds

// Helper to make HTTP requests
async function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request(urlObj, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (data) {
          try { resolve(JSON.parse(data)); } catch (e) { resolve({ raw: data }); }
        } else {
          resolve({ status: 'ok' });
        }
      });
    });
    req.on('error', (err) => {
      console.error(`[HTTP] Error: ${err.message}`);
      reject(err);
    });
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

// Report heartbeat to pool
async function reportHeartbeat(status = 'active', metadata = {}) {
  try {
    await fetchJson(`${API_URL}/api/agents/pools/${POOL_ID}/heartbeat`, {
      method: 'POST',
      body: { 
        agentName: AGENT_NAME, 
        status, 
        pid: process.pid,
        lastSeen: new Date().toISOString(),
        metadata
      }
    });
  } catch (err) {
    console.error(`[Heartbeat] Error: ${err.message}`);
  }
}

// Get task by ID
async function getTask(taskId) {
  try {
    return await fetchJson(`${API_URL}/api/tasks/${taskId}`);
  } catch (err) {
    return null;
  }
}

// Get comments for a task
async function getTaskComments(taskId) {
  try {
    return await fetchJson(`${API_URL}/api/tasks/${taskId}/comments`);
  } catch (err) {
    return [];
  }
}

// Add comment to task
async function addTaskComment(taskId, content, tags = []) {
  try {
    await fetchJson(`${API_URL}/api/tasks/${taskId}/comments`, {
      method: 'POST',
      body: { content, author: AGENT_NAME, tags }
    });
    console.log(`[Comment] ${content.slice(0, 50)}...`);
  } catch (err) {
    console.error(`[Comment] Error: ${err.message}`);
  }
}

// Update task soul_id and model
async function assignTaskToAgent(taskId, model = null) {
  try {
    await fetchJson(`${API_URL}/api/tasks/${taskId}`, {
      method: 'PUT',
      body: { soulId: SOUL_ID, model }
    });
    console.log(`[Task] Assigned to ${AGENT_NAME}${model ? ` (model: ${model})` : ''}`);
  } catch (err) {
    console.error(`[Task] Assign error: ${err.message}`);
  }
}

// Move task to status
async function moveTaskStatus(taskId, status) {
  try {
    await fetchJson(`${API_URL}/api/tasks/${taskId}/move`, {
      method: 'POST',
      body: { status }
    });
    console.log(`[Task] Moved to ${status}`);
  } catch (err) {
    console.error(`[Task] Move error: ${err.message}`);
  }
}

// Get tasks assigned to this agent (TODO, RESEARCH, or DEV phase)
async function getMyTasks() {
  try {
    // Get tasks in TODO (unassigned), RESEARCH (unassigned), or DEV (assigned to me)
    const todoTasks = await fetchJson(`${API_URL}/api/tasks?status=TODO&poolId=${POOL_ID}`);
    const researchTasks = await fetchJson(`${API_URL}/api/tasks?status=RESEARCH&poolId=${POOL_ID}`);
    const devTasks = await fetchJson(`${API_URL}/api/tasks?status=DEV&poolId=${POOL_ID}`);
    
    const unassignedTodo = todoTasks.filter(t => !t.soulId);
    const unassignedResearch = researchTasks.filter(t => !t.soulId);
    const myDevTasks = devTasks.filter(t => t.soulId === SOUL_ID);
    
    return [...unassignedTodo, ...unassignedResearch, ...myDevTasks];
  } catch (err) {
    return [];
  }
}

// Get last resume point from comments
function getResumePoint(comments) {
  const phases = ['TODO', 'RESEARCH', 'ARCHITECTURE', 'IMPLEMENTATION', 'TESTING', 'QA', 'DONE'];
  
  for (const comment of comments.reverse()) {
    for (const phase of phases) {
      if (comment.content.includes(`[${phase}]`) || comment.tags?.includes(phase)) {
        return { phase, comment };
      }
    }
  }
  return null;
}

// Run reconnaissance with mcporter
async function runReconnaissance(targetUrl) {
  console.log(`[Recon] Analyzing ${targetUrl}...`);
  
  return new Promise((resolve) => {
    const mcporter = spawn('mcporter', [
      'call', 'playwright.browser_navigate',
      `url=${targetUrl}`
    ], { timeout: 30000 });

    let output = '';
    mcporter.stdout.on('data', (data) => output += data.toString());
    mcporter.stderr.on('data', (data) => output += data.toString());

    mcporter.on('close', async (code) => {
      if (code !== 0) {
        resolve({ success: false, output });
        return;
      }

      // Get snapshot
      const snapshot = spawn('mcporter', ['call', 'playwright.browser_snapshot'], { timeout: 15000 });
      let snapshotOutput = '';
      snapshot.stdout.on('data', (data) => snapshotOutput += data.toString());
      snapshot.stderr.on('data', (data) => snapshotOutput += data.toString());

      snapshot.on('close', () => {
        resolve({ success: true, output: output + '\n' + snapshotOutput });
      });
    });

    mcporter.on('error', (err) => resolve({ success: false, output: err.message }));
  });
}

// Analyze target and select template
function analyzeTarget(html) {
  const hasJs = html.includes('<script') || html.includes('React') || html.includes('Vue');
  const hasAntiBot = html.includes('cloudflare') || html.includes('captcha') || html.includes('turnstile');
  const hasAjax = html.includes('/api/') || html.includes('fetch(');

  let template = 'cheerio-ts';
  let reason = 'Static HTML content';

  if (hasAntiBot) {
    template = 'camoufox-ts';
    reason = 'Anti-bot protection detected';
  } else if (hasJs || hasAjax) {
    template = 'playwright-ts';
    reason = 'JavaScript-rendered content';
  }

  return { template, reason, hasJs, hasAntiBot, hasAjax };
}

// Process a task - main work function
async function processTask(task) {
  console.log(`[Agent] Processing: ${task.title}`);
  console.log(`[Agent] Task ID: ${task.id}`);
  console.log(`[Agent] Model: ${task.model || 'default (from soul)'}`);
  
  const taskModel = task.model;
  
  // Parse metadata if it's a string
  const metadata = typeof task.metadata === 'string' 
    ? JSON.parse(task.metadata || '{}') 
    : task.metadata || {};

  // Check for existing comments to find resume point
  const comments = await getTaskComments(task.id);
  const resumePoint = getResumePoint(comments);
  
  if (resumePoint) {
    console.log(`[Agent] Resuming from: ${resumePoint.phase}`);
    await addTaskComment(task.id, `[RESUME] Agent restarted - continuing from ${resumePoint.phase}`, ['RESUME']);
  } else {
    // First time processing this task
    console.log(`[Agent] New task - starting from RESEARCH`);
  }

  // If in RESEARCH phase (just assigned), run reconnaissance
  if (task.status === 'RESEARCH' || task.status === 'TODO') {
    const targetUrl = metadata.targetUrl;
    
    if (targetUrl) {
      await addTaskComment(task.id, `[RESEARCH] Starting reconnaissance on ${targetUrl}`, ['RESEARCH']);
      
      const reconResult = await runReconnaissance(targetUrl);
      
      if (reconResult.success) {
        const analysis = analyzeTarget(reconResult.output);
        
        // Check for forced template (anti-bot sites)
        const forceTemplate = metadata.forceTemplate;
        if (forceTemplate) {
          console.log(`[Agent] Forced template: ${forceTemplate}`);
          analysis.template = forceTemplate;
          analysis.reason = 'Forced via task metadata (anti-bot protection)';
          analysis.hasAntiBot = true;
        }
        
        console.log(`[Agent] Analysis: ${analysis.template} (${analysis.reason})`);
        
        // Assign task to agent with model
        await assignTaskToAgent(task.id, taskModel);
        
        await addTaskComment(task.id, 
          `[RESEARCH] Template: ${analysis.template}\nReason: ${analysis.reason}\nAnti-bot: ${analysis.hasAntiBot}\nJavaScript: ${analysis.hasJs}`,
          ['RESEARCH', analysis.template]
        );
        
        // Move to DEV
        await moveTaskStatus(task.id, 'DEV');
        await addTaskComment(task.id, `[IMPLEMENTATION] Moving to DEV phase - starting scraper implementation`, ['IMPLEMENTATION']);
        
        return { phase: 'DEV', success: true, template: analysis.template };
      } else {
        await addTaskComment(task.id, `[RESEARCH] Reconnaissance failed: ${reconResult.output.slice(0, 200)}`, ['RESEARCH', 'ERROR']);
        return { phase: 'RESEARCH', success: false };
      }
    } else {
      await addTaskComment(task.id, `[RESEARCH] No target URL found in metadata`, ['RESEARCH', 'ERROR']);
      return { phase: 'RESEARCH', success: false };
    }
  }
  
  return { phase: task.status, success: true };
}

// Main agent loop
async function startAgent() {
  console.log('='.repeat(60));
  console.log(`CLAW-TEMPLE AGENT: ${AGENT_NAME}`);
  console.log(`Soul: ${SOUL_ID}`);
  console.log(`Pool: ${POOL_ID}`);
  console.log(`API: ${API_URL}`);
  console.log(`Poll: ${POLL_INTERVAL}ms | Heartbeat: ${HEARTBEAT_INTERVAL}ms`);
  console.log('='.repeat(60));

  let heartbeatInterval;
  let taskProcessing = null;
  let pollCount = 0;

  // Start heartbeat reporting
  heartbeatInterval = setInterval(() => {
    reportHeartbeat('active', { 
      processing: taskProcessing ? 'active' : 'idle',
      pollCount
    });
  }, HEARTBEAT_INTERVAL);

  // Main polling loop - infinite but safe
  const runPoll = async () => {
    pollCount++;
    
    try {
      // If already processing a task, skip this poll cycle
      if (taskProcessing) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        return runPoll();
      }

      // Get available tasks
      const tasks = await getMyTasks();
      
      if (tasks.length > 0) {
        const task = tasks[0];
        console.log(`[Poll ${pollCount}] Task found: ${task.title}`);
        
        taskProcessing = task.id;
        
        const result = await processTask(task);
        
        if (result.success) {
          console.log(`[Agent] Processed: ${result.phase}`);
        } else {
          console.log(`[Agent] Failed: ${result.phase}`);
        }
        
        taskProcessing = null;
      } else {
        if (pollCount % 10 === 0) {
          console.log(`[Poll ${pollCount}] No tasks, heartbeat active...`);
        }
      }
    } catch (err) {
      console.error(`[Poll ${pollCount}] Error: ${err.message}`);
    }

    // Continue polling
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    return runPoll();
  };

  // Start polling (fire and forget, keep process alive)
  runPoll().catch(err => {
    console.error(`[Agent] Fatal error: ${err.message}`);
    process.exit(1);
  });
}

// Graceful shutdown
async function shutdown(signal) {
  console.log(`\n[Agent] Received ${signal} - shutting down gracefully...`);
  
  // Final heartbeat with status
  await reportHeartbeat('stopping', { shutdownTime: new Date().toISOString() });
  
  console.log(`[Agent] Goodbye!`);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP', () => shutdown('SIGHUP'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error(`[Agent] Uncaught exception: ${err.message}`);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (err) => {
  console.error(`[Agent] Unhandled rejection: ${err}`);
  shutdown('unhandledRejection');
});

// Start the agent
startAgent();
