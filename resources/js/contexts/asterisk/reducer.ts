import type { AsteriskWebSocketState, AsteriskWebSocketAction, AsteriskConnectionConfig } from './types';

/**
 * Default configuration
 */
const defaultConfig: AsteriskConnectionConfig = {
    url: import.meta.env.VITE_ASTERISK_WS_URL || 'ws://192.168.100.232:9000',
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    callerId: import.meta.env.ASTERISK_CALLER_ID || '382000002',
    context: import.meta.env.ASTERISK_CONTEXT || 'CRM-call',
    timeout: Number(import.meta.env.ASTERISK_TIMEOUT) || 30000,
};

/**
 * Initial state
 */
export const initialState: AsteriskWebSocketState = {
    connectionStatus: 'disconnected',
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    config: defaultConfig,
    reconnectAttempts: 0,
    messagesReceived: 0,
    messagesSent: 0,
    lastMessage: null,
    messageHistory: [],
    lastError: null,
    errors: [],
};

/**
 * Maximum items to keep in history
 */
const MAX_MESSAGE_HISTORY = 100;
const MAX_ERROR_HISTORY = 10;

/**
 * State reducer for Asterisk WebSocket
 */
export function asteriskReducer(
    state: AsteriskWebSocketState,
    action: AsteriskWebSocketAction
): AsteriskWebSocketState {
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
                messageHistory: [...state.messageHistory.slice(-(MAX_MESSAGE_HISTORY - 1)), action.payload],
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
                errors: [
                    ...state.errors.slice(-(MAX_ERROR_HISTORY - 1)),
                    { message: action.payload, timestamp: new Date() },
                ],
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
