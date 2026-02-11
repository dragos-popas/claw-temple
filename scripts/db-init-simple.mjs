#!/usr/bin/env node
// ============================================================================
// CLAW-TEMPLE - Simple Database Initialization
// ============================================================================

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';

const DATA_DIR = './data';
const DB_PATH = path.join(DATA_DIR, 'claw-temple.db');

async function main() {
  console.log('🦀 Initializing CLAW-TEMPLE database...\n');

  // Ensure data directory exists
  await fs.ensureDir(DATA_DIR);

  // Remove existing database if it exists
  if (await fs.pathExists(DB_PATH)) {
    console.log('Removing existing database...');
    await fs.remove(DB_PATH);
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  console.log('Creating tables...\n');

  // Tasks table
  db.exec(`
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      repo_url TEXT,
      template_id TEXT,
      pool_id TEXT,
      model TEXT,
      status TEXT NOT NULL DEFAULT 'TODO',
      priority INTEGER DEFAULT 0,
      cost_estimate REAL,
      actual_cost REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      metadata TEXT
    )
  `);

  // Agent pools table
  db.exec(`
    CREATE TABLE agent_pools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '🤖',
      default_model TEXT,
      max_parallel INTEGER DEFAULT 3,
      cost_limit REAL,
      auto_accept INTEGER DEFAULT 0,
      timeout_minutes INTEGER DEFAULT 60,
      retry_count INTEGER DEFAULT 2,
      notification_mode TEXT DEFAULT 'both',
      is_paused INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Agent instances table
  db.exec(`
    CREATE TABLE agent_instances (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      pool_id TEXT NOT NULL,
      session_key TEXT,
      status TEXT NOT NULL,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      cost REAL,
      output TEXT,
      error TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (pool_id) REFERENCES agent_pools(id)
    )
  `);

  // Templates table
  db.exec(`
    CREATE TABLE templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      config TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Analytics events table
  db.exec(`
    CREATE TABLE analytics_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      event_data TEXT,
      cost REAL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Worktrees table
  db.exec(`
    CREATE TABLE worktrees (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      path TEXT NOT NULL,
      branch TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      cleaned_at TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    )
  `);

  // User config table
  db.exec(`
    CREATE TABLE user_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Create indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_pool ON tasks(pool_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_agent_instances_status ON agent_instances(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp)`);

  // Seed default templates
  console.log('Seeding default templates...\n');
  const templates = [
    {
      id: 'web-crawler',
      name: 'Web Crawler',
      description: 'Build a web crawler/scraper with target domain, library selection, and crawl strategy',
      config: JSON.stringify({
        columns: ['RESEARCH', 'DEV', 'QA', 'DONE'],
        defaults: { poolId: 'dev' },
        autoAdvance: true
      })
    },
    {
      id: 'bug-fix',
      name: 'Bug Fix',
      description: 'Quick bug fix workflow - Dev to QA',
      config: JSON.stringify({
        columns: ['DEV', 'QA', 'DONE'],
        defaults: {},
        autoAdvance: true
      })
    },
    {
      id: 'research-sprint',
      name: 'Research Sprint',
      description: 'Research-only task - gather information and produce report',
      config: JSON.stringify({
        columns: ['RESEARCH', 'DONE'],
        defaults: {},
        autoAdvance: true
      })
    },
    {
      id: 'quick-task',
      name: 'Quick Task',
      description: 'Minimal workflow for quick tasks',
      config: JSON.stringify({
        columns: ['DEV', 'DONE'],
        defaults: {},
        autoAdvance: true
      })
    }
  ];

  const insertTemplate = db.prepare(`
    INSERT INTO templates (id, name, description, config) VALUES (?, ?, ?, ?)
  `);

  for (const t of templates) {
    insertTemplate.run(t.id, t.name, t.description, t.config);
    console.log(`  ✓ ${t.name}`);
  }

  db.close();

  console.log('\n✅ Database initialized successfully!');
  console.log(`📁 Location: ${DB_PATH}\n`);
}

main().catch(err => {
  console.error('❌ Failed to initialize database:', err.message);
  process.exit(1);
});