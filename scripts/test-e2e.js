#!/usr/bin/env node
// ============================================================================
// CLAW-TEMPLE - End-to-End Test Suite
// ============================================================================

import { exec } from 'child_process';
import { promisify } from 'util';
import http from 'http';

const execAsync = promisify(exec);

const API_BASE = 'http://localhost:3000';

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, color = '\x1b[0m') {
  console.log(`\x1b[${color}m${message}\x1b[0m`);
}

function addResult(name, status, message = '') {
  results.tests.push({ name, status, message });
  if (status === 'PASS') {
    results.passed++;
    log(`  ✓ ${name}`, '32');
  } else {
    results.failed++;
    log(`  ✗ ${name}`, '31');
    if (message) log(`    → ${message}`, '31');
  }
}

async function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `${API_BASE}${path}`,
      {
        timeout: 5000,
        ...options
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode || 0, data });
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runTests() {
  console.log('\n');
  log('═══════════════════════════════════════════════════════════', '36');
  log('          🦀 CLAW-TEMPLE End-to-End Test Suite 🦀', '36');
  log('═══════════════════════════════════════════════════════════', '36');
  console.log('\n');

  // Test 1: Server Health
  log('📋 Server Health Tests', '33');
  try {
    const { status, data } = await request('/api/health');
    addResult('Server health endpoint', status === 200 && data.status === 'ok' ? 'PASS' : 'FAIL', 
      status === 200 ? `Version: ${data.version}` : `Status: ${status}`);
  } catch (e) {
    addResult('Server health endpoint', 'FAIL', e.message);
  }

  // Test 2: Database Connection
  log('\n📋 Database Tests', '33');
  try {
    const { status } = await request('/api/config');
    addResult('Database connection', status === 200 ? 'PASS' : 'FAIL');
  } catch (e) {
    addResult('Database connection', 'FAIL', e.message);
  }

  // Test 3: Task CRUD Operations
  log('\n📋 Task CRUD Tests', '33');
  
  try {
    const { data: createData } = await request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'E2E Test Task',
        description: 'Testing task creation',
        priority: 1,
        metadata: { test: true }
      })
    });
    addResult('Create task', createData.title === 'E2E Test Task' ? 'PASS' : 'FAIL');
    
    const taskId = createData.id;
    
    const { data: readData } = await request(`/api/tasks/${taskId}`);
    addResult('Read task', readData.id === taskId ? 'PASS' : 'FAIL');
    
    const { data: updateData } = await request(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title' })
    });
    addResult('Update task', updateData.title === 'Updated Title' ? 'PASS' : 'FAIL');
    
    const { data: moveData } = await request(`/api/tasks/${taskId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'RESEARCH' })
    });
    addResult('Move task to RESEARCH', moveData.status === 'RESEARCH' ? 'PASS' : 'FAIL');
    
    const { data: listData } = await request('/api/tasks');
    addResult('List tasks', Array.isArray(listData) ? 'PASS' : 'FAIL');
    
    try {
      await request(`/api/tasks/${taskId}`, { method: 'DELETE' });
      addResult('Delete task', 'PASS');
    } catch {
      addResult('Delete task', 'FAIL');
    }
  } catch (e) {
    addResult('Task CRUD operations', 'FAIL', e.message);
  }

  // Test 4: Agent Pool Operations
  log('\n📋 Agent Pool Tests', '33');
  try {
    const { data: poolData } = await request('/api/agents/pools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E Test Pool',
        icon: '🧪',
        maxParallel: 2,
        autoAccept: false
      })
    });
    addResult('Create agent pool', poolData.name === 'E2E Test Pool' ? 'PASS' : 'FAIL');
    
    const poolId = poolData.id;
    
    const { data: poolsList } = await request('/api/agents/pools');
    addResult('List agent pools', Array.isArray(poolsList) ? 'PASS' : 'FAIL');
    
    const { data: pauseData } = await request(`/api/agents/pools/${poolId}/pause`, {
      method: 'POST'
    });
    addResult('Pause agent pool', pauseData.isPaused === 1 ? 'PASS' : 'FAIL');
    
    const { data: resumeData } = await request(`/api/agents/pools/${poolId}/resume`, {
      method: 'POST'
    });
    addResult('Resume agent pool', resumeData.isPaused === 0 ? 'PASS' : 'FAIL');
  } catch (e) {
    addResult('Agent pool operations', 'FAIL', e.message);
  }

  // Test 5: Template Operations
  log('\n📋 Template Tests', '33');
  try {
    const { data: templates } = await request('/api/templates');
    addResult('List templates', Array.isArray(templates) ? 'PASS' : 'FAIL');
    
    const templateList = templates;
    const hasWebCrawler = templateList.some(t => t.name === 'Web Crawler');
    addResult('Web Crawler template exists', hasWebCrawler ? 'PASS' : 'FAIL');
  } catch (e) {
    addResult('Template operations', 'FAIL', e.message);
  }

  // Test 6: Analytics Endpoints
  log('\n📋 Analytics Tests', '33');
  try {
    const { data: dashboard } = await request('/api/analytics/dashboard');
    addResult('Dashboard endpoint', dashboard && typeof dashboard === 'object' ? 'PASS' : 'FAIL');
    
    addResult('Dashboard has spend', 'spend' in dashboard ? 'PASS' : 'FAIL');
    addResult('Dashboard has productivity', 'productivity' in dashboard ? 'PASS' : 'FAIL');
    addResult('Dashboard has queue', 'queue' in dashboard ? 'PASS' : 'FAIL');
  } catch (e) {
    addResult('Analytics operations', 'FAIL', e.message);
  }

  // Test 7: Config Operations
  log('\n📋 Config Tests', '33');
  try {
    const { data: config } = await request('/api/config');
    addResult('Get config', config && typeof config === 'object' ? 'PASS' : 'FAIL');
  } catch (e) {
    addResult('Config operations', 'FAIL', e.message);
  }

  // Test 8: Models Endpoint
  log('\n📋 Models Tests', '33');
  try {
    const { data: models } = await request('/api/models');
    const modelList = models;
    addResult('Models endpoint', modelList.length > 0 ? 'PASS' : 'FAIL');
    addResult('Has DeepSeek model', modelList.some(m => m.id.includes('deepseek')) ? 'PASS' : 'FAIL');
    addResult('Has Kimi K2.5 model', modelList.some(m => m.id.includes('kimi')) ? 'PASS' : 'FAIL');
  } catch (e) {
    addResult('Models operations', 'FAIL', e.message);
  }

  // Test 9: Worktree Endpoint
  log('\n📋 Worktree Tests', '33');
  try {
    const { data: worktrees } = await request('/api/worktrees');
    addResult('Worktrees endpoint', Array.isArray(worktrees) ? 'PASS' : 'FAIL');
  } catch (e) {
    addResult('Worktree operations', 'FAIL', e.message);
  }

  // Print Summary
  console.log('\n');
  log('═══════════════════════════════════════════════════════════', '36');
  log('                      📊 Test Summary 📊', '33');
  log('═══════════════════════════════════════════════════════════', '36');
  console.log('\n');
  
  log(`  ✓ Passed: ${results.passed}`, '32');
  log(`  ✗ Failed: ${results.failed}`, '31');
  log(`  ─────────────`);
  log(`  Total: ${results.passed + results.failed}`, '36');
  console.log('\n');

  if (results.failed > 0) {
    log('Failed Tests:', '31');
    for (const test of results.tests.filter(t => t.status === 'FAIL')) {
      log(`  ✗ ${test.name}`, '31');
      if (test.message) log(`    → ${test.message}`, '31');
    }
    console.log('\n');
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});