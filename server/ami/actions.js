'use strict';

const CONFIG = require('../config');
const Logger = require('../logger');
const Broadcaster = require('../broadcaster');
const SessionManager = require('../session-manager');
const SessionsDB = require('../database/sessions');
const LogsDB = require('../database/logs');
const { MessageType } = require('../constants');
const { generateUUID } = require('../utils');
const { getAMI } = require('./state');

/**
 * AMI Action handlers
 */
const AMIActions = {
    /**
     * Handle Originate action (make outbound call)
     * @param {Object} actionData - Action parameters
     * @param {Object} connection - WebSocket connection
     */
    async originate(actionData, connection) {
        const ami = getAMI();
        if (!ami) {
            Broadcaster.send(connection, {
                event: MessageType.ORIGINATE_RESPONSE,
                success: false,
                error: 'AMI not connected',
            });
            return;
        }

        const sessionId = generateUUID();
        const startedAt = new Date();

        Logger.info('Originating call', {
            agent: actionData.agent,
            client: actionData.client,
            session_id: sessionId,
        });

        // Extract call metadata
        const callSignature = actionData.call_signature || actionData.callSignature || null;
        const leadId = actionData.lead_id || actionData.leadId || null;
        const callerId = actionData.caller_id || actionData.callerId || null;

        // Store in session manager
        const sessionData = {
            session_id: sessionId,
            call_signature: callSignature,
            lead_id: leadId,
            caller_id: callerId,
            agent: actionData.agent,
            client: actionData.client,
            caller_number: actionData.agent,
            callee_number: actionData.client,
            started_at: startedAt,
            call_direction: 'outbound',
            call_type: 'voice',
        };

        // Store by call_signature for tracking
        if (callSignature) {
            SessionManager.set(callSignature, sessionData);
        }

        // Store by pending key for DialBegin lookup
        const pendingKey = `outbound_pending_${actionData.agent}`;
        SessionManager.set(pendingKey, sessionData);
        Logger.debug('Stored outbound session with pending key', { pendingKey, agent: actionData.agent });

        // Create call session in database BEFORE calling Originate
        try {
            await SessionsDB.create({
                session_id: sessionId,
                caller_id: callerId,
                call_direction: 'outbound',
                call_type: 'voice',
                status: 'initiated',
                caller_number: actionData.agent,
                callee_number: actionData.client,
                started_at: startedAt,
                call_signature: callSignature,
                lead_id: leadId,
            });
            Logger.info('Call session created in database before Originate', { session_id: sessionId });
        } catch (dbError) {
            Logger.error('Failed to create call session in database', { error: dbError.message, session_id: sessionId });
        }

        // Build channel variables
        const recordingPath = callSignature
            ? `${CONFIG.storage.basePath}/${CONFIG.storage.recordingsDir}/${callSignature}`
            : '';
        const variables = [
            `__CRM_SESSION_ID=${sessionId}`,
            `__CRM_CALL_SIGNATURE=${callSignature || ''}`,
            `__CRM_LEAD_ID=${leadId || ''}`,
            `CallRec=${recordingPath}`,
        ].join(',');

        ami.action(
            {
                Action: 'Originate',
                Channel: `PJSIP/${actionData.agent}`,
                Context: 'CRM-call',
                Exten: actionData.client,
                Priority: actionData.Priority || 1,
                CallerID: '32082066',
                Timeout: actionData.Timeout || 30000,
                Async: actionData.Async || 'true',
                Variable: variables,
            },
            async (err, res) => {
                const response = {
                    event: MessageType.ORIGINATE_RESPONSE,
                    success: !err,
                    session_id: sessionId,
                };

                if (err) {
                    Logger.error('Originate failed', { error: err.message, session_id: sessionId });
                    response.error = err.message || 'Failed to originate call';

                    try {
                        await SessionsDB.update(sessionId, { status: 'failed', end_reason: err.message });
                    } catch (updateErr) {
                        Logger.error('Failed to update session status', { error: updateErr.message });
                    }
                } else {
                    Logger.info('Originate success', { session_id: sessionId });
                    response.response = res;

                    await LogsDB.insert({
                        session_id: sessionId,
                        log_level: 'info',
                        event_type: 'originate',
                        message: `Call originated from ${actionData.agent} to ${actionData.client}`,
                        context: { agent: actionData.agent, client: actionData.client },
                        source: 'websocket',
                    });
                }

                Broadcaster.send(connection, response);
            }
        );
    },

    /**
     * Handle Hangup action
     * @param {Object} actionData - Action parameters
     * @param {Object} connection - WebSocket connection
     */
    hangup(actionData, connection) {
        const ami = getAMI();
        if (!ami) {
            Broadcaster.send(connection, {
                event: MessageType.HANGUP_RESPONSE,
                success: false,
                error: 'AMI not connected',
            });
            return;
        }

        Logger.info('Hanging up call', { channel: actionData.Channel });

        ami.action(
            {
                Action: 'Hangup',
                Channel: actionData.Channel,
                Cause: actionData.Cause || 16,
                ActionID: actionData.ActionID,
            },
            (err, res) => {
                Broadcaster.send(connection, {
                    event: MessageType.HANGUP_RESPONSE,
                    success: !err,
                    actionId: actionData.ActionID,
                    error: err ? err.message : undefined,
                    response: err ? undefined : res,
                });
            }
        );
    },

    /**
     * Handle Status action
     * @param {Object} actionData - Action parameters
     * @param {Object} connection - WebSocket connection
     */
    status(actionData, connection) {
        const ami = getAMI();
        if (!ami) {
            Broadcaster.send(connection, {
                event: MessageType.STATUS_RESPONSE,
                success: false,
                error: 'AMI not connected',
            });
            return;
        }

        Logger.debug('Getting channel status');

        ami.action(
            {
                Action: 'Status',
                ActionID: actionData.ActionID,
            },
            (err, res) => {
                Broadcaster.send(connection, {
                    event: MessageType.STATUS_RESPONSE,
                    success: !err,
                    actionId: actionData.ActionID,
                    error: err ? err.message : undefined,
                    response: err ? undefined : res,
                });
            }
        );
    },

    /**
     * Route AMI action to appropriate handler
     * @param {Object} actionData - Action data with Action field
     * @param {Object} connection - WebSocket connection
     */
    route(actionData, connection) {
        Logger.debug('Processing AMI Action', { action: actionData.Action });

        const handlers = {
            Originate: this.originate.bind(this),
            Hangup: this.hangup.bind(this),
            Status: this.status.bind(this),
        };

        const handler = handlers[actionData.Action];

        if (handler) {
            handler(actionData, connection);
        } else {
            Logger.warn('Unknown AMI Action', { action: actionData.Action });
            Broadcaster.send(connection, {
                event: MessageType.ERROR,
                success: false,
                error: `Unknown action: ${actionData.Action}`,
                actionId: actionData.ActionID,
            });
        }
    },
};

module.exports = AMIActions;
