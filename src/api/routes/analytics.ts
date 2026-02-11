// ============================================================================
// CLAW-TEMPLE - Analytics API Routes
// ============================================================================

import { Router } from 'express';
import { getSpendMetrics, getProductivityMetrics, getModelUsage, getQueueMetrics } from '../services/analytics.js';

export const analyticsRouter = Router();

// GET spend metrics
analyticsRouter.get('/spend', async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    const metrics = await getSpendMetrics(period as 'daily' | 'weekly' | 'monthly');
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET productivity metrics
analyticsRouter.get('/productivity', async (req, res) => {
  try {
    const metrics = await getProductivityMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET model usage
analyticsRouter.get('/model-usage', async (req, res) => {
  try {
    const metrics = await getModelUsage();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET queue metrics
analyticsRouter.get('/queue', async (req, res) => {
  try {
    const metrics = await getQueueMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET dashboard summary
analyticsRouter.get('/dashboard', async (req, res) => {
  try {
    const [spend, productivity, modelUsage, queue] = await Promise.all([
      getSpendMetrics('daily'),
      getProductivityMetrics(),
      getModelUsage(),
      getQueueMetrics()
    ]);

    res.json({
      spend,
      productivity,
      modelUsage,
      queue,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});