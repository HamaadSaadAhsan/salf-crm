import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';
import type {
    AsteriskContextValue,
    AsteriskConnectionConfig,
    AsteriskWebSocketState,
    AsteriskWebSocketAction,
    OriginateCallParams,
    AsteriskMessage,
} from './types';
import { asteriskReducer, initialState } from './reducer';
import { useConnection } from './hooks/useConnection';
import { useCall } from './hooks/useCall';

/**
 * Asterisk WebSocket Context
 */
const AsteriskWebSocketContext = createContext<AsteriskContextValue | null>(null);

/**
 * Asterisk WebSocket Provider
 */
export function AsteriskWebSocketProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(asteriskReducer, initialState);

    // Get user's extension from auth
    const { auth } = usePage<SharedData>().props;
    const userExtension = auth?.user?.extension;

    // Connection hook
    const { wsRef, reconnectTimeoutRef, shouldReconnectRef, connect, disconnect, sendMessage } = useConnection({
        state,
        dispatch,
        userExtension,
    });

    // Call hook
    const { makeCall } = useCall({ wsRef, dispatch });

    // Config update
    const updateConfig = useCallback((config: Partial<AsteriskConnectionConfig>) => {
        dispatch({ type: 'SET_CONFIG', payload: config });
    }, []);

    // Clear message history
    const clearMessageHistory = useCallback(() => {
        dispatch({ type: 'CLEAR_MESSAGE_HISTORY' });
    }, []);

    // Clear errors
    const clearErrors = useCallback(() => {
        dispatch({ type: 'CLEAR_ERRORS' });
    }, []);

    // Auto-connect on mount
    useEffect(() => {
        shouldReconnectRef.current = true;
        connect();

        return () => {
            shouldReconnectRef.current = false;

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }

            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect, shouldReconnectRef, reconnectTimeoutRef, wsRef]);

    const contextValue: AsteriskContextValue = {
        state,
        dispatch,
        actions: {
            connect,
            disconnect,
            sendMessage,
            makeCall,
            updateConfig,
            clearMessageHistory,
            clearErrors,
        },
        ws: wsRef.current,
    };

    return <AsteriskWebSocketContext.Provider value={contextValue}>{children}</AsteriskWebSocketContext.Provider>;
}

/**
 * Hook to use Asterisk WebSocket context
 */
export function useAsteriskWebSocket(): AsteriskContextValue {
    const context = useContext(AsteriskWebSocketContext);
    if (!context) {
        throw new Error('useAsteriskWebSocket must be used within an AsteriskWebSocketProvider');
    }
    return context;
}

// Re-export types
export type {
    AsteriskMessage,
    AsteriskConnectionConfig,
    OriginateCallParams,
    AsteriskWebSocketState,
    AsteriskWebSocketAction,
    AsteriskContextValue,
};
