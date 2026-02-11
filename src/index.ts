// ============================================================================
// CLAW-TEMPLE - Main Entry Point
// ============================================================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { router as apiRouter } from './api/router.js';
import { setupSocketHandlers } from './socket/index.js';
import { logger } from './utils/logger.js';
import { initDatabase } from './stores/sqlite.js';
import { loadConfig } from './utils/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Make io accessible to routes
app.set('io', io);

// API Routes
app.use('/api', apiRouter);

// Socket handlers
setupSocketHandlers(io);

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

async function main() {
  try {
    // Load config
    const config = loadConfig();
    logger.info('Configuration loaded', { port: config.PORT, host: config.HOST });

    // Initialize database
    await initDatabase(config.DATABASE_PATH);
    logger.info('Database initialized');

    // Start server
    httpServer.listen(config.PORT, config.HOST, () => {
      logger.info(`🦀 CLAW-TEMPLE running on http://${config.HOST}:${config.PORT}`);
      logger.info('Ready for cyberpunk orchestration!');
    });
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
}

main();