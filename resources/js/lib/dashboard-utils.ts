/**
 * Format a number with commas
 */
export function formatNumber(num: number | null | undefined | string): string {
    if (num === null || num === undefined || num === '') return '0';

    // Convert to number if it's a string
    const numValue = typeof num === 'string' ? parseFloat(num) : num;

    // Check if it's a valid number
    if (isNaN(numValue)) return '0';

    return new Intl.NumberFormat('en-US').format(numValue);
}

/**
 * Format a percentage
 */
export function formatPercent(num: number | null | undefined | string, decimals = 1): string {
    if (num === null || num === undefined || num === '') return '0%';

    // Convert to number if it's a string
    const numValue = typeof num === 'string' ? parseFloat(num) : num;

    // Check if it's a valid number
    if (isNaN(numValue)) return '0%';

    return `${numValue.toFixed(decimals)}%`;
}

/**
 * Format time in minutes to a human-readable format
 */
export function formatTime(minutes: number | null | undefined | string): string {
    if (minutes === null || minutes === undefined || minutes === '') return 'N/A';

    // Convert to number if it's a string
    const numValue = typeof minutes === 'string' ? parseFloat(minutes) : minutes;

    // Check if it's a valid number
    if (isNaN(numValue)) return 'N/A';

    if (numValue < 60) {
        return `${Math.round(numValue)}m`;
    }

    const hours = Math.floor(numValue / 60);
    const mins = Math.round(numValue % 60);

    if (hours < 24) {
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

/**
 * Get color based on metric value and thresholds
 */
export function getMetricColor(
    value: number,
    thresholds: { good: number; warning: number }
): 'green' | 'yellow' | 'red' {
    if (value >= thresholds.good) return 'green';
    if (value >= thresholds.warning) return 'yellow';
    return 'red';
}

/**
 * Calculate trend percentage between two values
 */
export function calculateTrend(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
}

/**
 * Get status text for response time
 */
export function getResponseTimeStatus(minutes: number | null | undefined): {
    text: string;
    color: 'green' | 'yellow' | 'red';
} {
    if (minutes === null || minutes === undefined) {
        return { text: 'No data', color: 'yellow' };
    }

    if (minutes < 60) {
        return { text: 'Excellent', color: 'green' };
    } else if (minutes < 240) {
        return { text: 'Good', color: 'yellow' };
    } else {
        return { text: 'Needs improvement', color: 'red' };
    }
}
