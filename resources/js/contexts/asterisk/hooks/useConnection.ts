import { useCallback, useRef } from 'react';
import type { AsteriskWebSocketState, AsteriskWebSocketAction, WebSocketMessageData } from '../types';
import { processMessage } from '../handlers';
import { logWs } from '../utils';

interface UseConnectionOptions {
    state: AsteriskWebSocketState;
    dispatch: React.Dispatch<AsteriskWebSocketAction>;
    userExtension: string | undefined;
}

interface UseConnectionReturn {
    wsRef: React.MutableRefObject<WebSocket | null>;
    reconnectTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
    shouldReconnectRef: React.MutableRefObject<boolean>;
    connect: () => void;
    disconnect: () => void;
    sendMessage: (message: Record<string, unknown>) => void;
}

/**
 * Hook for managing WebSocket connection
 */
export function useConnection({ state, dispatch, userExtension }: UseConnectionOptions): UseConnectionReturn {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const shouldReconnectRef = useRef<boolean>(true);

    const connect = useCallback(() => {
        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        // Close existing connection
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        try {
            logWs('🔌', 'Connecting to:', { url: state.config.url });
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });

            const ws = new WebSocket(state.config.url);

            ws.onopen = () => {
                logWs('✅', 'Connected successfully');
                dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
                dispatch({ type: 'SET_LAST_CONNECTED', payload: new Date() });
                dispatch({ type: 'RESET_RECONNECT_ATTEMPTS' });

                // Register extension for targeted notifications
                if (userExtension) {
                    ws.send(JSON.stringify({ exten: userExtension, login: true }));
                    logWs('🔔', 'Registered extension:', { extension: userExtension });
                } else {
                    console.warn('⚠️ [WebSocket] No user extension configured - inbound call notifications will NOT work');
                }
            };

            ws.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data) as WebSocketMessageData;
                    await processMessage(data, dispatch);
                } catch (error) {
                    console.error('❌ [WebSocket] Failed to parse message:', error);
                    dispatch({ type: 'ADD_ERROR', payload: 'Failed to parse message from server' });
                }
            };

            ws.onerror = (error) => {
                console.error('❌ [WebSocket] Connection error:', error);
                dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
                dispatch({ type: 'ADD_ERROR', payload: 'WebSocket connection error' });
            };

            ws.onclose = (event) => {
                logWs('🔴', 'Connection closed:', {
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean,
                });
                dispatch({ type: 'SET_LAST_DISCONNECTED', payload: new Date() });

                // Attempt reconnect
                if (shouldReconnectRef.current && state.reconnectAttempts < state.config.maxReconnectAttempts) {
                    logWs('🔄', 'Attempting reconnect...');
                    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'reconnecting' });
                    dispatch({ type: 'INCREMENT_RECONNECT_ATTEMPTS' });

                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, state.config.reconnectInterval);
                } else {
                    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
                    if (state.reconnectAttempts >= state.config.maxReconnectAttempts) {
                        console.error('❌ [WebSocket] Max reconnection attempts reached');
                        dispatch({ type: 'ADD_ERROR', payload: 'Max reconnection attempts reached' });
                    }
                }
            };

            wsRef.current = ws;
        } catch (error) {
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
            const errorMessage = error instanceof Error ? error.message : 'Failed to create WebSocket connection';
            dispatch({ type: 'ADD_ERROR', payload: errorMessage });
        }
    }, [
        state.config.url,
        state.config.reconnectInterval,
        state.config.maxReconnectAttempts,
        state.reconnectAttempts,
        userExtension,
        dispatch,
    ]);

    const disconnect = useCallback(() => {
        shouldReconnectRef.current = false;

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
        dispatch({ type: 'RESET_RECONNECT_ATTEMPTS' });
    }, [dispatch]);

    const sendMessage = useCallback(
        (message: Record<string, unknown>) => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                try {
                    wsRef.current.send(JSON.stringify(message));
                    dispatch({ type: 'INCREMENT_MESSAGES_SENT' });
                } catch {
                    dispatch({ type: 'ADD_ERROR', payload: 'Failed to send message' });
                }
            } else {
                console.warn('WebSocket is not connected. Cannot send message.');
            }
        },
        [dispatch]
    );

    return {
        wsRef,
        reconnectTimeoutRef,
        shouldReconnectRef,
        connect,
        disconnect,
        sendMessage,
    };
}
