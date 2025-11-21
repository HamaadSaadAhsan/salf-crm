/**
 * Dashboard Chart Color Palette
 *
 * Beautiful, accessible colors for dashboard charts
 * Inspired by modern design systems (Tailwind, Radix, etc.)
 */

export const CHART_COLORS = {
    // Primary colors - vibrant and eye-catching
    violet: {
        DEFAULT: 'hsl(258, 90%, 66%)', // Bright violet
        light: 'hsl(258, 90%, 76%)',
        dark: 'hsl(258, 90%, 56%)',
    },
    blue: {
        DEFAULT: 'hsl(217, 91%, 60%)', // Vivid blue
        light: 'hsl(217, 91%, 70%)',
        dark: 'hsl(217, 91%, 50%)',
    },
    cyan: {
        DEFAULT: 'hsl(189, 94%, 43%)', // Bright cyan
        light: 'hsl(189, 94%, 53%)',
        dark: 'hsl(189, 94%, 33%)',
    },
    emerald: {
        DEFAULT: 'hsl(160, 84%, 39%)', // Rich emerald
        light: 'hsl(160, 84%, 49%)',
        dark: 'hsl(160, 84%, 29%)',
    },
    amber: {
        DEFAULT: 'hsl(38, 92%, 50%)', // Warm amber
        light: 'hsl(38, 92%, 60%)',
        dark: 'hsl(38, 92%, 40%)',
    },
    rose: {
        DEFAULT: 'hsl(351, 95%, 71%)', // Soft rose
        light: 'hsl(351, 95%, 81%)',
        dark: 'hsl(351, 95%, 61%)',
    },
    indigo: {
        DEFAULT: 'hsl(239, 84%, 67%)', // Deep indigo
        light: 'hsl(239, 84%, 77%)',
        dark: 'hsl(239, 84%, 57%)',
    },
    teal: {
        DEFAULT: 'hsl(173, 80%, 40%)', // Ocean teal
        light: 'hsl(173, 80%, 50%)',
        dark: 'hsl(173, 80%, 30%)',
    },
    orange: {
        DEFAULT: 'hsl(25, 95%, 53%)', // Vibrant orange
        light: 'hsl(25, 95%, 63%)',
        dark: 'hsl(25, 95%, 43%)',
    },
    pink: {
        DEFAULT: 'hsl(330, 81%, 60%)', // Playful pink
        light: 'hsl(330, 81%, 70%)',
        dark: 'hsl(330, 81%, 50%)',
    },
    lime: {
        DEFAULT: 'hsl(84, 81%, 44%)', // Fresh lime
        light: 'hsl(84, 81%, 54%)',
        dark: 'hsl(84, 81%, 34%)',
    },
    fuchsia: {
        DEFAULT: 'hsl(292, 84%, 61%)', // Bold fuchsia
        light: 'hsl(292, 84%, 71%)',
        dark: 'hsl(292, 84%, 51%)',
    },
} as const;

/**
 * Chart color presets for common use cases
 */
export const CHART_PRESETS = {
    // For conversion/success metrics
    success: {
        primary: CHART_COLORS.emerald.DEFAULT,
        gradient: {
            start: CHART_COLORS.emerald.light,
            end: CHART_COLORS.emerald.dark,
        },
    },
    // For volume/growth metrics
    growth: {
        primary: CHART_COLORS.blue.DEFAULT,
        gradient: {
            start: CHART_COLORS.blue.light,
            end: CHART_COLORS.blue.dark,
        },
    },
    // For activity metrics
    activity: {
        primary: CHART_COLORS.violet.DEFAULT,
        gradient: {
            start: CHART_COLORS.violet.light,
            end: CHART_COLORS.violet.dark,
        },
    },
    // For warning/attention metrics
    warning: {
        primary: CHART_COLORS.amber.DEFAULT,
        gradient: {
            start: CHART_COLORS.amber.light,
            end: CHART_COLORS.amber.dark,
        },
    },
    // For user/team metrics
    team: {
        primary: CHART_COLORS.cyan.DEFAULT,
        gradient: {
            start: CHART_COLORS.cyan.light,
            end: CHART_COLORS.cyan.dark,
        },
    },
    // For time/performance metrics
    performance: {
        primary: CHART_COLORS.indigo.DEFAULT,
        gradient: {
            start: CHART_COLORS.indigo.light,
            end: CHART_COLORS.indigo.dark,
        },
    },
} as const;

/**
 * Multi-series chart colors (for charts with multiple data series)
 */
export const MULTI_SERIES_COLORS = [
    CHART_COLORS.violet.DEFAULT,
    CHART_COLORS.cyan.DEFAULT,
    CHART_COLORS.emerald.DEFAULT,
    CHART_COLORS.amber.DEFAULT,
    CHART_COLORS.rose.DEFAULT,
    CHART_COLORS.indigo.DEFAULT,
    CHART_COLORS.teal.DEFAULT,
    CHART_COLORS.orange.DEFAULT,
] as const;

/**
 * Get a color by index for multi-series charts
 */
export function getSeriesColor(index: number): string {
    return MULTI_SERIES_COLORS[index % MULTI_SERIES_COLORS.length];
}

/**
 * Create a gradient definition for area charts
 */
export function createGradientId(name: string): string {
    return `gradient-${name}`;
}