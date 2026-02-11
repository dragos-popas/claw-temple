// ============================================================================
// CLAW-TEMPLE - SQLite Database Store
// ============================================================================

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDirSync } from 'fs-extra';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Database.Database | null = null;

export function initDatabase(dbPath?: string): Database.Database {
  if (db) return db;

  const finalPath = dbPath || path.resolve(__dirname, '../../data/claw-temple.db');
  
  // Ensure data directory exists
  ensureDirSync(path.dirname(finalPath));

  db = new Database(finalPath);
  db.pragma('journal_mode = WAL');
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Initialize tables
  createTables();

  logger.info(`Database initialized at ${finalPath}`);
  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function createTables() {
  const db = getDb();

  // Tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
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
    CREATE TABLE IF NOT EXISTS agent_pools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '🤖',
      default_model TEXT,
      max_parallel INTEGER DEFAULT 3,
      cost_limit REAL,
      auto_accept BOOLEAN DEFAULT 0,
      timeout_minutes INTEGER DEFAULT 60,
      retry_count INTEGER DEFAULT 2,
      notification_mode TEXT DEFAULT 'both',
      is_paused BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Agent instances table
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_instances (
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
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      config TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Analytics events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      event_data TEXT,
      cost REAL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Worktrees table
  db.exec(`
    CREATE TABLE IF NOT EXISTS worktrees (
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
    CREATE TABLE IF NOT EXISTS user_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Create indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_pool ON tasks(pool_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_agent_instances_status ON agent_instances(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp)`);

  logger.info('Database tables created');
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    logger.info('Database closed');
  }
}