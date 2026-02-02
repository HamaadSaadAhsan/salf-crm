'use strict';

const Logger = require('../../logger');
const Broadcaster = require('../../broadcaster');
const SessionManager = require('../../session-manager');
const SessionsDB = require('../../database/sessions');
const LogsDB = require('../../database/logs');
const MessageBuilder = require('../../message-builder');
const { extractExtensionFromChannel } = require('../../utils');

/**
 * Outbound call event handlers
 */
const OutboundHandlers = {
    /**
     * Handle DialBegin for outbound calls
     * @param {Object} evt - AMI event
     * @param {Object} sessionData - Session data
     */
    async handleDialBegin(evt, sessionData) {
        const targetExtension = extractExtensionFromChannel(evt.destchannel);

        // Check if this dial is to the agent (first leg) vs to the client (second leg)
        const isDialingAgent = sessionData.agent === targetExtension;
        const isDialingClient = sessionData.client === evt.dialstring || evt.dialstring?.includes(sessionData.client);

        if (isDialingAgent) {
            Logger.info('📤 OUTBOUND CALL - Agent leg dial detected', {
                linkedid: evt.linkedid || 'pending',
                uniqueid: evt.uniqueid || 'pending',
                agent: sessionData.agent,
                client: sessionData.client,
                destchannel: evt.destchannel,
                session_id: sessionData.session_id,
            });

            // Mark session for broadcast when we have IDs
            sessionData.pendingOutboundAgentDial = true;
            sessionData.outboundTargetExtension = targetExtension;
            sessionData.outboundDestChannel = evt.destchannel;
            sessionData.outboundChannel = evt.channel;

            // Update session with uniqueid/linkedid if available
            if (evt.uniqueid && evt.linkedid) {
                sessionData.uniqueid = evt.uniqueid;
                sessionData.linkedid = evt.linkedid;
                SessionManager.set(evt.linkedid, sessionData);
                SessionManager.mapUniqueidToSession(evt.uniqueid, sessionData.session_id);

                await SessionsDB.update(sessionData.session_id, { uniqueid: evt.uniqueid });

                // Broadcast immediately
                sessionData.pendingOutboundAgentDial = false;

                const message = MessageBuilder.create('outbound_agent_dial', sessionData)
                    .withCallInfo(evt)
                    .withExtension(targetExtension)
                    .withAgentClient()
                    .withRouting('agent_dial')
                    .with('destination', evt.destchannel)
                    .build();

                Broadcaster.toExtension(message, targetExtension);

                // Clean up pending key
                SessionManager.deleteByKey(`outbound_pending_${targetExtension}`);
            } else {
                Logger.info('📤 OUTBOUND CALL - Deferring broadcast until uniqueid/linkedid available');
            }

            sessionData._lastUpdated = Date.now();
            SessionManager.set(`outbound_pending_${targetExtension}`, sessionData);
            return;
        }

        if (isDialingClient) {
            if (!evt.uniqueid || !evt.linkedid) {
                Logger.warn('📤 OUTBOUND CALL - Missing uniqueid/linkedid for client dial');
                return;
            }

            Logger.info('📤 OUTBOUND CALL - Client leg dial', {
                linkedid: evt.linkedid,
                agent: sessionData.agent,
                client: sessionData.client,
                session_id: sessionData.session_id,
            });

            // Map client leg uniqueid
            SessionManager.mapUniqueidToSession(evt.uniqueid, sessionData.session_id);

            const message = MessageBuilder.create('outbound_client_dial', sessionData)
                .withCallInfo(evt)
                .withAgentClient()
                .withRouting('client_dial')
                .with('dialstring', evt.dialstring)
                .with('destination', evt.destchannel)
                .build();

            Broadcaster.toExtension(message, sessionData.agent);
        }
    },

    /**
     * Handle NewState for outbound calls (agent phone ringing/connected)
     * @param {Object} evt - AMI event
     * @param {Object} sessionData - Session data
     */
    async handleNewState(evt, sessionData) {
        const isConnected = evt.channelstatedesc === 'Up';

        // Link session if not yet linked
        if (!sessionData._linkedToAsterisk && evt.uniqueid && evt.linkedid) {
            sessionData._linkedToAsterisk = true;
            sessionData.uniqueid = evt.uniqueid;
            sessionData.linkedid = evt.linkedid;

            SessionManager.set(evt.uniqueid, sessionData);
            if (evt.linkedid !== evt.uniqueid) {
                SessionManager.set(evt.linkedid, sessionData);
            }

            await SessionsDB.update(sessionData.session_id, { uniqueid: evt.uniqueid });

            await LogsDB.insert({
                session_id: sessionData.session_id,
                log_level: 'info',
                event_type: 'session_linked',
                message: 'Session linked to Asterisk channel',
                context: { uniqueid: evt.uniqueid, linkedid: evt.linkedid },
                source: 'asterisk',
            });

            // Send deferred broadcast if pending
            if (sessionData.pendingOutboundAgentDial) {
                sessionData.pendingOutboundAgentDial = false;
                const targetExt = sessionData.outboundTargetExtension || sessionData.agent;

                const message = MessageBuilder.create('outbound_agent_dial', sessionData)
                    .withCallInfo(evt)
                    .withExtension(targetExt)
                    .withAgentClient()
                    .withRouting('agent_dial')
                    .with('channel', sessionData.outboundChannel)
                    .with('destination', sessionData.outboundDestChannel)
                    .build();

                Broadcaster.toExtension(message, targetExt);

                // Clean up pending key
                const pendingKey = `outbound_pending_${sessionData.agent}`;
                SessionManager.deleteByKey(pendingKey);
            }
        }

        if (isConnected) {
            Logger.info('Outbound call - agent phone connected', {
                agent: sessionData.agent,
                session_id: sessionData.session_id,
            });

            await SessionsDB.update(sessionData.session_id, {
                status: 'answered',
                answered_at: new Date(),
            });

            await LogsDB.insert({
                session_id: sessionData.session_id,
                log_level: 'info',
                event_type: 'answered',
                message: 'Agent phone answered',
                context: { channel: evt.channel },
                source: 'asterisk',
            });
        }
    },

    /**
     * Handle BridgeEnter for outbound calls (client answered)
     * @param {Object} evt - AMI event
     * @param {Object} sessionData - Session data
     */
    async handleBridgeEnter(evt, sessionData) {
        const agent = sessionData.agent || sessionData.caller_number;
        const client = sessionData.client || sessionData.callee_number;

        // Check if this is the client leg
        const isClientChannel =
            evt.channel.includes('CYBER') || (client && evt.channel.includes(client)) || (agent && !evt.channel.includes(agent));

        if (isClientChannel) {
            Logger.info('📤 OUTBOUND CALL - Client answered (BridgeEnter)', {
                linkedid: evt.linkedid,
                agent: agent,
                client: client,
                session_id: sessionData.session_id,
            });

            // Update session
            sessionData.status = 'answered';
            sessionData.answeredAt = new Date();
            sessionData._lastUpdated = Date.now();
            SessionManager.set(evt.linkedid, sessionData);

            const message = MessageBuilder.create('outbound_connect', sessionData)
                .withCallInfo(evt)
                .withAgentClient()
                .withBridge(evt.bridgeuniqueid, evt.bridgetype)
                .withRouting('connected')
                .build();

            Broadcaster.toExtension(message, agent);

            await SessionsDB.update(sessionData.session_id, {
                status: 'answered',
                answered_at: sessionData.answeredAt,
            });

            await LogsDB.insert({
                session_id: sessionData.session_id,
                log_level: 'info',
                event_type: 'outbound_connect',
                message: `Outbound call connected - client ${client} answered`,
                context: { agent, client, linkedid: evt.linkedid },
                source: 'asterisk',
            });
        }
    },

    /**
     * Handle DialEnd for outbound calls (client dial failed)
     * @param {Object} evt - AMI event
     * @param {Object} sessionData - Session data
     */
    async handleDialEnd(evt, sessionData) {
        // Check if this is the client leg
        const isClientLeg = evt.destchannel.includes('CYBER') || evt.destchannel.includes(sessionData.client);

        if (isClientLeg && evt.dialstatus !== 'ANSWER') {
            Logger.info('📤 OUTBOUND CALL - Client dial failed', {
                linkedid: evt.linkedid,
                agent: sessionData.agent,
                client: sessionData.client,
                dialstatus: evt.dialstatus,
                session_id: sessionData.session_id,
            });

            const endReason =
                evt.dialstatus === 'NOANSWER'
                    ? 'no_answer'
                    : evt.dialstatus === 'BUSY'
                      ? 'busy'
                      : evt.dialstatus === 'CANCEL'
                        ? 'cancelled'
                        : evt.dialstatus;

            const message = MessageBuilder.create('outbound_hangup', sessionData)
                .withCallInfo(evt)
                .withAgentClient()
                .withDialStatus(evt.dialstatus)
                .withRouting('dial_failed', { dialstatus: evt.dialstatus })
                .build();

            Broadcaster.toExtension(message, sessionData.agent);

            await SessionsDB.update(sessionData.session_id, {
                status: 'ended',
                ended_at: new Date(),
                end_reason: endReason,
            });

            await LogsDB.insert({
                session_id: sessionData.session_id,
                log_level: 'info',
                event_type: 'outbound_dial_failed',
                message: `Outbound call failed - ${endReason}`,
                context: { agent: sessionData.agent, client: sessionData.client, dialstatus: evt.dialstatus },
                source: 'asterisk',
            });
        }
    },

    /**
     * Handle Hangup for outbound calls
     * @param {Object} evt - AMI event
     * @param {Object} sessionData - Session data
     * @param {Object} dbSession - Database session
     */
    async handleHangup(evt, sessionData, dbSession) {
        const endedAt = new Date();
        let duration = null;

        if (dbSession.answered_at) {
            duration = Math.floor((endedAt - new Date(dbSession.answered_at)) / 1000);
        } else if (dbSession.started_at) {
            duration = Math.floor((endedAt - new Date(dbSession.started_at)) / 1000);
        }

        let recordingPath = null;
        const callSignature = dbSession.call_signature || sessionData.call_signature;
        if (callSignature) {
            recordingPath = `${callSignature}.wav`;
        }

        const endReason = !dbSession.answered_at
            ? parseInt(evt.cause, 10) === 21
                ? 'declined'
                : 'no_answer'
            : 'hangup';

        Logger.info('📤 OUTBOUND CALL - Hangup', {
            agent: sessionData.agent,
            client: sessionData.client,
            duration: duration,
            session_id: sessionData.session_id,
        });

        const message = MessageBuilder.create('outbound_hangup', sessionData)
            .withCallInfo(evt)
            .withAgentClient()
            .withHangupInfo(evt.cause, evt.causetxt, duration, endReason)
            .withRouting('ended', { end_reason: endReason, duration })
            .build();

        Broadcaster.toExtension(message, sessionData.agent);

        await SessionsDB.update(sessionData.session_id, {
            status: 'ended',
            ended_at: endedAt,
            duration: duration,
            end_reason: endReason,
            recording_path: recordingPath,
        });

        await LogsDB.insert({
            session_id: sessionData.session_id,
            log_level: 'info',
            event_type: 'hangup',
            message: `Call ended (${evt.causetxt || evt.cause}), duration: ${duration}s`,
            context: { cause: evt.cause, duration, recording_path: recordingPath },
            source: 'asterisk',
        });

        // Clean up session
        SessionManager.delete(sessionData);
    },
};

module.exports = OutboundHandlers;
