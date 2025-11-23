import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { inboundCall } from "@/routes/asterisk"

// Types
export interface AsteriskMessage {
    id: string;
    type: string;
    data: Record<string, unknown>;
    timestamp: Date;
}

export interface AsteriskConnectionConfig {
    url: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
    callerId: string;
    context: string;
    timeout: number;
}

export interface OriginateCallParams {
    extension: string;
    phoneNumber: string;
    leadId: string | number;
    callerId?: string;
    context?: string;
    timeout?: number;
}

interface AsteriskWebSocketState {
    // Connection Status
    connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';
    lastConnectedAt: Date | null;
    lastDisconnectedAt: Date | null;

    // Configuration
    config: AsteriskConnectionConfig;

    // Connection Stats
    reconnectAttempts: number;
    messagesReceived: number;
    messagesSent: number;

    // Messages
    lastMessage: AsteriskMessage | null;
    messageHistory: AsteriskMessage[];

    // Errors
    lastError: string | null;
    errors: Array<{ message: string; timestamp: Date }>;
}

type AsteriskWebSocketAction =
    | { type: 'SET_CONNECTION_STATUS'; payload: AsteriskWebSocketState['connectionStatus'] }
    | { type: 'SET_CONFIG'; payload: Partial<AsteriskConnectionConfig> }
    | { type: 'INCREMENT_RECONNECT_ATTEMPTS' }
    | { type: 'RESET_RECONNECT_ATTEMPTS' }
    | { type: 'ADD_MESSAGE'; payload: AsteriskMessage }
    | { type: 'INCREMENT_MESSAGES_SENT' }
    | { type: 'SET_LAST_CONNECTED'; payload: Date }
    | { type: 'SET_LAST_DISCONNECTED'; payload: Date }
    | { type: 'ADD_ERROR'; payload: string }
    | { type: 'CLEAR_ERRORS' }
    | { type: 'CLEAR_MESSAGE_HISTORY' };

// Initial State
const initialState: AsteriskWebSocketState = {
    connectionStatus: 'disconnected',
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    config: {
        url: import.meta.env.VITE_ASTERISK_WS_URL || 'ws://192.168.100.232:9000',
        reconnectInterval: 5000, // 5 seconds
        maxReconnectAttempts: 10,
        callerId: import.meta.env.ASTERISK_CALLER_ID || '382000002',
        context: import.meta.env.ASTERISK_CONTEXT || 'CRM-call',
        timeout: Number(import.meta.env.ASTERISK_TIMEOUT) || 30000,
    },
    reconnectAttempts: 0,
    messagesReceived: 0,
    messagesSent: 0,
    lastMessage: null,
    messageHistory: [],
    lastError: null,
    errors: [],
};

// Reducer
function asteriskWebSocketReducer(state: AsteriskWebSocketState, action: AsteriskWebSocketAction): AsteriskWebSocketState {
    switch (action.type) {
        case 'SET_CONNECTION_STATUS':
            return { ...state, connectionStatus: action.payload };

        case 'SET_CONFIG':
            return {
                ...state,
                config: { ...state.config, ...action.payload },
            };

        case 'INCREMENT_RECONNECT_ATTEMPTS':
            return {
                ...state,
                reconnectAttempts: state.reconnectAttempts + 1,
            };

        case 'RESET_RECONNECT_ATTEMPTS':
            return {
                ...state,
                reconnectAttempts: 0,
            };

        case 'ADD_MESSAGE':
            return {
                ...state,
                lastMessage: action.payload,
                messagesReceived: state.messagesReceived + 1,
                messageHistory: [...state.messageHistory.slice(-99), action.payload], // Keep last 100 messages
            };

        case 'INCREMENT_MESSAGES_SENT':
            return {
                ...state,
                messagesSent: state.messagesSent + 1,
            };

        case 'SET_LAST_CONNECTED':
            return {
                ...state,
                lastConnectedAt: action.payload,
            };

        case 'SET_LAST_DISCONNECTED':
            return {
                ...state,
                lastDisconnectedAt: action.payload,
            };

        case 'ADD_ERROR':
            return {
                ...state,
                lastError: action.payload,
                errors: [...state.errors.slice(-9), { message: action.payload, timestamp: new Date() }], // Keep last 10 errors
            };

        case 'CLEAR_ERRORS':
            return {
                ...state,
                lastError: null,
                errors: [],
            };

        case 'CLEAR_MESSAGE_HISTORY':
            return {
                ...state,
                messageHistory: [],
                lastMessage: null,
            };

        default:
            return state;
    }
}

// Context
const AsteriskWebSocketContext = createContext<{
    state: AsteriskWebSocketState;
    dispatch: React.Dispatch<AsteriskWebSocketAction>;
    actions: {
        connect: () => void;
        disconnect: () => void;
        sendMessage: (message: Record<string, unknown>) => void;
        makeCall: (params: OriginateCallParams) => Promise<boolean>;
        updateConfig: (config: Partial<AsteriskConnectionConfig>) => void;
        clearMessageHistory: () => void;
        clearErrors: () => void;
    };
    ws: WebSocket | null;
} | null>(null);

