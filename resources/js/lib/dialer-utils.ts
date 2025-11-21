/**
 * Dialer Utility Functions
 * Helper functions for phone number formatting, validation, and call management
 */

/**
 * Format a phone number for display
 * @param number - Raw phone number string
 * @returns Formatted phone number
 */
export function formatPhoneNumber(number: string): string {
    if (!number) {
        return '';
    }

    // Remove all non-digit characters
    const cleaned = number.replace(/\D/g, '');

    // US/Canada format: (XXX) XXX-XXXX
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    // US/Canada with country code: +1 (XXX) XXX-XXXX
    if (cleaned.length === 11 && cleaned[0] === '1') {
        return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }

    // International format with + prefix (preserve original)
    if (number.startsWith('+')) {
        return number;
    }

    // Return original if doesn't match patterns
    return number;
}

/**
 * Validate if a phone number is valid
 * @param number - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function validatePhoneNumber(number: string): boolean {
    if (!number) {
        return false;
    }

    // Remove all non-digit characters
    const cleaned = number.replace(/\D/g, '');

    // Valid if 10 digits (US/Canada) or 11+ digits (international)
    return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Clean a phone number (remove all non-digit characters except leading +)
 * @param number - Phone number to clean
 * @returns Cleaned phone number
 */
export function cleanPhoneNumber(number: string): string {
    if (!number) {
        return '';
    }

    // Keep leading + for international numbers
    const hasPlus = number.startsWith('+');
    const cleaned = number.replace(/\D/g, '');

    return hasPlus ? `+${cleaned}` : cleaned;
}

/**
 * Format call duration in seconds to human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "1h 23m 45s", "5m 12s", "45s")
 */
export function formatCallDuration(seconds: number): string {
    if (seconds < 0) {
        return '0s';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }

    if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    }

    return `${remainingSeconds}s`;
}

/**
 * Format call duration in MM:SS format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "05:42", "123:15")
 */
export function formatCallDurationMMSS(seconds: number): string {
    if (seconds < 0) {
        return '00:00';
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Mask a phone number for privacy (shows only last 4 digits)
 * @param phone - Phone number to mask
 * @returns Masked phone number (e.g., "******1234")
 */
export function maskPhoneNumber(phone: string): string {
    if (!phone) {
        return '';
    }

    if (phone.length <= 4) {
        return phone;
    }

    return phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4);
}

/**
 * Get initials from a name
 * @param name - Full name
 * @returns Initials (max 2 characters)
 */
export function getInitials(name: string): string {
    if (!name) {
        return '??';
    }

    return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Parse E.164 formatted phone number
 * @param e164 - Phone number in E.164 format (+12345678900)
 * @returns Parsed components or null if invalid
 */
export function parseE164PhoneNumber(e164: string): {
    countryCode: string;
    nationalNumber: string;
    formattedNumber: string;
} | null {
    if (!e164 || !e164.startsWith('+')) {
        return null;
    }

    const cleaned = e164.slice(1); // Remove +

    // US/Canada (+1)
    if (cleaned.length === 11 && cleaned[0] === '1') {
        return {
            countryCode: '+1',
            nationalNumber: cleaned.slice(1),
            formattedNumber: formatPhoneNumber(cleaned),
        };
    }

    // Generic international
    return {
        countryCode: `+${cleaned.slice(0, 1)}`,
        nationalNumber: cleaned.slice(1),
        formattedNumber: e164,
    };
}

/**
 * Determine if a phone number is international
 * @param number - Phone number to check
 * @returns true if international format, false otherwise
 */
export function isInternationalNumber(number: string): boolean {
    if (!number) {
        return false;
    }

    return number.startsWith('+');
}

/**
 * Format a phone number for dialing (E.164 format)
 * @param number - Phone number to format
 * @param defaultCountryCode - Default country code (e.g., '1' for US/Canada)
 * @returns E.164 formatted number
 */
export function formatForDialing(number: string, defaultCountryCode = '1'): string {
    const cleaned = cleanPhoneNumber(number);

    // Already has + prefix (international)
    if (cleaned.startsWith('+')) {
        return cleaned;
    }

    // 10 digits - add default country code
    if (cleaned.length === 10) {
        return `+${defaultCountryCode}${cleaned}`;
    }

    // 11 digits starting with 1 (US/Canada)
    if (cleaned.length === 11 && cleaned[0] === '1') {
        return `+${cleaned}`;
    }

    // Return as-is for other lengths
    return `+${cleaned}`;
}

/**
 * Check if two phone numbers are the same
 * @param number1 - First phone number
 * @param number2 - Second phone number
 * @returns true if numbers match, false otherwise
 */
export function arePhoneNumbersEqual(number1: string, number2: string): boolean {
    const cleaned1 = cleanPhoneNumber(number1);
    const cleaned2 = cleanPhoneNumber(number2);

    // Remove leading + and country codes for comparison
    const normalized1 = cleaned1.replace(/^\+?1?/, '');
    const normalized2 = cleaned2.replace(/^\+?1?/, '');

    return normalized1 === normalized2;
}

/**
 * Get call status display text
 * @param status - Call status
 * @returns Human-readable status text
 */
export function getCallStatusText(
    status: 'initiated' | 'ringing' | 'answered' | 'active' | 'on_hold' | 'ended' | 'failed'
): string {
    const statusMap: Record<string, string> = {
        initiated: 'Initiating...',
        ringing: 'Ringing...',
        answered: 'Answered',
        active: 'Active',
        on_hold: 'On Hold',
        ended: 'Ended',
        failed: 'Failed',
    };

    return statusMap[status] || 'Unknown';
}

/**
 * Get call direction icon
 * @param direction - Call direction
 * @returns Icon name for the direction
 */
export function getCallDirectionIcon(direction: 'inbound' | 'outbound'): string {
    return direction === 'inbound' ? 'phone-incoming' : 'phone-outgoing';
}

/**
 * Calculate call cost (if applicable)
 * @param duration - Call duration in seconds
 * @param ratePerMinute - Rate per minute
 * @returns Calculated cost
 */
export function calculateCallCost(duration: number, ratePerMinute: number): number {
    const minutes = Math.ceil(duration / 60);
    return minutes * ratePerMinute;
}
