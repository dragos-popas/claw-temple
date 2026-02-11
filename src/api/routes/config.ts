// ============================================================================
// CLAW-TEMPLE - Config API Routes
// ============================================================================

import { Router } from 'express';
import { getDb } from '../stores/sqlite.js';

export const configRouter = Router();

// GET all config
configRouter.get('/', (req, res) => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM user_config');
  const rows = stmt.all();

  const config: Record<string, unknown> = {};
  for (const row of rows) {
    config[row.key] = JSON.parse(row.value);
  }

  // Provide defaults if not set
  res.json({
    defaultRepo: config.defaultRepo || 'https://github.com/dragos-popas/location-scrapers',
    columnLimits: config.columnLimits || {
      TODO: 100,
      RESEARCH: 2,
      DEV: 3,
      QA: 2,
      DONE: 100
    },
    notificationSettings: config.notificationSettings || {
      browser: true,
      telegram: true
    },
    theme: config.theme || 'dark'
  });
});

// GET single config value
configRouter.get('/:key', (req, res) => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM user_config WHERE key = ?');
  const row = stmt.get(req.params.key);

  if (!row) {
    return res.status(404).json({ error: 'Config key not found' });
  }

  res.json(JSON.parse(row.value));
});

// SET config value
configRouter.put('/', (req, res) => {
  try {
    const db = getDb();
    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO user_config (key, value) VALUES (?, ?)
    `);

    stmt.run(key, JSON.stringify(value));

    res.json({ key, value });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// UPDATE multiple config values
configRouter.post('/batch', (req, res) => {
  try {
    const db = getDb();
    const updates = req.body as Record<string, unknown>;

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO user_config (key, value) VALUES (?, ?)
    `);

    for (const [key, value] of Object.entries(updates)) {
      stmt.run(key, JSON.stringify(value));
    }

    res.json({ message: 'Config updated', keys: Object.keys(updates) });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE config key
configRouter.delete('/:key', (req, res) => {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM user_config WHERE key = ?');
  const result = stmt.run(req.params.key);

  if ((result.changes as number) === 0) {
    return res.status(404).json({ error: 'Config key not found' });
  }

  res.status(204).send();
});