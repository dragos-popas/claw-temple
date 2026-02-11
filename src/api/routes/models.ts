// ============================================================================
// CLAW-TEMPLE - Models API Routes (OpenRouter)
// ============================================================================

import { Router } from 'express';
import { getOpenRouterModels } from '../services/openrouter.js';

export const modelsRouter = Router();

// GET all models with pricing
modelsRouter.get('/', async (req, res) => {
  try {
    const models = await getOpenRouterModels();
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET single model
modelsRouter.get('/:id', async (req, res) => {
  try {
    const models = await getOpenRouterModels();
    const model = models.find(m => m.id === req.params.id);
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    res.json(model);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});