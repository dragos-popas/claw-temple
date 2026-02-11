#!/usr/bin/env node
// ============================================================================
// CLAW-TEMPLE - E2E Test Runner
// ============================================================================
//
// This script runs the Playwright E2E test suite for CLAW-TEMPLE.
//
// PREREQUISITES:
// 1. npm install -D playwright @playwright/test
// 2. npx playwright install chromium
//
// USAGE:
//   npm run test:e2e        # Run all tests
//   npm run test:e2e:ui      # Run with Playwright UI
//   npm run test:e2e:headed  # Run with visible browser
//
// ============================================================================

import { execSync } from 'child_process';
import path from 'path';

const TEST_DIR = path.join(process.cwd(), 'tests/e2e');
const RESULTS_DIR = path.join(process.cwd(), 'test-results');

async function main() {
  console.log('🦀 CLAW-TEMPLE E2E Test Runner');
  console.log('================================\n');

  // Check if server is running
  try {
    execSync('curl -s http://localhost:3000/api/health > /dev/null', { encoding: 'utf-8' });
    console.log('✅ Server is running on http://localhost:3000');
  } catch {
    console.log('⚠️  Server not running. Starting...');
    execSync('node server-simple.mjs &', { detached: true, stdio: 'ignore' });
    await new Promise(r => setTimeout(r, 3000));
  }

  // Ensure test directories exist
  execSync(`mkdir -p ${RESULTS_DIR}`);

  // Run tests
  console.log('\n📋 Running E2E tests...\n');
  
  try {
    execSync(`npx playwright test ${TEST_DIR} --config ${TEST_DIR}/playwright.config.ts`, {
      stdio: 'inherit',
      encoding: 'utf-8'
    });
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.log('\n⚠️  Some tests failed. Check results above.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});