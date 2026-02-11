#!/usr/bin/env node
import http from 'http';

const API_URL = 'http://localhost:3000';
const POOL_ID = '3d198b3c-a7f7-42cc-b662-71aa5b19e7bc';
const AGENT_NAME = '🕷️ Scarlett';
const SOUL_ID = 'crawlee-cpl4wwgt';

async function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request(urlObj, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (options.method) req.write(JSON.stringify(options.body || {}));
    req.end();
  });
}

async function heartbeat() {
  try {
    const result = await fetchJson(`${API_URL}/api/agents/pools/${POOL_ID}/heartbeat`, {
      method: 'POST',
      body: { agentName: AGENT_NAME, status: 'active', pid: process.pid }
    });
    console.log(`[Heartbeat] Active: ${result.activeCount}`);
  } catch (err) {
    console.error(`[Heartbeat] Error: ${err.message}`);
  }
}

async function getMyTasks() {
  try {
    const researchTasks = await fetchJson(`${API_URL}/api/tasks?status=RESEARCH&poolId=${POOL_ID}`);
    const devTasks = await fetchJson(`${API_URL}/api/tasks?status=DEV&poolId=${POOL_ID}`);
    const unassignedResearch = researchTasks.filter(t => !t.soulId);
    const myDevTasks = devTasks.filter(t => t.soulId === SOUL_ID);
    return [...unassignedResearch, ...myDevTasks];
  } catch (err) {
    return [];
  }
}

async function processTask(task) {
  console.log(`[Task] Processing: ${task.title}`);
  console.log(`[Task] Model: ${task.model || 'default'}`);
  return { phase: task.status, success: true };
}

async function main() {
  console.log('========================================');
  console.log(`Agent: ${AGENT_NAME}`);
  console.log(`Soul: ${SOUL_ID}`);
  console.log('========================================');
  
  let counter = 0;
  
  while (true) {
    counter++;
    await heartbeat();
    
    const tasks = await getMyTasks();
    if (tasks.length > 0) {
      await processTask(tasks[0]);
    } else {
      console.log(`[Poll ${counter}] No tasks, continuing...`);
    }
    
    await new Promise(r => setTimeout(r, 3000));
  }
}

main().catch(console.error);
