// ============================================================================
// CLAW-TEMPLE - Database Initialization Script
// ============================================================================

import { initDatabase } from './src/stores/sqlite.js';
import { logger } from './src/utils/logger.js';
import { loadConfig } from './src/utils/config.js';

async function main() {
  try {
    logger.info('Initializing CLAW-TEMPLE database...');

    const config = loadConfig();
    initDatabase(config.DATABASE_PATH);

    logger.info('Database initialized successfully!');
    logger.info(`Database location: ${config.DATABASE_PATH}`);

    process.exit(0);
  } catch (error) {
    logger.error('Failed to initialize database', { error: (error as Error).message });
    process.exit(1);
  }
}

main();