// ============================================================================
// CLAW-TEMPLE - OpenRouter Service
// ============================================================================

import { OpenRouterModel } from '../types/index.js';

let cachedModels: OpenRouterModel[] | null = null;
let cacheExpiry: number = 0;

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function getOpenRouterModels(): Promise<OpenRouterModel[]> {
  // Check cache
  if (cachedModels && Date.now() < cacheExpiry) {
    return cachedModels;
  }

  try {
    // Try to fetch from OpenClaw config first
    const openclawConfig = await loadOpenClawConfig();
    const apiKey = openclawConfig?.OPENROUTER_API_KEY;

    if (!apiKey) {
      // Return mock data if no API key
      logger.warn('No OpenRouter API key found, using mock data');
      return getMockModels();
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json() as { data: Array<{ id: string; name: string; pricing: { prompt: number; completion: number }; context_length: number }> };

    cachedModels = data.data.map(model => ({
      id: model.id,
      name: model.name,
      pricing: {
        prompt: model.pricing.prompt,
        completion: model.pricing.completion
      },
      contextLength: model.context_length
    }));

    cacheExpiry = Date.now() + CACHE_DURATION;

    return cachedModels;
  } catch (error) {
    logger.error('Failed to fetch OpenRouter models', { error: (error as Error).message });
    return getMockModels();
  }
}

export async function estimateCost(modelId: string, inputTokens: number, outputTokens: number): Promise<number> {
  const models = await getOpenRouterModels();
  const model = models.find(m => m.id === modelId);

  if (!model) return 0;

  const inputCost = (inputTokens / 1000) * model.pricing.prompt;
  const outputCost = (outputTokens / 1000) * model.pricing.completion;

  return inputCost + outputCost;
}

function getMockModels(): OpenRouterModel[] {
  return [
    {
      id: 'openrouter/auto',
      name: 'Auto (Best for task)',
      pricing: { prompt: 0.00001, completion: 0.00003 },
      contextLength: 128000
    },
    {
      id: 'deepseek/deepseek-chat',
      name: 'DeepSeek Chat',
      pricing: { prompt: 0.000014, completion: 0.000028 },
      contextLength: 64000
    },
    {
      id: 'moonshotai/kimi-k2.5',
      name: 'Kimi K2.5',
      pricing: { prompt: 0.00002, completion: 0.00006 },
      contextLength: 200000
    },
    {
      id: 'google/gemini-3-flash-preview',
      name: 'Gemini 3 Flash',
      pricing: { prompt: 0.00001, completion: 0.00003 },
      contextLength: 1000000
    },
    {
      id: 'xiaomi/mimo-v2-flash',
      name: 'Xiaomi Mimo Flash',
      pricing: { prompt: 0.000008, completion: 0.00002 },
      contextLength: 131072
    }
  ];
}

async function loadOpenClawConfig(): Promise<Record<string, string> | null> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const configPath = path.join(process.env.OPENCLAW_DIR || '/home/dp420/.openclaw', 'gateway.yaml');
    
    if (!fs.existsSync(configPath)) {
      return null;
    }

    // Simple YAML parsing for API key
    const content = fs.readFileSync(configPath, 'utf-8');
    const match = content.match(/openrouter_api_key:\s*(.+)/);
    
    if (match) {
      return { OPENROUTER_API_KEY: match[1].trim() };
    }

    return null;
  } catch {
    return null;
  }
}

// Import logger
import { logger } from '../utils/logger.js';