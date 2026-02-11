import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useTasks } from './useTasks';
import { useAgents } from './useAgents';

const SOCKET_URL = import.meta.env.VITE_API_URL || '';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { refreshTasks } = useTasks();
  const { refreshPools } = useAgents();

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.join('global');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('task:created', () => {
      refreshTasks();
    });

    socket.on('task:updated', () => {
      refreshTasks();
    });

    socket.on('task:moved', () => {
      refreshTasks();
    });

    socket.on('task:deleted', () => {
      refreshTasks();
    });

    socket.on('agent:pool:paused', () => {
      refreshPools();
    });

    socket.on('agent:pool:resumed', () => {
      refreshPools();
    });

    socket.on('notification', (payload) => {
      showBrowserNotification(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, [refreshTasks, refreshPools]);

  const subscribeToTask = useCallback((taskId: string) => {
    socketRef.current?.emit('subscribe:task', taskId);
  }, []);

  const unsubscribeFromTask = useCallback((taskId: string) => {
    socketRef.current?.emit('unsubscribe:task', taskId);
  }, []);

  const subscribeToPool = useCallback((poolId: string) => {
    socketRef.current?.emit('subscribe:pool', poolId);
  }, []);

  return {
    socket: socketRef.current,
    subscribeToTask,
    unsubscribeFromTask,
    subscribeToPool
  };
}

function showBrowserNotification(payload: { title: string; body: string; type: string }) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(payload.title, {
      body: payload.body,
      icon: '/favicon.ico'
    });
  }
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}