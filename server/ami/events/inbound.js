'use strict';

const CONFIG = require('../../config');
const Logger = require('../../logger');
const Broadcaster = require('../../broadcaster');
const SessionManager = require('../../session-manager');
const SessionsDB = require('../../database/sessions');
const LogsDB = require('../../database/logs');
const LeadsDB = require('../../database/leads');
const UsersDB = require('../../database/users');
const MessageBuilder = require('../../message-builder');
const { MessageType } = require('../../constants');
const { extractExtensionFromChannel, isAgentExtension } = require('../../utils');
const { getAMI } = require('../state');

/**
 * Inbound call event handlers
 */
const InboundHandlers = {
    /**
     * Handle DialBegin for inbound calls (ring to extension)
     * @param {Object} evt - AMI event
     * @param {Object} sessionData - Session data (may be null)
     */
    async handleDialBegin(evt, sessionData) {
        const targetExtension = extractExtensionFromChannel(evt.destchannel);
        const callerNumber = evt.calleridnum || evt.connectedlinenum;

        Logger.info('📞 DIAL_BEGIN EVENT - Inbound call ringing', {
            linkedid: evt.linkedid,
            destchannel: evt.destchannel,
            targetExtension: targetExtension,
            calleridnum: callerNumber,
        });

        // Create or update session
        if (sessionData) {
            sessionData.currentRingingExtension = targetExtension;
            sessionData._lastUpdated = Date.now();
            SessionManager.set(evt.linkedid, sessionData);
        } else {
            sessionData = {
                linkedid: evt.linkedid,
                uniqueid: evt.uniqueid,
                currentRingingExtension: targetExtension,
                calleridnum: callerNumber,
                call_direction: 'inbound',
            };
            SessionManager.set(evt.linkedid, sessionData);
        }

        // Fetch lead data
        const leadData = await LeadsDB.fetchByPhone(callerNumber);

        const message = MessageBuilder.create(MessageType.RING, sessionData)
            .withCallInfo(evt)
            .withCaller(callerNumber)
            .withExtension(targetExtension)
            .withLead(leadData)
            .withRouting('ringing', { is_ring_group: true })
            .with('dialstring', evt.dialstring)
            .with('destination', evt.destchannel)
            .build();

        // Send RING to specific extension
        if (targetExtension) {
            Broadcaster.toExtension(message, targetExtension);
        } else {
            Broadcaster.broadcast(message);
        }

        // Also broadcast raw DialBegin
        Broadcaster.broadcast({
            event: MessageType.DIAL_BEGIN,
            channel: evt.channel,
            destination: evt.destchannel,
            uniqueid: evt.uniqueid,
            linkedid: evt.linkedid,
            calleridnum: evt.calleridnum,
            destcalleridnum: evt.destcalleridnum,
            dialstring: evt.dialstring,
            targetExtension: targetExtension,
            direction: 'inbound',
        });
    },

    /**
     * Handle NewState for inbound calls (Ring/Connect/Busy)
     * @param {Object} evt - AMI event
     * @param {Object} sessionData - Session data
     */
    async handleNewState(evt, sessionData) {
        const isRinging = evt.channelstatedesc === 'Ringing';
        const isConnected = evt.channelstatedesc === 'Up';
        const isBusy = evt.channelstatedesc === 'Busy';

        if (isRinging && (CONFIG.notifications.mode === 'ring' || CONFIG.notifications.mode === 'all')) {
            const leadData = await LeadsDB.fetchByPhone(evt.connectedlinenum);

            const message = MessageBuilder.create(MessageType.RING, sessionData)
                .withCallInfo(evt)
                .withCaller(evt.connectedlinenum)
                .withExtension(evt.calleridnum)
                .withLead(leadData)
                .withRouting('ringing')
                .build();

            Broadcaster.broadcast(message);
        }

        if (isConnected && (CONFIG.notifications.mode === 'connect' || CONFIG.notifications.mode === 'all')) {
            // Determine extension from the event
            const answeredExtension = evt.exten || evt.calleridnum || evt.connectedlinenum;

            // Skip if this is the client channel (phone number, not an agent extension)
            // Agent extensions are short (e.g. 201, 202, 204), client numbers are long
            if (!isAgentExtension(answeredExtension)) {
                Logger.debug('Skipping NewState Up for non-agent extension', {
                    extension: answeredExtension,
                    linkedid: evt.linkedid,
                });
            } else if (sessionData && sessionData.session_id && !sessionData._answeredProcessed) {
                // Prevent duplicate processing - only process once per call for actual agent extension
                sessionData._answeredProcessed = true;

                const userId = await UsersDB.getByExtension(answeredExtension);

                // Find or create lead
                const leadId = await LeadsDB.findOrCreate(sessionData.caller_number, userId);

                // Assign lead to answering user if not already assigned
                if (leadId && userId) {
                    await LeadsDB.assignIfUnassigned(leadId, userId);
                }

                // Generate call signature
                let callSignature = sessionData.call_signature;
                if (!callSignature && leadId) {
                    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').split('.')[0];
                    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
                    callSignature = `LEAD-${leadId}-USER-${userId || 'NONE'}-${timestamp}-${random}`;

                    // Set channel variable in Asterisk
                    const ami = getAMI();
                    if (ami && evt.channel) {
                        ami.action({
                            Action: 'Setvar',
                            Channel: evt.channel,
                            Variable: 'CALL_SIGNATURE',
                            Value: callSignature,
                        });
                    }
                }

                // Update session data
                sessionData.lead_id = leadId;
                sessionData.caller_id = userId;
                sessionData.call_signature = callSignature;
                SessionManager.set(evt.uniqueid, sessionData);
                if (evt.linkedid) {
                    SessionManager.set(evt.linkedid, sessionData);
                }

                // Update database
                await SessionsDB.update(sessionData.session_id, {
                    status: 'answered',
                    answered_at: new Date(),
                    lead_id: leadId,
                    caller_id: userId,
                    call_signature: callSignature,
                });

                await LogsDB.insert({
                    session_id: sessionData.session_id,
                    log_level: 'info',
                    event_type: 'answered',
                    message: `Call answered by extension ${answeredExtension}`,
                    context: { extension: answeredExtension, user_id: userId, lead_id: leadId },
                    source: 'asterisk',
                });

                Logger.info('Inbound call answered', {
                    extension: answeredExtension,
                    user_id: userId,
                    lead_id: leadId,
                });
            }

            // Only broadcast CONNECT for actual agent extensions, skip ring group extensions (e.g. 299)
            // Also skip if BridgeEnter already broadcast a CONNECT for this call
            if (isAgentExtension(answeredExtension) && !(sessionData && sessionData._connectBroadcasted)) {
                if (sessionData) {
                    sessionData._connectBroadcasted = true;
                    SessionManager.set(evt.linkedid, sessionData);
                }

                const leadData = await LeadsDB.fetchByPhone(evt.connectedlinenum);

                const message = MessageBuilder.create(MessageType.CONNECT, sessionData)
                    .withCallInfo(evt)
                    .withCaller(evt.connectedlinenum)
                    .withExtension(answeredExtension)
                    .withLead(leadData)
                    .withRouting('connected')
                    .build();

                Broadcaster.broadcast(message);
            }
        }

        if (isBusy && (CONFIG.notifications.mode === 'busy' || CONFIG.notifications.mode === 'all')) {
            if (sessionData && sessionData.session_id) {
                await SessionsDB.update(sessionData.session_id, {
                    status: 'busy',
                    end_reason: 'busy',
                });

                await LogsDB.insert({
                    session_id: sessionData.session_id,
                    log_level: 'warning',
                    event_type: 'busy',
                    message: 'Call busy',
                    context: { channel: evt.channel },
                    source: 'asterisk',
                });
            }

            Broadcaster.broadcast({
                event: MessageType.BUSY,
                caller: evt.connectedlinenum || evt.calleridnum,
                uniqueid: evt.uniqueid,
                linkedid: evt.linkedid,
                exten: evt.calleridnum,
                channelstate: evt.channelstate,
                channelstatedesc: evt.channelstatedesc,
            });
        }
    },

    /**
     * Handle BridgeEnter for inbound calls
     * @param {Object} evt - AMI event
     * @param {Object} sessionData - Session data
     */
    async handleBridgeEnter(evt, sessionData) {
        const answeredExtension = extractExtensionFromChannel(evt.channel);
        const callerNumber = evt.calleridnum || evt.connectedlinenum;

        Logger.info('BridgeEnter event - Inbound call connected', {
            linkedid: evt.linkedid,
            answeredExtension: answeredExtension,
        });

        if (sessionData) {
            const previouslyRinging = sessionData.currentRingingExtension;
            sessionData.currentRingingExtension = null;
            sessionData.answeredByExtension = answeredExtension;
            sessionData._lastUpdated = Date.now();
            SessionManager.set(evt.linkedid, sessionData);

            // Clear ringing from other extension
            if (previouslyRinging && previouslyRinging !== answeredExtension) {
                Broadcaster.toExtension(
                    {
                        event: MessageType.STOP_RINGING,
                        linkedid: evt.linkedid,
                        uniqueid: evt.uniqueid,
                        targetExtension: previouslyRinging,
                        reason: 'answered_elsewhere',
                        answeredBy: answeredExtension,
                        session_id: sessionData.session_id,
                    },
                    previouslyRinging
                );
            }
        }

        const leadData = await LeadsDB.fetchByPhone(callerNumber);

        const message = MessageBuilder.create(MessageType.CONNECT, sessionData)
            .withCallInfo(evt)
            .withBridge(evt.bridgeuniqueid, evt.bridgetype)
            .withLead(leadData)
            .with('answeredExtension', answeredExtension)
            .withRouting('connected', { answered_by: answeredExtension })
            .build();

        if (answeredExtension) {
            // Mark that we already broadcast CONNECT so handleNewState won't duplicate it
            if (sessionData) {
                sessionData._connectBroadcasted = true;
                SessionManager.set(evt.linkedid, sessionData);
            }
            Broadcaster.toExtension(message, answeredExtension);
        }

        // Also broadcast BridgeEnter
        Broadcaster.broadcast({
            event: MessageType.BRIDGE_ENTER,
            bridgeuniqueid: evt.bridgeuniqueid,
            bridgetype: evt.bridgetype,
            channel: evt.channel,
            uniqueid: evt.uniqueid,
            linkedid: evt.linkedid,
            calleridnum: evt.calleridnum,
            answeredExtension: answeredExtension,
        });
    },

    /**
     * Handle DialEnd for inbound calls (stop ringing)
     * @param {Object} evt - AMI event
     * @param {Object} sessionData - Session data
     */
    async handleDialEnd(evt, sessionData) {
        const targetExtension = extractExtensionFromChannel(evt.destchannel);

        Logger.info('DialEnd event - Inbound call ring ended', {
            linkedid: evt.linkedid,
            targetExtension: targetExtension,
            dialstatus: evt.dialstatus,
        });

        // Send STOP_RINGING unless answered
        if (targetExtension && evt.dialstatus !== 'ANSWER') {
            const stopMessage = {
                event: MessageType.STOP_RINGING,
                channel: evt.channel,
                destchannel: evt.destchannel,
                uniqueid: evt.uniqueid,
                linkedid: evt.linkedid,
                targetExtension: targetExtension,
                dialstatus: evt.dialstatus,
                reason:
                    evt.dialstatus === 'NOANSWER'
                        ? 'timeout'
                        : evt.dialstatus === 'CANCEL'
                          ? 'caller_hangup'
                          : evt.dialstatus === 'BUSY'
                            ? 'busy'
                            : 'dial_ended',
                session_id: sessionData?.session_id,
            };

            Broadcaster.toExtension(stopMessage, targetExtension);
        }

        // Update session
        if (sessionData && sessionData.currentRingingExtension === targetExtension) {
            sessionData.currentRingingExtension = null;
            sessionData._lastUpdated = Date.now();
            SessionManager.set(evt.linkedid, sessionData);
        }

        // Handle BUSY
        if (evt.dialstatus === 'BUSY') {
            const busyMessage = {
                event: MessageType.BUSY,
                caller: evt.destcalleridnum || evt.calleridnum,
                uniqueid: evt.uniqueid,
                linkedid: evt.linkedid,
                dialstatus: evt.dialstatus,
                targetExtension: targetExtension,
            };
            if (targetExtension) {
                Broadcaster.toExtension(busyMessage, targetExtension);
            }
            Broadcaster.broadcast(busyMessage);
        }

        // Handle other non-answer statuses
        if (['NOANSWER', 'CANCEL', 'CONGESTION', 'CHANUNAVAIL'].includes(evt.dialstatus)) {
            Broadcaster.broadcast({
                event: MessageType.DIAL_END,
                dialstatus: evt.dialstatus,
                caller: evt.destcalleridnum || evt.calleridnum,
                uniqueid: evt.uniqueid,
                linkedid: evt.linkedid,
                targetExtension: targetExtension,
            });
        }
    },

    /**
     * Handle Hangup for inbound calls
     * @param {Object} evt - AMI event
     * @param {Object} sessionData - Session data
     * @param {Object} dbSession - Database session
     */
    async handleHangup(evt, sessionData, dbSession) {
        // Clear any remaining ringing state
        if (sessionData && sessionData.currentRingingExtension) {
            Broadcaster.toExtension(
                {
                    event: MessageType.STOP_RINGING,
                    linkedid: evt.linkedid,
                    uniqueid: evt.uniqueid,
                    targetExtension: sessionData.currentRingingExtension,
                    reason: 'hangup',
                    dialstatus: 'CANCEL',
                    session_id: sessionData.session_id,
                },
                sessionData.currentRingingExtension
            );
        }

        // Prevent duplicate processing - Asterisk fires Hangup for each channel leg
        if (sessionData && sessionData._hangupProcessed) {
            // Still clean up and broadcast, but skip DB writes
            SessionManager.delete(sessionData);
            return;
        }

        if (sessionData) {
            sessionData._hangupProcessed = true;
            SessionManager.set(evt.linkedid, sessionData);
        }

        const endedAt = new Date();
        let duration = null;

        if (dbSession) {
            if (dbSession.answered_at) {
                duration = Math.floor((endedAt - new Date(dbSession.answered_at)) / 1000);
            } else if (dbSession.started_at) {
                duration = Math.floor((endedAt - new Date(dbSession.started_at)) / 1000);
            }

            let recordingPath = null;
            const callSignature = dbSession.call_signature || sessionData?.call_signature;
            if (callSignature) {
                recordingPath = `${callSignature}.wav`;
            }

            const endReason = !dbSession.answered_at
                ? parseInt(evt.cause, 10) === 21
                    ? 'declined'
                    : 'no_answer'
                : 'hangup';

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

            Logger.info('Inbound call ended', {
                session_id: sessionData.session_id,
                duration: duration,
            });
        }

        // Clean up session
        if (sessionData) {
            SessionManager.delete(sessionData);
        }

        // Broadcast hangup
        const message = MessageBuilder.create(MessageType.HANGUP_EVENT, sessionData)
            .withCallInfo(evt)
            .withCaller(evt.connectedlinenum || evt.calleridnum)
            .withExtension(evt.calleridnum)
            .withHangupInfo(evt.cause, evt.causetxt, duration, null)
            .withRouting('ended')
            .build();

        Broadcaster.broadcast(message);
    },
};

module.exports = InboundHandlers;
