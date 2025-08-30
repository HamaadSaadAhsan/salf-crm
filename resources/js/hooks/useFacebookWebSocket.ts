import { useEcho, useEchoNotification } from '@laravel/echo-react';
import { useFacebookIntegration } from '@/contexts/FacebookIntegrationContext';
import '@/lib/echo'; // Initialize Echo configuration

interface FacebookWebSocketEvent {
    integration_id: string;
    timestamp: string;
}

interface FacebookConnectedEvent extends FacebookWebSocketEvent {
    status: 'connected';
    data: any;
}

interface FacebookDisconnectedEvent extends FacebookWebSocketEvent {
    status: 'disconnected';
    reason: string;
}

interface FacebookWebhookReceivedEvent extends FacebookWebSocketEvent {
    webhook_type: string;
    entries_count: number;
}

interface FacebookDataSyncedEvent extends FacebookWebSocketEvent {
    sync_type: string;
    synced_count: number;
    duration?: number;
}

interface FacebookErrorOccurredEvent extends FacebookWebSocketEvent {
    error_type: string;
    error_message: string;
    severity: 'error' | 'warning' | 'info';
}

interface FacebookHealthStatusChangedEvent extends FacebookWebSocketEvent {
    health_status: {
        api: boolean;
        webhooks: boolean;
        permissions: boolean;
    };
    previous_status: {
        api: boolean;
        webhooks: boolean;
        permissions: boolean;
    };
}

interface FacebookLeadProcessedEvent extends FacebookWebSocketEvent {
    lead_id: string | null;
    facebook_lead_id: string | null;
    form_name: string | null;
    action_taken: string;
}

export function useFacebookWebSocket(integrationId?: string, userId?: string) {
    const { actions, dispatch } = useFacebookIntegration();

    // Listen for Facebook connected events
    const connectedHook = useEcho<FacebookConnectedEvent>(
        `integration.${integrationId}`,
        'facebook.connected',
        (event) => {
            console.log('Facebook connected:', event);
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
            dispatch({ type: 'SET_LAST_SYNC', payload: new Date() });
            actions.checkHealth();
        },
        [integrationId, actions, dispatch]
    );

    // Listen for Facebook disconnected events
    const disconnectedHook = useEcho<FacebookDisconnectedEvent>(
        `integration.${integrationId}`,
        'facebook.disconnected',
        (event) => {
            console.log('Facebook disconnected:', event);
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
            dispatch({
                type: 'ADD_ERROR',
                payload: {
                    id: Date.now().toString(),
                    type: 'warning',
                    message: `Facebook integration disconnected: ${event.reason}`,
                    timestamp: new Date(),
                    resolved: false,
                },
            });
        },
        [integrationId, dispatch]
    );

    // Listen for webhook received events
    const webhookHook = useEcho<FacebookWebhookReceivedEvent>(
        `integration.${integrationId}`,
        'facebook.webhook.received',
        (event) => {
            console.log('Facebook webhook received:', event);
            dispatch({ type: 'SET_LAST_SYNC', payload: new Date() });
        },
        [integrationId, dispatch]
    );

    // Listen for data synced events
    const dataSyncedHook = useEcho<FacebookDataSyncedEvent>(
        `integration.${integrationId}`,
        'facebook.data.synced',
        (event) => {
            console.log('Facebook data synced:', event);
            
            const syncType = event.sync_type === 'lead_forms' ? 'leadForms' : 
                           event.sync_type === 'leads' ? 'leads' : 'pages';
            
            dispatch({
                type: 'UPDATE_SYNC_STATUS',
                payload: {
                    type: syncType,
                    status: {
                        isRunning: false,
                        status: 'success',
                        lastRun: new Date(),
                    },
                },
            });
            
            dispatch({ type: 'SET_LAST_SYNC', payload: new Date() });
        },
        [integrationId, dispatch]
    );

    // Listen for error events
    const errorHook = useEcho<FacebookErrorOccurredEvent>(
        `integration.${integrationId}`,
        'facebook.error.occurred',
        (event) => {
            console.error('Facebook error occurred:', event);
            
            dispatch({
                type: 'ADD_ERROR',
                payload: {
                    id: Date.now().toString(),
                    type: event.severity === 'warning' ? 'warning' : 'error',
                    message: `${event.error_type}: ${event.error_message}`,
                    timestamp: new Date(),
                    resolved: false,
                },
            });

            if (event.severity === 'error') {
                dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
            }
        },
        [integrationId, dispatch]
    );

    // Listen for health status changes
    const healthHook = useEcho<FacebookHealthStatusChangedEvent>(
        `integration.${integrationId}`,
        'facebook.health.changed',
        (event) => {
            console.log('Facebook health status changed:', event);
            
            dispatch({
                type: 'UPDATE_HEALTH_STATUS',
                payload: event.health_status,
            });
            
            // Check if health has degraded
            const hasHealthDegraded = Object.keys(event.health_status).some(key => {
                const currentValue = event.health_status[key as keyof typeof event.health_status];
                const previousValue = event.previous_status[key as keyof typeof event.previous_status];
                return previousValue && !currentValue;
            });
            
            if (hasHealthDegraded) {
                dispatch({
                    type: 'ADD_ERROR',
                    payload: {
                        id: Date.now().toString(),
                        type: 'warning',
                        message: 'Facebook integration health has degraded',
                        timestamp: new Date(),
                        resolved: false,
                    },
                });
            }
        },
        [integrationId, dispatch]
    );

    // Listen for lead processed events
    const leadProcessedHook = useEcho<FacebookLeadProcessedEvent>(
        `integration.${integrationId}`,
        'facebook.lead.processed',
        (event) => {
            console.log('Facebook lead processed:', event);
            
            dispatch({ type: 'SET_LAST_SYNC', payload: new Date() });
            
            // Emit custom event for other parts of the app
            window.dispatchEvent(new CustomEvent('facebook-lead-processed', {
                detail: event
            }));
        },
        [integrationId, dispatch]
    );

    // Listen for notifications on user-specific channel
    const notificationHook = useEchoNotification<any>(
        `user.${userId}.facebook-integration`,
        (notification) => {
            console.log('Facebook integration notification:', notification);
            
            if (notification.type === 'facebook_integration') {
                dispatch({
                    type: 'ADD_ERROR',
                    payload: {
                        id: notification.id,
                        type: notification.level,
                        message: notification.message,
                        timestamp: new Date(notification.timestamp),
                        resolved: false,
                    },
                });
            }
        },
        undefined,
        [userId, dispatch]
    );

    return {
        isConnected: true, // The hooks handle connection automatically
        hooks: {
            connected: connectedHook,
            disconnected: disconnectedHook,
            webhook: webhookHook,
            dataSynced: dataSyncedHook,
            error: errorHook,
            health: healthHook,
            leadProcessed: leadProcessedHook,
            notification: notificationHook,
        },
    };
}