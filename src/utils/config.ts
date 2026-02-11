// ============================================================================
// CLAW-TEMPLE - Configuration Loader
// ============================================================================

export interface Config {
  PORT: number;
  HOST: string;
  DATABASE_PATH: string;
  WORKTREE_BASE: string;
  OPENCLAW_DIR: string;
  OPENCLAW_GATEWAY_URL: string;
}

export function loadConfig(): Config {
  return {
    PORT: parseInt(process.env.PORT || '3000', 10),
    HOST: process.env.HOST || '0.0.0.0',
    DATABASE_PATH: process.env.DATABASE_PATH || './data/claw-temple.db',
    WORKTREE_BASE: process.env.WORKTREE_BASE || './worktrees',
    OPENCLAW_DIR: process.env.OPENCLAW_DIR || '/home/dp420/.openclaw',
    OPENCLAW_GATEWAY_URL: process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:11434'
  };
}

export function getEnv(name: string, required = false): string | undefined {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}