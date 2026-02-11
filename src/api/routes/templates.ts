// ============================================================================
// CLAW-TEMPLE - Templates API Routes
// ============================================================================

import { Router } from 'express';
import { getDb } from '../stores/sqlite.js';
import { randomUUID } from 'crypto';
import { Template, TemplateConfig, TaskStatus } from '../types/index.js';

export const templatesRouter = Router();

// Pre-built template configs
const defaultTemplates: Omit<Template, 'id' | 'createdAt'>[] = [
  {
    name: 'Web Crawler',
    description: 'Build a web crawler/scraper with target domain, library selection, and crawl strategy',
    config: {
      columns: ['RESEARCH', 'DEV', 'QA', 'DONE'],
      defaults: { poolId: 'dev' },
      autoAdvance: true
    }
  },
  {
    name: 'Bug Fix',
    description: 'Quick bug fix workflow - Dev to QA',
    config: {
      columns: ['DEV', 'QA', 'DONE'],
      defaults: {},
      autoAdvance: true
    }
  },
  {
    name: 'Research Sprint',
    description: 'Research-only task - gather information and produce report',
    config: {
      columns: ['RESEARCH', 'DONE'],
      defaults: {},
      autoAdvance: true
    }
  },
  {
    name: 'Quick Task',
    description: 'Minimal workflow for quick tasks',
    config: {
      columns: ['DEV', 'DONE'],
      defaults: {},
      autoAdvance: true
    }
  }
];

// GET all templates
templatesRouter.get('/', (req, res) => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM templates ORDER BY name ASC');
  const rows = stmt.all();
  
  const templates = rows.map((row: Record<string, unknown>) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    config: JSON.parse(row.config as string),
    createdAt: row.created_at
  }));

  res.json(templates);
});

// GET single template
templatesRouter.get('/:id', (req, res) => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM templates WHERE id = ?');
  const row = stmt.get(req.params.id);

  if (!row) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.json({
    id: row.id,
    name: row.name,
    description: row.description,
    config: JSON.parse(row.config as string),
    createdAt: row.created_at
  });
});

// CREATE template
templatesRouter.post('/', (req, res) => {
  try {
    const db = getDb();
    const id = randomUUID();
    const config = req.body.config as TemplateConfig;

    if (!req.body.name || !config) {
      return res.status(400).json({ error: 'Name and config are required' });
    }

    const stmt = db.prepare(`
      INSERT INTO templates (id, name, description, config)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, req.body.name, req.body.description || null, JSON.stringify(config));

    res.status(201).json({
      id,
      name: req.body.name,
      description: req.body.description,
      config,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// UPDATE template
templatesRouter.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const config = req.body.config;

    const stmt = db.prepare(`
      UPDATE templates SET name = ?, description = ?, config = ?
      WHERE id = ?
    `);

    stmt.run(
      req.body.name,
      req.body.description || null,
      JSON.stringify(config),
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);

    res.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      config: JSON.parse(updated.config as string),
      createdAt: updated.created_at
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE template
templatesRouter.delete('/:id', (req, res) => {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM templates WHERE id = ?');
  const result = stmt.run(req.params.id);

  if ((result.changes as number) === 0) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.status(204).send();
});

// SEED default templates
templatesRouter.post('/seed', (req, res) => {
  try {
    const db = getDb();
    const created: string[] = [];

    for (const template of defaultTemplates) {
      const id = randomUUID();
      const stmt = db.prepare(`
        INSERT INTO templates (id, name, description, config)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run(id, template.name, template.description, JSON.stringify(template.config));
      created.push(template.name);
    }

    res.json({ message: 'Templates created', templates: created });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});