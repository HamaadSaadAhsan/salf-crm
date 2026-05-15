import axios from '@/lib/http';
import { inboundCall } from '@/routes/asterisk';
import type { WebSocketMessageData } from '../types';
import { getSessionId, getLeadId, logWs } from '../utils';

/**
 * Check if inbound event has valid caller data
 */
export function hasValidCaller(data: WebSocketMessageData): boolean {
    return Boolean(data.caller || data.calleridnum);
}

/**
 * Handle inbound call events - forward to Laravel backend
 */
export async function handleInboundEvent(data: WebSocketMessageData): Promise<void> {
    if (!hasValidCaller(data)) {
        logWs('ℹ️', 'Skipping inbound event with undefined caller:', { event: data.event });
        return;
    }

    const sessionId = getSessionId(data);
    const leadId = getLeadId(data);

    logWs('📞', 'Inbound call event, forwarding to Laravel:', {
        event: data.event,
        sessionId,
        caller: data.caller || data.calleridnum,
    });

    try {
        await axios.post(inboundCall().url, {
            event: data.event,
            caller: data.caller || data.calleridnum,
            exten: data.exten || data.targetExtension,
            uniqueid: data.uniqueid,
            linkedid: data.linkedid,
            targetExtension: data.targetExtension,
            reason: data.reason,
            dialstatus: data.dialstatus,
            session_id: sessionId,
            sessionId: sessionId,
            lead_id: leadId,
            leadId: leadId,
            direction: 'inbound',
            call_direction: 'inbound',
        });

        logWs('✅', 'Inbound event forwarded to Laravel successfully:', { event: data.event });
    } catch (error) {
        console.error('❌ [WebSocket] Failed to forward inbound call event to Laravel:', error);
        throw error;
    }
}
