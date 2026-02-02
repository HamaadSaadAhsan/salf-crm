'use strict';

/**
 * Message Builder - Standardizes event message structure
 * Eliminates duplication of field naming across handlers
 */
class MessageBuilder {
    constructor(event, sessionData = null) {
        this.message = {
            event: event,
        };
        this.sessionData = sessionData;

        // Auto-add session info if available
        if (sessionData) {
            this.withSession();
        }
    }

    /**
     * Create a new message builder
     * @param {string} event - Event type
     * @param {Object} sessionData - Session data
     * @returns {MessageBuilder}
     */
    static create(event, sessionData = null) {
        return new MessageBuilder(event, sessionData);
    }

    /**
     * Add session identifiers (standardized naming)
     * @returns {MessageBuilder}
     */
    withSession() {
        if (this.sessionData) {
            this.message.session_id = this.sessionData.session_id || null;
            this.message.lead_id = this.sessionData.lead_id || null;
            this.message.direction = this.sessionData.call_direction || 'inbound';
        }
        return this;
    }

    /**
     * Add call info from Asterisk event
     * @param {Object} evt - Asterisk event
     * @returns {MessageBuilder}
     */
    withCallInfo(evt) {
        if (evt.uniqueid) {
            this.message.uniqueid = evt.uniqueid;
        }
        if (evt.linkedid) {
            this.message.linkedid = evt.linkedid;
        }
        if (evt.channel) {
            this.message.channel = evt.channel;
        }
        if (evt.calleridnum) {
            this.message.calleridnum = evt.calleridnum;
        }
        return this;
    }

    /**
     * Add caller information
     * @param {string} caller - Caller number
     * @returns {MessageBuilder}
     */
    withCaller(caller) {
        this.message.caller = caller;
        return this;
    }

    /**
     * Add extension information
     * @param {string} extension - Extension number
     * @returns {MessageBuilder}
     */
    withExtension(extension) {
        this.message.targetExtension = extension;
        this.message.exten = extension;
        return this;
    }

    /**
     * Add agent/client info for outbound calls
     * @returns {MessageBuilder}
     */
    withAgentClient() {
        if (this.sessionData) {
            this.message.agent = this.sessionData.agent || this.sessionData.caller_number;
            this.message.client = this.sessionData.client || this.sessionData.callee_number;
            this.message.agent_extension = this.message.agent;
        }
        return this;
    }

    /**
     * Add routing info
     * @param {string} phase - Call phase (dial, connected, ended, etc.)
     * @param {Object} extra - Extra routing fields
     * @returns {MessageBuilder}
     */
    withRouting(phase, extra = {}) {
        this.message.routing_info = {
            call_direction: this.sessionData?.call_direction || 'inbound',
            session_id: this.sessionData?.session_id || null,
            lead_id: this.sessionData?.lead_id || null,
            phase: phase,
            ...extra,
        };

        if (this.sessionData?.agent) {
            this.message.routing_info.agent = this.sessionData.agent;
        }
        if (this.sessionData?.client) {
            this.message.routing_info.client = this.sessionData.client;
        }

        return this;
    }

    /**
     * Add lead data
     * @param {Object} leadData - Lead information
     * @returns {MessageBuilder}
     */
    withLead(leadData) {
        if (leadData) {
            this.message.lead = leadData;
        }
        return this;
    }

    /**
     * Add dial status
     * @param {string} dialstatus - Asterisk dial status
     * @returns {MessageBuilder}
     */
    withDialStatus(dialstatus) {
        this.message.dialstatus = dialstatus;
        return this;
    }

    /**
     * Add hangup info
     * @param {string} cause - Hangup cause code
     * @param {string} causeTxt - Hangup cause text
     * @param {number} duration - Call duration in seconds
     * @param {string} endReason - End reason
     * @returns {MessageBuilder}
     */
    withHangupInfo(cause, causeTxt, duration, endReason) {
        this.message.cause = cause;
        this.message.causeTxt = causeTxt;
        this.message.duration = duration;
        this.message.endReason = endReason;
        return this;
    }

    /**
     * Add bridge info
     * @param {string} bridgeuniqueid - Bridge unique ID
     * @param {string} bridgetype - Bridge type
     * @returns {MessageBuilder}
     */
    withBridge(bridgeuniqueid, bridgetype) {
        if (bridgeuniqueid) {
            this.message.bridgeuniqueid = bridgeuniqueid;
        }
        if (bridgetype) {
            this.message.bridgetype = bridgetype;
        }
        return this;
    }

    /**
     * Add custom field
     * @param {string} key - Field name
     * @param {*} value - Field value
     * @returns {MessageBuilder}
     */
    with(key, value) {
        this.message[key] = value;
        return this;
    }

    /**
     * Add multiple custom fields
     * @param {Object} fields - Fields to add
     * @returns {MessageBuilder}
     */
    withFields(fields) {
        Object.assign(this.message, fields);
        return this;
    }

    /**
     * Build and return the message
     * @returns {Object}
     */
    build() {
        return this.message;
    }
}

module.exports = MessageBuilder;
