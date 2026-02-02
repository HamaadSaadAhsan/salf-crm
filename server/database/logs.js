'use strict';

const Database = require('./index');
const Logger = require('../logger');

/**
 * Call logs database operations
 */
const LogsDB = {
    /**
     * Insert a call log entry
     * @param {Object} logData - Log entry data
     * @returns {Promise<boolean>} Success status
     */
    async insert(logData) {
        // First get the database ID from session_id
        const sessionQuery = 'SELECT id FROM call_sessions WHERE session_id = $1';
        const sessionResult = await Database.queryWithRetry(sessionQuery, [logData.session_id]);

        if (!sessionResult || sessionResult.rows.length === 0) {
            Logger.warn('Call session not found for log insertion', { session_id: logData.session_id });
            return false;
        }

        const callSessionId = sessionResult.rows[0].id;

        const query = `
            INSERT INTO call_logs (
                call_session_id, log_level, event_type, message,
                context, source, logged_at, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `;

        const values = [
            callSessionId,
            logData.log_level || 'info',
            logData.event_type,
            logData.message || '',
            logData.context ? JSON.stringify(logData.context) : null,
            logData.source || 'server',
            logData.logged_at || new Date(),
        ];

        const result = await Database.queryWithRetry(query, values);
        return result !== null;
    },
};

module.exports = LogsDB;
