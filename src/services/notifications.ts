// ============================================================================
// CLAW-TEMPLE - Notifications Service
// ============================================================================

import { Server as SocketIOServer } from 'socket.io';
import { NotificationPayload } from '../types/index.js';
import { logger } from '../utils/logger.js';

export function setupSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('join', (room: string) => {
      socket.join(room);
      logger.debug(`Client ${socket.id} joined room: ${room}`);
    });

    socket.on('leave', (room: string) => {
      socket.leave(room);
      logger.debug(`Client ${socket.id} left room: ${room}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket handlers initialized');
}

export class NotificationService {
  private io: SocketIOServer | null = null;

  setSocketServer(io: SocketIOServer): void {
    this.io = io;
  }

  sendBrowserNotification(payload: NotificationPayload): void {
    if (!this.io) {
      logger.warn('Socket server not initialized');
      return;
    }

    this.io.emit('notification', payload);
    logger.debug('Browser notification sent', { title: payload.title });
  }

  async sendTelegramNotification(
    message: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    try {
      // This would integrate with OpenClaw's Telegram bot
      // For now, we'll emit it through the socket for the frontend to handle
      
      this.io?.emit('notification', {
        title: 'Telegram Alert',
        body: message,
        type: priority === 'high' ? 'warning' : 'info'
      });

      logger.debug('Telegram notification queued', { message, priority });
    } catch (error) {
      logger.error('Failed to send Telegram notification', { error: (error as Error).message });
    }
  }

  sendTaskNotification(
    taskId: string,
    action: 'created' | 'started' | 'completed' | 'failed',
    details: string
  ): void {
    const titles: Record<string, string> = {
      created: '📝 New Task',
      started: '🚀 Task Started',
      completed: '✅ Task Completed',
      failed: '❌ Task Failed'
    };

    this.sendBrowserNotification({
      title: titles[action],
      body: details,
      type: action === 'failed' ? 'error' : 'success',
      taskId
    });
  }

  sendAgentNotification(
    poolName: string,
    action: 'started' | 'completed' | 'failed',
    taskTitle: string
  ): void {
    const titles: Record<string, string> = {
      started: '🤖 Agent Started',
      completed: '🤖 Agent Completed',
      failed: '🤖 Agent Failed'
    };

    this.sendBrowserNotification({
      title: `${titles[action]} (${poolName})`,
      body: taskTitle,
      type: action === 'failed' ? 'error' : 'info'
    });
  }
}

export const notificationService = new NotificationService();