// Provider Component
export function AsteriskWebSocketProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(asteriskWebSocketReducer, initialState);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const shouldReconnectRef = useRef<boolean>(true);

    // Connect to WebSocket
    const connect = useCallback(() => {
        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        // Close existing connection if any
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        try {
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });

            const ws = new WebSocket(state.config.url);

            ws.onopen = () => {
                console.log('Asterisk WebSocket connected');
                dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
                dispatch({ type: 'SET_LAST_CONNECTED', payload: new Date() });
                dispatch({ type: 'RESET_RECONNECT_ATTEMPTS' });
                toast.success('Connected to Asterisk Manager');
            };

            ws.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const message: AsteriskMessage = {
                        id: Date.now().toString(),
                        type: data.type || 'unknown',
                        data: data,
                        timestamp: new Date(),
                    };
                    dispatch({ type: 'ADD_MESSAGE', payload: message });
                    console.log('Asterisk message received:', message);

                    // Check if this is an inbound call event and forward to Laravel
                    if (data.event && ['ring', 'connect', 'disconnect', 'hangup'].includes(data.event)) {
                        try {
                            // For inbound calls: caller is the phone number (data.exten)
                            // exten will be determined by backend from auth()->user()->extension
                            await axios.post(inboundCall().url, {
                                event: data.event,
                                caller: data.exten, // The actual phone number calling in
                                uniqueid: data.uniqueid,
                                linkedid: data.linkedid,
                            });
                            console.log('Inbound call event forwarded to Laravel:', data.event);
                        } catch (apiError) {
                            console.error('Failed to forward call event to Laravel:', apiError);
                            // Don't show error to user - this is background processing
                        }
                    }
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                    dispatch({ type: 'ADD_ERROR', payload: 'Failed to parse message from server' });
                }
            };

            ws.onerror = (error) => {
                console.error('Asterisk WebSocket error:', error);
                dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
                dispatch({ type: 'ADD_ERROR', payload: 'WebSocket connection error' });
            };

            ws.onclose = () => {
                console.log('Asterisk WebSocket disconnected');
                dispatch({ type: 'SET_LAST_DISCONNECTED', payload: new Date() });

                // Attempt to reconnect if enabled and within max attempts
                if (shouldReconnectRef.current && state.reconnectAttempts < state.config.maxReconnectAttempts) {
                    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'reconnecting' });
                    dispatch({ type: 'INCREMENT_RECONNECT_ATTEMPTS' });

                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log(`Reconnecting to Asterisk... Attempt ${state.reconnectAttempts + 1}/${state.config.maxReconnectAttempts}`);
                        connect();
                    }, state.config.reconnectInterval);
                } else {
                    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
                    if (state.reconnectAttempts >= state.config.maxReconnectAttempts) {
                        toast.error('Max reconnection attempts reached');
                        dispatch({ type: 'ADD_ERROR', payload: 'Max reconnection attempts reached' });
                    }
                }
            };

            wsRef.current = ws;
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
            const errorMessage = error instanceof Error ? error.message : 'Failed to create WebSocket connection';
            dispatch({ type: 'ADD_ERROR', payload: errorMessage });
            toast.error('Failed to connect to Asterisk Manager');
        }
    }, [state.config.url, state.config.reconnectInterval, state.config.maxReconnectAttempts, state.reconnectAttempts]);

    // Disconnect from WebSocket
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
        toast.info('Disconnected from Asterisk Manager');
    }, []);

    // Send message through WebSocket
    const sendMessage = useCallback((message: Record<string, unknown>) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
                wsRef.current.send(JSON.stringify(message));
                dispatch({ type: 'INCREMENT_MESSAGES_SENT' });
                console.log('Message sent to Asterisk:', message);
            } catch (error) {
                console.error('Failed to send message:', error);
                dispatch({ type: 'ADD_ERROR', payload: 'Failed to send message' });
                toast.error('Failed to send message to Asterisk');
            }
        } else {
            console.warn('WebSocket is not connected. Cannot send message.');
            toast.warning('Not connected to Asterisk Manager');
        }
    }, []);

    // Make a call using Asterisk Originate action
    const makeCall = useCallback(async (params: OriginateCallParams): Promise<boolean> => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
                // Step 1: Create call session and generate signature via API
                // Phone number can be provided directly or retrieved from lead in backend
                const { data } = await axios.post('/api/calls/initiate', {
                    phone_number: params.phoneNumber,
                    lead_id: params.leadId,
                });

                if (!data.success) {
                    throw new Error(data.message || 'Failed to initiate call session');
                }

                const callSignature = data.signature_data.call_signature;
                const callSession = data.call_session;

                // Step 2: Send originate action to Asterisk with signature
                // Use phone number from call session if not provided in params
                const phoneNumber = params.phoneNumber || callSession.callee_number;

                const originateAction = {
                    agent: params.extension,
                    client: phoneNumber,
                    call_signature: callSignature,
                    lead_id: params.leadId,
                    caller_id: params.callerId || state.config.callerId,
                };

                wsRef.current.send(JSON.stringify(originateAction));
                dispatch({ type: 'INCREMENT_MESSAGES_SENT' });

                console.log('Originate call request sent with signature:', originateAction);
                toast.success(`Calling ${phoneNumber}...`);

                return true;
            } catch (error) {
                console.error('Failed to originate call:', error);
                const errorMessage = error instanceof Error
                    ? error.message
                    : (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to initiate call';
                dispatch({ type: 'ADD_ERROR', payload: errorMessage });
                toast.error(errorMessage);
                return false;
            }
        } else {
            console.warn('WebSocket is not connected. Cannot make call.');
            toast.warning('Not connected to Asterisk Manager');
            return false;
        }
    }, []);

    // Update configuration
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

        // Cleanup on unmount
        return () => {
            shouldReconnectRef.current = false;

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }

            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    const contextValue = {
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

// Custom Hook
export function useAsteriskWebSocket() {
    const context = useContext(AsteriskWebSocketContext);
    if (!context) {
        throw new Error('useAsteriskWebSocket must be used within an AsteriskWebSocketProvider');
    }
    return context;
}
