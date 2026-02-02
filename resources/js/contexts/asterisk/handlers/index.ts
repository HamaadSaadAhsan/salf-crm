import type { AsteriskMessage, AsteriskWebSocketAction, WebSocketMessageData } from '../types';
import { isOutboundEvent, isCallEvent, createMessageId, logWs } from '../utils';
import { handleOutboundEvent } from './outbound';
import { handleInboundEvent } from './inbound';

/**
 * Process incoming WebSocket message
 */
export async function processMessage(
    data: WebSocketMessageData,
    dispatch: React.Dispatch<AsteriskWebSocketAction>
): Promise<void> {
    const routingInfo = data.routing_info;

    logWs('📨', 'Message received:', {
        event: data.event,
        type: data.type,
        sessionId: data.sessionId || data.session_id,
        leadId: data.leadId || data.lead_id,
        direction: data.direction || data.call_direction || routingInfo?.call_direction,
        targetExtension: data.targetExtension,
        exten: data.exten,
        caller: data.caller,
        uniqueid: data.uniqueid,
    });

    // Add message to history
    const message: AsteriskMessage = {
        id: createMessageId(),
        type: (data.type as string) || 'unknown',
        data: data,
        timestamp: new Date(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: message });

    // Route to appropriate handler
    const isOutbound = isOutboundEvent(data);
    const isCall = isCallEvent(data);

    if (isOutbound && isCall) {
        await handleOutboundEvent(data);
    } else if (isCall && !isOutbound) {
        await handleInboundEvent(data);
    } else {
        logWs('ℹ️', 'Non-call event received (not forwarding):', { event: data.event || data.type });
    }
}

export { handleOutboundEvent } from './outbound';
export { handleInboundEvent } from './inbound';
