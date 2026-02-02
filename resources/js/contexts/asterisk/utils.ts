import type { WebSocketMessageData } from './types';

/**
 * Outbound event types
 */
const OUTBOUND_EVENTS = [
    'outbound_agent_dial',
    'outbound_client_dial',
    'outbound_connect',
    'outbound_hangup',
] as const;

/**
 * Call event types
 */
export const CALL_EVENTS = [
    'ring',
    'connect',
    'disconnect',
    'hangup',
    'stop_ringing',
    'outbound_agent_dial',
    'outbound_client_dial',
    'outbound_connect',
    'outbound_hangup',
] as const;

/**
 * Check if a WebSocket message is an outbound call event
 */
export function isOutboundEvent(data: WebSocketMessageData): boolean {
    if (OUTBOUND_EVENTS.includes(data.event as (typeof OUTBOUND_EVENTS)[number])) {
        return true;
    }

    if (data.direction === 'outbound' || data.call_direction === 'outbound') {
        return true;
    }

    if (data.routing_info?.call_direction === 'outbound') {
        return true;
    }

    return false;
}

/**
 * Check if an event is a call-related event
 */
export function isCallEvent(data: WebSocketMessageData): boolean {
    return Boolean(data.event && CALL_EVENTS.includes(data.event as (typeof CALL_EVENTS)[number]));
}

/**
 * Get session ID from message (handles both formats)
 */
export function getSessionId(data: WebSocketMessageData): string | undefined {
    return data.sessionId || data.session_id;
}

/**
 * Get lead ID from message (handles both formats)
 */
export function getLeadId(data: WebSocketMessageData): string | undefined {
    return data.leadId || data.lead_id;
}

/**
 * Map generic events to outbound-specific events
 */
export function mapToOutboundEvent(event: string): string {
    switch (event) {
        case 'connect':
            return 'outbound_connect';
        case 'hangup':
            return 'outbound_hangup';
        default:
            return event;
    }
}

/**
 * Create a message ID
 */
export function createMessageId(): string {
    return Date.now().toString();
}

/**
 * Log WebSocket event with emoji prefix
 */
export function logWs(emoji: string, message: string, data?: Record<string, unknown>): void {
    if (data) {
        console.log(`${emoji} [WebSocket] ${message}`, data);
    } else {
        console.log(`${emoji} [WebSocket] ${message}`);
    }
}
