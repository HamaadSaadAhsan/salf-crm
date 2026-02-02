import axios from 'axios';
import { outboundCall } from '@/routes/asterisk';
import type { WebSocketMessageData } from '../types';
import { getSessionId, getLeadId, mapToOutboundEvent, logWs } from '../utils';

/**
 * Handle outbound call events - forward to Laravel backend
 */
export async function handleOutboundEvent(data: WebSocketMessageData): Promise<void> {
    const sessionId = getSessionId(data);
    const leadId = getLeadId(data);
    const routingInfo = data.routing_info;
    const outboundEvent = mapToOutboundEvent(data.event || '');

    logWs('📤', 'Outbound call event, forwarding to Laravel:', {
        event: outboundEvent,
        sessionId,
        leadId,
        phase: routingInfo?.phase,
        agent: data.agent || routingInfo?.agent,
        client: data.client || routingInfo?.client,
    });

    try {
        await axios.post(outboundCall().url, {
            event: outboundEvent,
            session_id: sessionId,
            sessionId: sessionId,
            lead_id: leadId,
            leadId: leadId,
            uniqueid: data.uniqueid,
            linkedid: data.linkedid,
            agent: data.agent || data.agent_extension || routingInfo?.agent,
            client: data.client || routingInfo?.client,
            phase: routingInfo?.phase,
            dialstatus: data.dialstatus || routingInfo?.dialstatus,
            cause: data.cause,
            duration: data.duration || routingInfo?.duration,
            direction: 'outbound',
        });

        logWs('✅', 'Outbound event forwarded to Laravel successfully:', { event: outboundEvent });
    } catch (error) {
        console.error('❌ [WebSocket] Failed to forward outbound call event to Laravel:', error);
        throw error;
    }
}
