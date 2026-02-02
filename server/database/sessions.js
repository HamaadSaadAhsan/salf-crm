'use strict';

const Database = require('./index');
const Logger = require('../logger');

/**
 * Call sessions database operations
 */
const SessionsDB = {
    /**
     * Fetch call session by session_id (UUID)
     * @param {string} sessionId - Session UUID
     * @returns {Promise<Object|null>} Session data or null
     */
    async getBySessionId(sessionId) {
        const query = 'SELECT * FROM call_sessions WHERE session_id = $1';
        const result = await Database.queryWithRetry(query, [sessionId]);

        if (result && result.rows.length > 0) {
            return result.rows[0];
        }
        return null;
    },

    /**
     * Fetch call session by uniqueid
     * @param {string} uniqueid - Asterisk uniqueid
     * @returns {Promise<Object|null>} Session data or null
     */
    async getByUniqueid(uniqueid) {
        const query = 'SELECT * FROM call_sessions WHERE uniqueid = $1';
        const result = await Database.queryWithRetry(query, [uniqueid]);

        if (result && result.rows.length > 0) {
            return result.rows[0];
        }
        return null;
    },

    /**
     * Create a new call session
     * @param {Object} sessionData - Session data
     * @returns {Promise<number|null>} Database ID or null
     */
    async create(sessionData) {
        const query = `
            INSERT INTO call_sessions (
                session_id, uniqueid, caller_id, call_direction, call_type, status,
                caller_number, callee_number, started_at, call_signature, lead_id,
                created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            RETURNING id
        `;

        const values = [
            sessionData.session_id,
            sessionData.uniqueid || null,
            sessionData.caller_id || null,
            sessionData.call_direction || 'outbound',
            sessionData.call_type || 'voice',
            sessionData.status || 'initiated',
            sessionData.caller_number,
            sessionData.callee_number,
            sessionData.started_at || new Date(),
            sessionData.call_signature || null,
            sessionData.lead_id || null,
        ];

        const result = await Database.queryWithRetry(query, values);

        if (result && result.rows.length > 0) {
            Logger.info('Call session created', {
                session_id: sessionData.session_id,
                db_id: result.rows[0].id,
                direction: sessionData.call_direction,
            });
            return result.rows[0].id;
        }
        return null;
    },

    /**
     * Update an existing call session
     * @param {string} sessionId - Session UUID
     * @param {Object} updates - Fields to update
     * @returns {Promise<boolean>} Success status
     */
    async update(sessionId, updates) {
        const setClauses = [];
        const values = [];
        let paramCounter = 1;

        const allowedFields = [
            'status',
            'answered_at',
            'ended_at',
            'duration',
            'end_reason',
            'recording_path',
            'lead_id',
            'caller_id',
            'call_signature',
            'uniqueid',
        ];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                setClauses.push(`${field} = $${paramCounter++}`);
                values.push(updates[field]);
            }
        }

        if (setClauses.length === 0) {
            return true;
        }

        setClauses.push('updated_at = NOW()');
        values.push(sessionId);

        const query = `
            UPDATE call_sessions
            SET ${setClauses.join(', ')}
            WHERE session_id = $${paramCounter}
        `;

        const result = await Database.queryWithRetry(query, values);
        if (result) {
            Logger.debug('Call session updated', { session_id: sessionId });
            return true;
        }
        return false;
    },
};

module.exports = SessionsDB;
