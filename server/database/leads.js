'use strict';

const Database = require('./index');
const Logger = require('../logger');
const { normalizePhone } = require('../utils');

/**
 * Leads database operations
 */
const LeadsDB = {
    /**
     * Fetch complete lead data by phone number
     * @param {string} phone - Phone number to search
     * @returns {Promise<Object|null>} Lead data or null
     */
    async fetchByPhone(phone) {
        const last10Digits = normalizePhone(phone);

        if (!last10Digits) {
            return null;
        }

        const query = `
            SELECT
                l.id, l.name, l.email, l.phone, l.city, l.country,
                l.inquiry_status, l.priority, l.detail, l.budget,
                l.tags, l.lead_score, l.last_activity_at,
                s.id as service_id, s.name as service_name,
                u.id as assigned_to_id, u.name as assigned_to_name
            FROM leads l
            LEFT JOIN services s ON l.service_id = s.id
            LEFT JOIN users u ON l.assigned_to = u.id
            WHERE regexp_replace(l.phone, '[^0-9]', '', 'g') LIKE '%' || $1
            AND l.deleted_at IS NULL
            LIMIT 1
        `;

        const result = await Database.queryWithRetry(query, [last10Digits]);

        if (!result || result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            id: row.id,
            name: row.name,
            email: row.email || undefined,
            phone: row.phone,
            city: row.city || undefined,
            country: row.country || undefined,
            service: row.service_id ? { id: row.service_id, name: row.service_name } : undefined,
            assigned_to: row.assigned_to_id ? { id: row.assigned_to_id, name: row.assigned_to_name } : undefined,
            inquiry_status: row.inquiry_status,
            priority: row.priority,
            detail: row.detail || undefined,
            budget: row.budget,
            tags: row.tags,
            lead_score: row.lead_score || undefined,
            last_activity_at: row.last_activity_at ? row.last_activity_at.toISOString() : undefined,
        };
    },

    /**
     * Find or create a lead by phone number
     * @param {string} phone - Phone number
     * @param {number|null} assignToUserId - User ID to assign new lead to
     * @returns {Promise<string|null>} Lead UUID or null
     */
    async findOrCreate(phone, assignToUserId = null) {
        const last10Digits = normalizePhone(phone);

        // Try to find existing lead
        const searchResult = await Database.queryWithRetry(
            `
            SELECT id FROM leads
            WHERE regexp_replace(phone, '[^0-9]', '', 'g') LIKE '%' || $1
            AND deleted_at IS NULL
            LIMIT 1
        `,
            [last10Digits]
        );

        if (searchResult && searchResult.rows.length > 0) {
            return searchResult.rows[0].id;
        }

        // Create new lead
        const insertResult = await Database.queryWithRetry(
            `
            INSERT INTO leads (
                id, phone, assigned_to, tags, custom_fields,
                created_at, updated_at, last_activity_at
            )
            VALUES (gen_random_uuid(), $1, $2, '[]', '{}', NOW(), NOW(), NOW())
            RETURNING id
        `,
            [phone, assignToUserId]
        );

        if (insertResult && insertResult.rows.length > 0) {
            Logger.info('New lead created', { id: insertResult.rows[0].id, phone });
            return insertResult.rows[0].id;
        }

        return null;
    },

    /**
     * Fetch phone number by lead ID
     * @param {string|number} leadId - Lead ID
     * @returns {Promise<string|null>} Phone number or null
     */
    async fetchPhoneById(leadId) {
        if (!leadId) {
            return null;
        }

        const result = await Database.queryWithRetry(
            `SELECT phone FROM leads WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
            [leadId]
        );

        if (!result || result.rows.length === 0) {
            return null;
        }

        return result.rows[0].phone;
    },

    /**
     * Assign lead to user if not already assigned
     * @param {string} leadId - Lead UUID
     * @param {number} userId - User ID to assign
     * @returns {Promise<boolean>} Whether assignment was made
     */
    async assignIfUnassigned(leadId, userId) {
        const result = await Database.queryWithRetry(
            `
            UPDATE leads
            SET assigned_to = $2, updated_at = NOW()
            WHERE id = $1::uuid
            AND assigned_to IS NULL
            AND deleted_at IS NULL
        `,
            [leadId, userId]
        );

        if (result && result.rowCount > 0) {
            Logger.info('Lead assigned to user on call answer', { lead_id: leadId, user_id: userId });
            return true;
        }
        return false;
    },
};

module.exports = LeadsDB;
