import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Echo from 'laravel-echo';

interface MetricUpdate {
  type: 'lead' | 'conversion' | 'task' | 'activity';
  data: any;
  timestamp: string;
}

interface RealtimeMetricsOptions {
  channel?: string;
  events?: string[];
  enabled?: boolean;
  onUpdate?: (update: MetricUpdate) => void;
}

/**
 * Hook for real-time metrics updates via WebSocket
 */
export function useRealtimeMetrics({
  channel = 'dashboard',
  events = ['MetricUpdated', 'LeadCreated', 'LeadConverted', 'TaskCompleted'],
  enabled = true,
  onUpdate,
}: RealtimeMetricsOptions = {}) {
  const [updates, setUpdates] = useState<MetricUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  // Handle incoming metric updates
  const handleMetricUpdate = useCallback((data: any) => {
    const update: MetricUpdate = {
      type: data.type || 'lead',
      data: data.payload || data,
      timestamp: new Date().toISOString(),
    };

    setUpdates(prev => [update, ...prev].slice(0, 50)); // Keep last 50 updates
    setLastUpdate(new Date());

    // Trigger callback if provided
    if (onUpdate) {
      onUpdate(update);
    }

    // Invalidate relevant queries to refetch data
    switch (update.type) {
      case 'lead':
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'leads-overview'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'lead-analytics'] });
        break;
      case 'conversion':
        queryClient.invalidateQueries({ queryKey: ['metrics', 'conversion'] });
        break;
      case 'task':
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] });
        break;
      case 'activity':
        queryClient.invalidateQueries({ queryKey: ['metrics', 'user-performance'] });
        break;
    }
  }, [onUpdate, queryClient]);

  useEffect(() => {
    if (!enabled) return;

    // Access Echo instance from window (set up in echo.ts)
    const echo = (window as any).Echo as Echo;

    if (!echo) {
      console.warn('Laravel Echo not initialized. Real-time updates disabled.');
      return;
    }

    // Subscribe to channel
    const channelInstance = echo.private(channel);

    // Listen for events
    events.forEach(event => {
      channelInstance.listen(`.${event}`, handleMetricUpdate);
    });

    // Connection status listeners
    echo.connector.socket.on('connect', () => {
      setIsConnected(true);
      console.log('Real-time metrics connected');
    });

    echo.connector.socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Real-time metrics disconnected');
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        channelInstance.stopListening(`.${event}`);
      });
      echo.leaveChannel(`private-${channel}`);
    };
  }, [channel, events, enabled, handleMetricUpdate]);

  // Manual refresh function
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['metrics'] });
  }, [queryClient]);

  // Clear updates history
  const clearUpdates = useCallback(() => {
    setUpdates([]);
  }, []);

  return {
    updates,
    isConnected,
    lastUpdate,
    refresh,
    clearUpdates,
  };
}

/**
 * Hook for live count updates
 */
export function useLiveCount(
  initialCount: number,
  queryKey: string[],
  options?: { enabled?: boolean }
) {
  const [count, setCount] = useState(initialCount);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (options?.enabled === false) return;

    const echo = (window as any).Echo as Echo;
    if (!echo) return;

    // Listen for count updates
    const channel = echo.private('dashboard');

    channel.listen('.CountUpdated', (data: { key: string; count: number }) => {
      if (data.key === queryKey.join(':')) {
        setCount(data.count);
      }
    });

    return () => {
      channel.stopListening('.CountUpdated');
    };
  }, [queryKey, options?.enabled]);

  // Sync with query data
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey.join(':') === queryKey.join(':')) {
        const data: any = queryClient.getQueryData(queryKey);
        if (data && typeof data.count === 'number') {
          setCount(data.count);
        }
      }
    });

    return unsubscribe;
  }, [queryKey, queryClient]);

  return count;
}

/**
 * Hook for real-time notifications
 */
export function useRealtimeNotifications(userId: number) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const echo = (window as any).Echo as Echo;
    if (!echo) return;

    const channel = echo.private(`App.Models.User.${userId}`);

    channel.notification((notification: any) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      echo.leaveChannel(`private-App.Models.User.${userId}`);
    };
  }, [userId]);

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearNotifications,
  };
}