// ============================================================================
// CLAW-TEMPLE - Socket Handlers
// ============================================================================

import { Server } from 'socket.io';
import { logger } from '../utils/logger.js';

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Join default room for all updates
    socket.join('global');

    socket.on('subscribe:task', (taskId: string) => {
      socket.join(`task:${taskId}`);
      logger.debug(`Client ${socket.id} subscribed to task: ${taskId}`);
    });

    socket.on('unsubscribe:task', (taskId: string) => {
      socket.leave(`task:${taskId}`);
      logger.debug(`Client ${socket.id} unsubscribed from task: ${taskId}`);
    });

    socket.on('subscribe:pool', (poolId: string) => {
      socket.join(`pool:${poolId}`);
      logger.debug(`Client ${socket.id} subscribed to pool: ${poolId}`);
    });

    socket.on('unsubscribe:pool', (poolId: string) => {
      socket.leave(`pool:${poolId}`);
      logger.debug(`Client ${socket.id} unsubscribed from pool: ${poolId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket handlers initialized');
}