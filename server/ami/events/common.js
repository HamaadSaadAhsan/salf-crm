'use strict';

const CONFIG = require('../../config');
const Logger = require('../../logger');
const Broadcaster = require('../../broadcaster');
const SessionManager = require('../../session-manager');
const SessionsDB = require('../../database/sessions');
const LogsDB = require('../../database/logs');
const { MessageType } = require('../../constants');

/**
 * Common AMI event handlers (not specific to inbound/outbound)
 */
const CommonHandlers = {
    /**
     * Handle VarSet event - captures SESSION_ID from dialplan
     * @param {Object} evt - AMI event
     */
    async handleVarSet(evt) {
        if (CONFIG.notifications.mode !== 'all') {
            return;
        }

        const variableName = evt.variablename || evt.variable;
        const variableValue = evt.value;

        Logger.debug('VarSet event', {
            variable: variableName,
            value: variableValue,
            uniqueid: evt.uniqueid,
        });

        // Capture CRM_SESSION_ID to map uniqueid to our session
        const isSessionIdVar =
            variableName === 'CRM_SESSION_ID' ||
            variableName === '__CRM_SESSION_ID' ||
            variableName === 'SESSION_ID' ||
            variableName === '__SESSION_ID';

        if (isSessionIdVar && variableValue) {
            const sessionId = variableValue;
            const uniqueid = evt.uniqueid;

            Logger.info('🆔 CRM_SESSION_ID CAPTURED from Asterisk', {
                variable_name: variableName,
                session_id: sessionId,
                uniqueid: uniqueid,
                linkedid: evt.linkedid,
                channel: evt.channel,
            });

            // Map uniqueid to session_id
            SessionManager.mapUniqueidToSession(uniqueid, sessionId);
            if (evt.linkedid && evt.linkedid !== uniqueid) {
                SessionManager.mapUniqueidToSession(evt.linkedid, sessionId);
            }

            // Fetch full session data from database
            const sessionRow = await SessionsDB.getBySessionId(sessionId);

            if (sessionRow) {
                const sessionData = {
                    session_id: sessionId,
                    uniqueid: uniqueid,
                    linkedid: evt.linkedid,
                    call_direction: sessionRow.call_direction,
                    call_type: sessionRow.call_type,
                    caller_number: sessionRow.caller_number,
                    callee_number: sessionRow.callee_number,
                    call_signature: sessionRow.call_signature,
                    lead_id: sessionRow.lead_id,
                    caller_id: sessionRow.caller_id,
                    started_at: sessionRow.started_at,
                    agent: sessionRow.caller_number,
                    client: sessionRow.callee_number,
                };

                // Store in session manager by multiple keys
                SessionManager.set(uniqueid, sessionData);
                if (evt.linkedid) {
                    SessionManager.set(evt.linkedid, sessionData);
                }
                if (sessionRow.call_signature) {
                    SessionManager.set(sessionRow.call_signature, sessionData);
                }

                Logger.info('Session data loaded from database', {
                    direction: sessionRow.call_direction,
                    caller: sessionRow.caller_number,
                    lead_id: sessionRow.lead_id,
                });
            } else {
                Logger.warn('Session not found in database', { session_id: sessionId });
                const minimalData = {
                    session_id: sessionId,
                    uniqueid: uniqueid,
                    linkedid: evt.linkedid,
                };
                SessionManager.set(uniqueid, minimalData);
                if (evt.linkedid) {
                    SessionManager.set(evt.linkedid, minimalData);
                }
            }

            // Log the variable set event
            await LogsDB.insert({
                session_id: sessionId,
                log_level: 'info',
                event_type: 'varset',
                message: `Channel variable CRM_SESSION_ID mapped for channel`,
                context: { channel: evt.channel, uniqueid, linkedid: evt.linkedid, variable: variableName },
                source: 'asterisk',
            });
        }

        // Log timing variables
        if (['ANSWEREDTIME', 'DIALEDTIME', 'RINGTIME'].includes(variableName)) {
            Logger.debug('Timing variable set', {
                variable: variableName,
                value: variableValue,
                uniqueid: evt.uniqueid,
            });

            const sessionData = SessionManager.getByAnyKey(evt.uniqueid, evt.linkedid);
            if (sessionData && sessionData.session_id) {
                await LogsDB.insert({
                    session_id: sessionData.session_id,
                    log_level: 'info',
                    event_type: 'timing',
                    message: `${variableName}: ${variableValue}`,
                    context: { channel: evt.channel, variable: variableName, value: variableValue },
                    source: 'asterisk',
                });

                Broadcaster.broadcast({
                    event: MessageType.VAR_SET,
                    channel: evt.channel,
                    variable: variableName,
                    value: variableValue,
                    uniqueid: evt.uniqueid,
                    linkedid: evt.linkedid,
                });
            }
        }
    },

    /**
     * Handle Bridge event
     * @param {Object} evt - AMI event
     */
    handleBridge(evt) {
        if (CONFIG.notifications.mode !== 'all' && CONFIG.notifications.mode !== 'bridge') {
            return;
        }

        Logger.debug('Bridge event', { bridgestate: evt.bridgestate });

        Broadcaster.broadcast({
            event: MessageType.BRIDGE,
            bridgestate: evt.bridgestate,
            bridgetype: evt.bridgetype,
            channel1: evt.channel1,
            channel2: evt.channel2,
            uniqueid1: evt.uniqueid1,
            uniqueid2: evt.uniqueid2,
            callerid1: evt.callerid1,
            callerid2: evt.callerid2,
            linkedid: evt.linkedid,
        });
    },

    /**
     * Handle BridgeLeave event
     * @param {Object} evt - AMI event
     */
    handleBridgeLeave(evt) {
        if (CONFIG.notifications.mode !== 'all') {
            return;
        }

        Logger.debug('Bridge leave event', { bridgeuniqueid: evt.bridgeuniqueid });

        Broadcaster.broadcast({
            event: MessageType.BRIDGE_LEAVE,
            bridgeuniqueid: evt.bridgeuniqueid,
            bridgetype: evt.bridgetype,
            channel: evt.channel,
            uniqueid: evt.uniqueid,
            linkedid: evt.linkedid,
            calleridnum: evt.calleridnum,
        });
    },

    /**
     * Handle Hold event
     * @param {Object} evt - AMI event
     */
    handleHold(evt) {
        if (CONFIG.notifications.mode !== 'all') {
            return;
        }

        Logger.debug('Hold event', { channel: evt.channel });

        Broadcaster.broadcast({
            event: MessageType.HOLD,
            channel: evt.channel,
            uniqueid: evt.uniqueid,
            linkedid: evt.linkedid,
            musicclass: evt.musicclass,
        });
    },

    /**
     * Handle Unhold event
     * @param {Object} evt - AMI event
     */
    handleUnhold(evt) {
        if (CONFIG.notifications.mode !== 'all') {
            return;
        }

        Logger.debug('Unhold event', { channel: evt.channel });

        Broadcaster.broadcast({
            event: MessageType.UNHOLD,
            channel: evt.channel,
            uniqueid: evt.uniqueid,
            linkedid: evt.linkedid,
        });
    },

    /**
     * Handle DTMF event
     * @param {Object} evt - AMI event
     */
    handleDTMF(evt) {
        if (CONFIG.notifications.mode !== 'all') {
            return;
        }

        Logger.debug('DTMF event', { digit: evt.digit });

        Broadcaster.broadcast({
            event: MessageType.DTMF,
            channel: evt.channel,
            uniqueid: evt.uniqueid,
            linkedid: evt.linkedid,
            digit: evt.digit,
            direction: evt.direction,
        });
    },

    /**
     * Handle NewCallerID event
     * @param {Object} evt - AMI event
     */
    handleNewCallerId(evt) {
        if (CONFIG.notifications.mode !== 'all' && CONFIG.notifications.mode !== 'newcallerid') {
            return;
        }

        Logger.debug('New caller ID event', { calleridnum: evt.calleridnum });

        Broadcaster.broadcast({
            event: MessageType.NEW_CALLER_ID,
            channel: evt.channel,
            uniqueid: evt.uniqueid,
            linkedid: evt.linkedid,
            calleridnum: evt.calleridnum,
            calleridname: evt.calleridname,
        });
    },

    /**
     * Handle NewExten event
     * @param {Object} evt - AMI event
     */
    handleNewExten(evt) {
        if (CONFIG.notifications.mode !== 'all') {
            return;
        }

        // Only log important applications
        const importantApps = ['Dial', 'Queue', 'Voicemail', 'Playback'];
        if (!importantApps.includes(evt.application)) {
            return;
        }

        Logger.debug('New exten event', { application: evt.application });

        Broadcaster.broadcast({
            event: MessageType.NEW_EXTEN,
            channel: evt.channel,
            uniqueid: evt.uniqueid,
            linkedid: evt.linkedid,
            context: evt.context,
            exten: evt.exten,
            priority: evt.priority,
            application: evt.application,
            appdata: evt.appdata,
        });
    },

    /**
     * Handle ChannelDestroy event
     * @param {Object} evt - AMI event
     */
    handleChannelDestroy(evt) {
        if (CONFIG.notifications.mode !== 'all') {
            return;
        }

        Logger.debug('Channel destroy event', { uniqueid: evt.uniqueid });

        const sessionData = SessionManager.getByAnyKey(evt.uniqueid, evt.linkedid);

        Broadcaster.broadcast({
            event: MessageType.DISCONNECT,
            caller: evt.connectedlinenum || evt.calleridnum,
            uniqueid: evt.uniqueid,
            linkedid: evt.linkedid,
            exten: evt.calleridnum,
            cause: evt.cause,
            causeTxt: evt.causetxt,
            session_id: sessionData?.session_id || null,
            lead_id: sessionData?.lead_id || null,
            direction: sessionData?.call_direction || 'inbound',
            routing_info: {
                call_direction: sessionData?.call_direction || 'inbound',
                session_id: sessionData?.session_id || null,
                lead_id: sessionData?.lead_id || null,
            },
        });
    },
};

module.exports = CommonHandlers;
