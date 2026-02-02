'use strict';

const CONFIG = require('./config');
const Logger = require('./logger');

/**
 * Active call sessions by uniqueid/linkedid
 * @type {Map<string, Object>}
 */
const activeCallSessions = new Map();

/**
 * Maps Asterisk uniqueid -> CRM session_id (UUID)
 * @type {Map<string, string>}
 */
const uniqueidToSessionMap = new Map();

/**
 * Session cleanup interval timer
 * @type {NodeJS.Timeout|null}
 */
let sessionCleanupTimer = null;

/**
 * Session Manager - In-memory session cache
 */
const SessionManager = {
    /**
     * Store session data in memory cache
     * @param {string} key - Lookup key (uniqueid, linkedid, or call_signature)
     * @param {Object} data - Session data
     */
    set(key, data) {
        if (!key) {
            return;
        }
        data._lastUpdated = Date.now();
        activeCallSessions.set(key, data);
    },

    /**
     * Get session data from memory cache
     * @param {string} key - Lookup key
     * @returns {Object|null} Session data or null
     */
    get(key) {
        return activeCallSessions.get(key) || null;
    },

    /**
     * Get session by multiple possible keys
     * @param {string} uniqueid - Primary uniqueid
     * @param {string} linkedid - Linked call ID
     * @returns {Object|null} Session data or null
     */
    getByAnyKey(uniqueid, linkedid) {
        return this.get(uniqueid) || this.get(linkedid) || null;
    },

    /**
     * Resolve session from any Asterisk event
     * Tries all lookup strategies in priority order
     * @param {Object} evt - Asterisk event
     * @returns {Object|null} Session data or null
     */
    resolve(evt) {
        // Try direct lookups first
        let session = this.get(evt.uniqueid) || this.get(evt.linkedid);
        if (session) {
            return session;
        }

        // Try pending outbound lookup by channel extension
        const channelMatch = evt.channel?.match(/^PJSIP\/(\d+)-/);
        const channelExtension = channelMatch ? channelMatch[1] : null;

        if (channelExtension) {
            const pendingKey = `outbound_pending_${channelExtension}`;
            session = this.get(pendingKey);
            if (session && session.call_direction === 'outbound') {
                return session;
            }
        }

        // Try by calleridnum
        if (evt.calleridnum) {
            const pendingKey = `outbound_pending_${evt.calleridnum}`;
            session = this.get(pendingKey);
            if (session && session.call_direction === 'outbound') {
                return session;
            }
        }

        return null;
    },

    /**
     * Map a uniqueid to a session_id for quick lookup
     * @param {string} uniqueid - Asterisk channel uniqueid
     * @param {string} sessionId - CRM session UUID
     */
    mapUniqueidToSession(uniqueid, sessionId) {
        if (!uniqueid || !sessionId) {
            return;
        }
        uniqueidToSessionMap.set(uniqueid, sessionId);
        Logger.debug('Mapped uniqueid to session', { uniqueid, session_id: sessionId });
    },

    /**
     * Get session_id by uniqueid from the mapping
     * @param {string} uniqueid - Asterisk channel uniqueid
     * @returns {string|null} Session UUID or null
     */
    getSessionIdByUniqueid(uniqueid) {
        return uniqueidToSessionMap.get(uniqueid) || null;
    },

    /**
     * Delete session from all mappings
     * @param {Object} sessionData - Session data with keys to remove
     */
    delete(sessionData) {
        if (!sessionData) {
            return;
        }

        if (sessionData.uniqueid) {
            activeCallSessions.delete(sessionData.uniqueid);
            uniqueidToSessionMap.delete(sessionData.uniqueid);
        }
        if (sessionData.linkedid) {
            activeCallSessions.delete(sessionData.linkedid);
            uniqueidToSessionMap.delete(sessionData.linkedid);
        }
        if (sessionData.call_signature) {
            activeCallSessions.delete(sessionData.call_signature);
        }
        if (sessionData.agent) {
            activeCallSessions.delete(`outbound_pending_${sessionData.agent}`);
        }
    },

    /**
     * Delete by key directly
     * @param {string} key - Key to delete
     */
    deleteByKey(key) {
        if (key) {
            activeCallSessions.delete(key);
        }
    },

    /**
     * Clean up stale sessions
     */
    cleanup() {
        const now = Date.now();
        const maxAge = CONFIG.sessions.maxSessionAgeMs;
        let cleanedCount = 0;

        for (const [key, data] of activeCallSessions.entries()) {
            if (data._lastUpdated && now - data._lastUpdated > maxAge) {
                activeCallSessions.delete(key);
                uniqueidToSessionMap.delete(key);
                cleanedCount++;
            }
        }

        // Clean up orphaned uniqueid mappings
        for (const [uniqueid, sessionId] of uniqueidToSessionMap.entries()) {
            if (!activeCallSessions.has(uniqueid) && !activeCallSessions.has(sessionId)) {
                uniqueidToSessionMap.delete(uniqueid);
            }
        }

        if (cleanedCount > 0) {
            Logger.info('Stale sessions cleaned up', { count: cleanedCount });
        }
    },

    /**
     * Start the cleanup interval
     */
    startCleanupInterval() {
        sessionCleanupTimer = setInterval(() => {
            this.cleanup();
        }, CONFIG.sessions.cleanupIntervalMs);
        Logger.info('Session cleanup interval started');
    },

    /**
     * Stop the cleanup interval
     */
    stopCleanupInterval() {
        if (sessionCleanupTimer) {
            clearInterval(sessionCleanupTimer);
            sessionCleanupTimer = null;
            Logger.info('Session cleanup interval stopped');
        }
    },

    /**
     * Get current session count
     * @returns {number} Number of active sessions
     */
    count() {
        return activeCallSessions.size;
    },
};

module.exports = SessionManager;
