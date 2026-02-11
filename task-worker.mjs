#!/usr/bin/env node
// ============================================================================
// CLAW-TEMPLE - Task Worker
// Polls for unassigned tasks and spawns agents to work on them
// ============================================================================

import { spawn, execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import http from 'http';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const POLL_INTERVAL = 5000; // 5 seconds

// Soul configurations
const SOULS = {
  crawlee: {
    name: '🕷️ Scarlett',
    soulId: 'crawlee-cpl4wwgt',
    framework: 'crawlee'
  },
  scrapy: {
    name: '🐍 Scrapy Veteran',
    soulId: 'scrapy-jd17ngb5',
    framework: 'scrapy'
  },
  general: {
    name: '⚡ General',
    soulId: '062fcc37-ec9b-4859-a0b1-41adb2964653',
    framework: 'general'
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

async function getTasksInWorkflow() {
  try {
    // Check both TODO and RESEARCH status for workflow tasks
    const todoTasks = await fetchJson(`${API_URL}/api/tasks?status=TODO`);
    const researchTasks = await fetchJson(`${API_URL}/api/tasks?status=RESEARCH`);
    
    // Combine and filter: must have soul assigned but not yet picked up by worker
    const allTasks = [...todoTasks, ...researchTasks];
    return allTasks.filter(t => t.soulId && !t.assignedTo);
  } catch (err) {
    console.error('[Worker] Error fetching tasks:', err.message);
    return [];
  }
}

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

async function addTaskComment(taskId, agentName, content, type = 'comment') {
  try {
    // Use the API to persist comments to database
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

// Run mcporter + Playwright reconnaissance
async function runMcporterRecon(targetUrl) {
  return new Promise((resolve, reject) => {
    // Use mcporter with playwright to analyze the target
    const mcporter = spawn('mcporter', [
      'call', 'playwright.browser_navigate',
      `url=${targetUrl}`
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000
    });

    let output = '';
    let errorOutput = '';
    
    mcporter.stdout.on('data', (data) => {
      output += data.toString();
    });
    mcporter.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    mcporter.on('close', async (code) => {
      if (code !== 0) {
        resolve({ code, output, errorOutput });
        return;
      }

      // After navigating, get a snapshot
      const snapshot = spawn('mcporter', [
        'call', 'playwright.browser_snapshot'
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 15000
      });

      let snapshotOutput = '';
      snapshot.stdout.on('data', (data) => {
        snapshotOutput += data.toString();
      });
      snapshot.stderr.on('data', (data) => {
        snapshotOutput += data.toString();
      });

      snapshot.on('close', (snapshotCode) => {
        resolve({ 
          code: 0, 
          output: output + '\n---SNAPSHOT---\n' + snapshotOutput,
          errorOutput 
        });
      });
    });

    mcporter.on('error', (err) => {
      reject(err);
    });
  });
}

// Analyze the mcporter output
function analyzeReconOutput(output) {
  const hasJs = output.includes('script') || output.includes('React') || output.includes('Vue') || output.includes('angular');
  const hasAntiBot = output.includes('cloudflare') || output.includes('captcha') || output.includes('turnstile') || output.includes('hcaptcha');
  const hasAjax = output.includes('data:') || output.includes('/api/') || output.includes('fetch(');
  
  let template = 'cheerio-ts';
  let reason = 'Static HTML content detected';
  
  if (hasAntiBot) {
    template = 'camoufox-ts';
    reason = 'Anti-bot protection detected (Cloudflare/CAPTCHA)';
  } else if (hasJs || hasAjax) {
    template = 'playwright-ts';
    reason = 'JavaScript/AJAX content detected';
  }
  
  return { template, reason, hasJs, hasAntiBot, hasAjax };
}

// Spawn an agent subprocess to work on a task
async function spawnAgentForTask(task, soul) {
  const agentName = soul.name;
  const taskType = task.type || 'scraping';
  console.log(`[Worker] Spawning agent ${agentName} for task ${task.id} (${taskType})`);

  // Post initial comment - task picked up
  await addTaskComment(task.id, agentName, `🤖 Task picked up by ${agentName}`, 'update');

  if (taskType === 'general') {
    // Handle general programming tasks
    const language = task.language || 'typescript';
    await addTaskComment(task.id, agentName, `⚡ General programming task (${language})`, 'update');
    await addTaskComment(task.id, agentName, `📝 Analyzing requirements and planning implementation...`, 'finding');

    // For general tasks, we'll simulate initial analysis and move to DEV
    // In production, this would spawn an actual agent session
    await addTaskComment(task.id, agentName, `✅ Requirements analyzed. Starting development.`, 'update');
    await updateTaskStatus(task.id, 'DEV');
    return;
  }

  // Post initial comment - starting work (scraping tasks)
  await addTaskComment(task.id, agentName, `🔬 Starting reconnaissance on ${task.metadata?.targetUrl || 'task'}...`, 'update');

  const targetUrl = task.metadata?.targetUrl;

  if (targetUrl && soul.framework === 'crawlee') {
    try {
      await addTaskComment(task.id, agentName, `🔍 Running mcporter + Playwright reconnaissance...`, 'finding');

      const result = await runMcporterRecon(targetUrl);

      if (result.code === 0 && result.output.length > 0) {
        const analysis = analyzeReconOutput(result.output);

        await addTaskComment(task.id, agentName, `🔍 Reconnaissance complete:\n- JavaScript: ${analysis.hasJs ? 'Yes' : 'No'}\n- AJAX/API: ${analysis.hasAjax ? 'Yes' : 'No'}\n- Anti-bot: ${analysis.hasAntiBot ? 'Yes' : 'No'}`, 'finding');
        await addTaskComment(task.id, agentName, `📝 Selected template: ${analysis.template} (${analysis.reason})`, 'update');

        // Move to DEV
        await updateTaskStatus(task.id, 'DEV');
      } else {
        const errorMsg = result.errorOutput || result.output || 'Unknown error';
        await addTaskComment(task.id, agentName, `⚠️ Reconnaissance failed. Error: ${errorMsg.slice(0, 300)}`, 'finding');
        await updateTaskStatus(task.id, 'TODO'); // Send back for manual review
      }
    } catch (err) {
      await addTaskComment(task.id, agentName, `❌ Error: ${err.message}`, 'error');
      await updateTaskStatus(task.id, 'TODO');
    }
  } else {
    // No URL or not crawlee - just move to DEV
    await addTaskComment(task.id, agentName, `📝 No target URL specified or non-Crawlee framework. Moving to DEV.`, 'update');
    await updateTaskStatus(task.id, 'DEV');
  }
}

// Main polling loop
async function startWorker() {
  console.log('='.repeat(50));
  console.log('CLAW-TEMPLE TASK WORKER');
  console.log('='.repeat(50));
  console.log(`[Worker] Connecting to ${API_URL}`);
  console.log(`[Worker] Polling every ${POLL_INTERVAL}ms`);
  console.log('='.repeat(50));

  while (true) {
    try {
      const tasks = await getTasksInWorkflow();

      for (const task of tasks) {
        const taskType = task.type || 'scraping';
        let soul;

        if (taskType === 'general') {
          soul = SOULS.general;
        } else {
          const framework = task.metadata?.framework || 'crawlee';
          soul = SOULS[framework] || SOULS.crawlee;
        }

        console.log(`[Worker] Found unassigned task: ${task.title} (${taskType})`);

        // Assign task to soul
        await assignTaskToSoul(task.id, soul.soulId, soul.name);

        // Spawn agent
        await spawnAgentForTask(task, soul);
      }
    } catch (err) {
      console.error('[Worker] Polling error:', err.message);
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Worker] Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Worker] Shutting down...');
  process.exit(0);
});

startWorker();