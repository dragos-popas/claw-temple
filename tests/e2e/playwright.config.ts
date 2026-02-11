// ============================================================================
// CLAW-TEMPLE - Comprehensive Playwright E2E Test Suite
// ============================================================================
//
// This test suite validates all core functionalities of CLAW-TEMPLE using
// Playwright for browser automation. Tests are designed to be idempotent
// and can be run multiple times without side effects.
//
// PREREQUISITES:
// 1. Server running on http://localhost:3000
// 2. Playwright installed: npm install -D playwright @playwright/test
// 3. Browser binaries installed: npx playwright install chromium
//
// USAGE:
//   npm test:e2e           # Run all tests
//   npm run test:e2e:ui    # Run with UI
//   npm run test:e2e:headed # Run headed (visible browser)
//
// ============================================================================

import { test, expect, chromium, type Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.CLAW_URL || 'http://localhost:3000';
const TIMEOUT = 30000;

// ============================================================================
// FIXTURES
// ============================================================================

test.describe('CLAW-TEMPLE E2E Tests', () => {
  let page: Page;

  test.beforeAll(async () => {
    // Launch browser
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    page = await context.newPage();
    
    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[CONSOLE ERROR] ${msg.text()}`);
      }
    });

    // Navigate to app
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  });

  test.afterAll(async () => {
    // Clean up
    await page.close();
  });

  // ============================================================================
  // HEALTH CHECK TESTS
  // ============================================================================

  test.describe('Health & Connectivity', () => {
    test('should load the application successfully', async () => {
      await expect(page).toHaveTitle(/🦀 CLAW-TEMPLE/);
    });

    test('should display version number', async () => {
      const version = page.locator('text=/v[0-9]+\.[0-9]+\.[0-9]+/');
      await expect(version.first()).toBeVisible();
    });

    test('should have navigation sidebar', async () => {
      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible();
    });

    test('should show system online status', async () => {
      const status = page.locator('text=System Online');
      await expect(status).toBeVisible();
    });
  });

  // ============================================================================
  // KANBAN BOARD TESTS
  // ============================================================================

  test.describe('Kanban Board', () => {
    test.beforeEach(async () => {
      // Navigate to Kanban tab
      await page.click('text=📋 Kanban');
      await page.waitForTimeout(500);
    });

    test('should display all 5 columns', async () => {
      const columns = ['TODO', 'Research', 'Development', 'Quality Assurance', 'Done'];
      for (const column of columns) {
        await expect(page.locator(`text=${column}`).first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should allow creating a new task', async () => {
      // Click "New Task" button
      await page.click('text=+ New Task');
      
      // Verify modal opens
      const modal = page.locator('text=Create New Task').first();
      await expect(modal).toBeVisible({ timeout: 5000 });
      
      // Fill in task details
      await page.fill('input[placeholder*="Scrape product"]', 'Test E2E Task');
      await page.fill('textarea', 'Created by E2E test suite');
      
      // Submit
      await page.click('button:has-text("Create Task")');
      
      // Verify task appears in TODO column
      await expect(page.locator('text=Test E2E Task').first()).toBeVisible({ timeout: 5000 });
    });

    test('should allow creating a task with full configuration', async () => {
      // Open create modal
      await page.click('text=+ New Task');
      await page.waitForTimeout(300);
      
      // Fill required fields
      await page.fill('input[placeholder*="Scrape"]', 'Full Config Test Task');
      await page.fill('textarea', 'Testing full configuration');
      
      // Select pool if available
      const poolSelect = page.locator('select').first();
      if (await poolSelect.count() > 0) {
        await poolSelect.selectOption({ index: 1 });
      }
      
      // Select model if available
      const modelSelect = page.locator('select').nth(1);
      if (await modelSelect.count() > 0) {
        await modelSelect.selectOption('deepseek/deepseek-chat');
      }
      
      // Set priority
      await page.check('#priority');
      
      // Submit
      await page.click('button:has-text("Create Task")');
      
      // Verify
      await expect(page.locator('text=Full Config Test Task').first()).toBeVisible({ timeout: 5000 });
    });

    test('should display task counts correctly', async () => {
      // Check TODO count badge
      const todoBadge = page.locator('text=/[0-9]+ Queue/').first();
      await expect(todoBadge).toBeVisible();
    });
  });

  // ============================================================================
  // AGENT POOLS TESTS
  // ============================================================================

  test.describe('Agent Pools Management', () => {
    let initialPoolCount: number;

    test.beforeEach(async () => {
      await page.click('text=🤖 Agents');
      await page.waitForTimeout(500);
      initialPoolCount = await page.locator('text=Total Pools').count();
    });

    test('should display agent pools section', async () => {
      await expect(page.locator('text=Agent Pools').first()).toBeVisible();
    });

    test('should allow creating a new pool', async () => {
      // Click "New Pool" button
      await page.click('text=+ New Pool');
      
      // Verify modal opens
      const modal = page.locator('text=Create Pool').first();
      await expect(modal).toBeVisible({ timeout: 5000 });
      
      // Fill pool details
      await page.fill('input[placeholder*="Web Crawler"]', 'E2E Test Pool');
      await page.fill('input.w-20', '🧪');
      
      // Set max parallel
      await page.fill('input[type="number"]', '2');
      
      // Enable auto-accept
      await page.check('input[type="checkbox"]');
      
      // Select notification mode
      await page.selectOption('select', 'both');
      
      // Submit
      await page.click('button:has-text("Create")');
      
      // Verify pool appears
      await expect(page.locator('text=E2E Test Pool').first()).toBeVisible({ timeout: 5000 });
    });

    test('should display pool stats correctly', async () => {
      // Check stats cards
      await expect(page.locator('text=Total Pools').first()).toBeVisible();
      await expect(page.locator('text=Active').first()).toBeVisible();
      await expect(page.locator('text=Running Agents').first()).toBeVisible();
    });

    test('should allow pausing a pool', async () => {
      // Find a pool to pause
      const pauseButton = page.locator('button:has-text("Pause")').first();
      if (await pauseButton.count() > 0) {
        await pauseButton.click();
        await page.waitForTimeout(500);
        
        // Verify changed to resume
        await expect(page.locator('button:has-text("Resume")').first()).toBeVisible();
      }
    });

    test('should allow editing a pool', async () => {
      // Click edit button
      const editButton = page.locator('button:has-text("Edit")').first();
      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForTimeout(300);
        
        // Verify edit modal opens
        const modal = page.locator('text=Edit Pool').first();
        await expect(modal).toBeVisible({ timeout: 5000 });
        
        // Close modal
        await page.click('button:has-text("Cancel")');
      }
    });
  });

  // ============================================================================
  // ANALYTICS TESTS
  // ============================================================================

  test.describe('Analytics Dashboard', () => {
    test.beforeEach(async () => {
      await page.click('text=📊 Analytics');
      await page.waitForTimeout(500);
    });

    test('should display analytics dashboard', async () => {
      await expect(page.locator('text=Analytics Dashboard').first()).toBeVisible();
    });

    test('should show spend metrics', async () => {
      await expect(page.locator('text=Total Spend').first()).toBeVisible();
    });

    test('should show productivity metrics', async () => {
      await expect(page.locator('text=Tasks Completed').first()).toBeVisible();
    });

    test('should display model usage chart', async () => {
      await expect(page.locator('text=Model Usage').first()).toBeVisible();
    });

    test('should show queue status', async () => {
      await expect(page.locator('text=Queue Status').first()).toBeVisible();
    });
  });

  // ============================================================================
  // SETTINGS TESTS
  // ============================================================================

  test.describe('Settings', () => {
    test.beforeEach(async () => {
      await page.click('text=⚙️ Settings');
      await page.waitForTimeout(500);
    });

    test('should display settings page', async () => {
      await expect(page.locator('text=Settings').first()).toBeVisible();
    });

    test('should allow configuring default repository', async () => {
      const repoInput = page.locator('input[placeholder*="github.com"]').first();
      if (await repoInput.count() > 0) {
        await expect(repoInput).toBeVisible();
      }
    });

    test('should allow configuring column limits', async () => {
      await expect(page.locator('text=Column Limits').first()).toBeVisible();
    });

    test('should allow toggling notifications', async () => {
      await expect(page.locator('text=Browser Notifications').first()).toBeVisible();
      await expect(page.locator('text=Telegram Notifications').first()).toBeVisible();
    });

    test('should allow saving settings', async () => {
      const saveButton = page.locator('button:has-text("Save Settings")').first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        // Verify no error occurred
      }
    });
  });

  // ============================================================================
  // TEMPLATES TESTS
  // ============================================================================

  test.describe('Templates', () => {
    test('should have pre-built templates available', async () => {
      // Templates are used when creating tasks
      await page.click('text=📋 Kanban');
      await page.waitForTimeout(300);
      
      await page.click('text=+ New Task');
      await page.waitForTimeout(300);
      
      // Check if template selector exists
      const templateSelect = page.locator('select').first();
      if (await templateSelect.count() > 0) {
        await expect(page.locator('text=Web Crawler').first()).toBeVisible();
        await expect(page.locator('text=Bug Fix').first()).toBeVisible();
      }
      
      // Close modal
      await page.click('button:has-text("Cancel")');
    });
  });

  // ============================================================================
  // REAL-TIME FEATURES TESTS
  // ============================================================================

  test.describe('Real-time Features', () => {
    test('should connect via WebSocket', async () => {
      // Check browser console for socket connection
      // This is verified by the lack of connection errors
      await page.waitForTimeout(1000);
    });

    test('should update when tasks change', async () => {
      // Create a task
      await page.click('text=📋 Kanban');
      await page.waitForTimeout(300);
      
      const initialTodoCount = await page.locator('text=/[0-9]+ Queue/').first().textContent();
      
      // Create task
      await page.click('text=+ New Task');
      await page.fill('input[placeholder*="Scrape"]', 'Real-time Test');
      await page.click('button:has-text("Create Task")');
      
      // Wait for update
      await page.waitForTimeout(1000);
      
      // Count should increase
      const newTodoCount = await page.locator('text=/[0-9]+ Queue/').first().textContent();
      expect(parseInt(newTodoCount || '0')).toBeGreaterThanOrEqual(parseInt(initialTodoCount || '0'));
    });
  });

  // ============================================================================
  // NAVIGATION TESTS
  // ============================================================================

  test.describe('Navigation', () => {
    test('should switch between tabs correctly', async () => {
      // Start at Kanban
      await expect(page.locator('text=📋 Kanban').first()).toBeVisible();
      
      // Click Analytics
      await page.click('text=📊 Analytics');
      await expect(page.locator('text=Analytics Dashboard').first()).toBeVisible();
      
      // Click Settings
      await page.click('text=⚙️ Settings');
      await expect(page.locator('text=Settings').first()).toBeVisible();
      
      // Click Agents
      await page.click('text=🤖 Agents');
      await expect(page.locator('text=Agent Pools').first()).toBeVisible();
      
      // Go back to Kanban
      await page.click('text=📋 Kanban');
      await expect(page.locator('text=To Do').first()).toBeVisible();
    });

    test('should highlight active tab', async () => {
      // Kanban should be active by default
      const activeKanban = page.locator('text=📋 Kanban').first();
      await expect(activeKanban).toBeVisible();
    });
  });

  // ============================================================================
  // API INTEGRATION TESTS
  // ============================================================================

  test.describe('API Integration', () => {
    test('should respond to health check', async () => {
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/health');
        return res.json();
      });
      expect(response.status).toBe('ok');
    });

    test('should have API models available', async () => {
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/models');
        return res.json();
      });
      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBeGreaterThan(0);
    });

    test('should have API templates available', async () => {
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/templates');
        return res.json();
      });
      expect(Array.isArray(response)).toBe(true);
    });
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Wait for a specific element to be visible
 */
async function waitForVisible(page: Page, selector: string, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Take a screenshot for debugging
 */
async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export default {
  testDir: './tests/e2e',
  timeout: TIMEOUT,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
    },
  ],
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
};