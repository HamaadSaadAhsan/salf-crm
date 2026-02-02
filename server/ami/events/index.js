'use strict';

const CONFIG = require('../../config');
const Logger = require('../../logger');
const SessionManager = require('../../session-manager');
const SessionsDB = require('../../database/sessions');
const { extractExtensionFromChannel } = require('../../utils');
const CommonHandlers = require('./common');
const InboundHandlers = require('./inbound');
const OutboundHandlers = require('./outbound');

/**
 * AMI Event Router - Routes events to appropriate handlers based on call direction
 */
const AMIEventRouter = {
    /**
     * Register all event handlers on AMI instance
     * @param {Object} ami - Asterisk Manager instance
     */
    registerHandlers(ami) {
        // Common handlers
        ami.on('varset', (evt) => CommonHandlers.handleVarSet(evt));
        ami.on('bridge', (evt) => CommonHandlers.handleBridge(evt));
        ami.on('bridgeleave', (evt) => CommonHandlers.handleBridgeLeave(evt));
        ami.on('hold', (evt) => CommonHandlers.handleHold(evt));
        ami.on('unhold', (evt) => CommonHandlers.handleUnhold(evt));
        ami.on('dtmfbegin', (evt) => CommonHandlers.handleDTMF(evt));
        ami.on('dtmfend', (evt) => CommonHandlers.handleDTMF(evt));
        ami.on('newcallerid', (evt) => CommonHandlers.handleNewCallerId(evt));
        ami.on('newexten', (evt) => CommonHandlers.handleNewExten(evt));
        ami.on('channeldestroy', (evt) => CommonHandlers.handleChannelDestroy(evt));

        // Routed handlers
        ami.on('newstate', (evt) => this.routeNewState(evt));
        ami.on('dialbegin', (evt) => this.routeDialBegin(evt));
        ami.on('dialend', (evt) => this.routeDialEnd(evt));
        ami.on('bridgeenter', (evt) => this.routeBridgeEnter(evt));
        ami.on('hangup', (evt) => this.routeHangup(evt));

        // Debug logging
        ami.on('managerevent', (evt) => {
            if (CONFIG.logging.level === 'debug' && evt.event) {
                Logger.debug('AMI event received', { event: evt.event, uniqueid: evt.uniqueid });
            }
        });

        Logger.info('AMI event handlers registered');
    },

    /**
     * Resolve session and determine call direction
     * @param {Object} evt - AMI event
     * @returns {Object} { session, isOutbound }
     */
    resolveSession(evt) {
        const session = SessionManager.resolve(evt);
        const isOutbound = session?.call_direction === 'outbound';
        return { session, isOutbound };
    },

    /**
     * Route NewState event
     * @param {Object} evt - AMI event
     */
    async routeNewState(evt) {
        let { session, isOutbound } = this.resolveSession(evt);

        // For outbound calls without session, try pending lookup
        if (!session) {
            const channelMatch = evt.channel?.match(/^PJSIP\/(\d+)-/);
            const channelExtension = channelMatch ? channelMatch[1] : null;

            const possibleKeys = [
                channelExtension ? `outbound_pending_${channelExtension}` : null,
                evt.calleridnum ? `outbound_pending_${evt.calleridnum}` : null,
            ].filter(Boolean);

            for (const key of possibleKeys) {
                const pending = SessionManager.get(key);
                if (pending?.call_direction === 'outbound') {
                    session = pending;
                    isOutbound = true;
                    break;
                }
            }
        }

        if (isOutbound && session) {
            await OutboundHandlers.handleNewState(evt, session);
        } else {
            await InboundHandlers.handleNewState(evt, session);
        }
    },

    /**
     * Route DialBegin event
     * @param {Object} evt - AMI event
     */
    async routeDialBegin(evt) {
        let { session, isOutbound } = this.resolveSession(evt);
        const targetExtension = extractExtensionFromChannel(evt.destchannel);

        // Check for pending outbound session by target extension
        if (!session && targetExtension) {
            const pendingKey = `outbound_pending_${targetExtension}`;
            const pending = SessionManager.get(pendingKey);
            if (pending?.call_direction === 'outbound') {
                session = pending;
                isOutbound = true;

                // Link session to call IDs
                session.uniqueid = evt.uniqueid;
                session.linkedid = evt.linkedid;
                SessionManager.set(evt.linkedid, session);
                if (evt.uniqueid !== evt.linkedid) {
                    SessionManager.set(evt.uniqueid, session);
                }
                SessionManager.deleteByKey(pendingKey);
            }
        }

        // Check for CRM-call context (outbound indicator)
        const isCRMContext = evt.context === 'CRM-call' || evt.channel?.includes('CRM-call');
        if (isCRMContext && !session) {
            Logger.info('📤 Potential OUTBOUND CALL detected via context (no session yet)', {
                linkedid: evt.linkedid,
                context: evt.context,
            });
            return; // Don't send RING for potential outbound without session
        }

        if (isOutbound && session) {
            await OutboundHandlers.handleDialBegin(evt, session);
        } else {
            await InboundHandlers.handleDialBegin(evt, session);
        }
    },

    /**
     * Route DialEnd event
     * @param {Object} evt - AMI event
     */
    async routeDialEnd(evt) {
        const { session, isOutbound } = this.resolveSession(evt);

        if (isOutbound && session) {
            await OutboundHandlers.handleDialEnd(evt, session);
        } else {
            await InboundHandlers.handleDialEnd(evt, session);
        }
    },

    /**
     * Route BridgeEnter event
     * @param {Object} evt - AMI event
     */
    async routeBridgeEnter(evt) {
        let { session, isOutbound } = this.resolveSession(evt);
        const channelExtension = extractExtensionFromChannel(evt.channel);

        // Check for pending outbound session
        if (!session && channelExtension) {
            const pendingKey = `outbound_pending_${channelExtension}`;
            const pending = SessionManager.get(pendingKey);
            if (pending?.call_direction === 'outbound') {
                session = pending;
                isOutbound = true;

                // Link to call IDs
                if (evt.uniqueid) {
                    SessionManager.set(evt.uniqueid, session);
                }
                if (evt.linkedid) {
                    SessionManager.set(evt.linkedid, session);
                }
                session.uniqueid = evt.uniqueid;
                session.linkedid = evt.linkedid;
                session._linkedToAsterisk = true;
            }
        }

        if (isOutbound && session) {
            await OutboundHandlers.handleBridgeEnter(evt, session);
        } else {
            await InboundHandlers.handleBridgeEnter(evt, session);
        }
    },

    /**
     * Route Hangup event
     * @param {Object} evt - AMI event
     */
    async routeHangup(evt) {
        if (CONFIG.notifications.mode !== 'all' && CONFIG.notifications.mode !== 'hangup') {
            return;
        }

        Logger.info('Hangup event', {
            calleridnum: evt.calleridnum,
            linkedid: evt.linkedid,
            uniqueid: evt.uniqueid,
            cause: evt.cause,
            causetxt: evt.causetxt,
        });

        const session = SessionManager.get(evt.linkedid) || SessionManager.get(evt.uniqueid);
        const isOutbound = session?.call_direction === 'outbound';

        // Get database session for duration calculation
        let dbSession = null;
        if (session?.session_id) {
            dbSession = await SessionsDB.getBySessionId(session.session_id);
        }

        if (isOutbound && session && dbSession) {
            await OutboundHandlers.handleHangup(evt, session, dbSession);
        } else {
            await InboundHandlers.handleHangup(evt, session, dbSession);
        }
    },
};

module.exports = AMIEventRouter;
