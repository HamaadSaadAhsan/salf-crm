import { cn } from '@/lib/utils';

interface TooltipPayloadItem {
    name?: string;
    value?: number | string;
    color?: string;
    dataKey?: string;
    payload?: Record<string, unknown>;
}

interface NightTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string | number;
    labelFormatter?: (label: string | number) => string;
    valueFormatter?: (value: number | string, name: string) => string;
    showTotal?: boolean;
    totalFormatter?: (total: number) => string;
    hideZeroValues?: boolean;
    className?: string;
    // allow Recharts internal props to pass through without TS error
    [key: string]: unknown;
}

export function NightTooltip({
    active,
    payload,
    label,
    labelFormatter,
    valueFormatter,
    showTotal = false,
    totalFormatter,
    hideZeroValues = false,
    className,
}: NightTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;

    const rows = hideZeroValues
        ? payload.filter((item) => Number(item.value) !== 0)
        : payload;

    if (rows.length === 0) return null;

    const displayLabel = label !== undefined
        ? (labelFormatter ? labelFormatter(label) : String(label))
        : null;

    const total = showTotal
        ? rows.reduce((sum, item) => sum + (Number(item.value) || 0), 0)
        : null;

    return (
        <div className={cn(
            'min-w-[160px] rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl',
            className,
        )}>
            {displayLabel && (
                <>
                    <div className="px-3 py-2.5">
                        <p className="font-mono text-xs text-zinc-400">{displayLabel}</p>
                    </div>
                    <div className="border-t border-zinc-800" />
                </>
            )}
            <div className="space-y-0 px-3 py-2">
                {rows.map((item, i) => {
                    if (item.value === undefined || item.value === null) return null;
                    const displayValue = valueFormatter
                        ? valueFormatter(item.value, item.name ?? '')
                        : String(item.value);
                    const label = item.name ?? item.dataKey ?? '';

                    return (
                        <div key={i} className="flex items-center justify-between gap-6 py-1">
                            <div className="flex items-center gap-2.5 min-w-0">
                                {item.color && (
                                    <span
                                        className="inline-block h-4 w-1 shrink-0 rounded-full opacity-90"
                                        style={{ backgroundColor: item.color }}
                                    />
                                )}
                                <span className="truncate text-xs text-zinc-300">{label}</span>
                            </div>
                            <span className="shrink-0 font-mono text-xs font-medium text-zinc-100 tabular-nums">
                                {displayValue}
                            </span>
                        </div>
                    );
                })}
                {showTotal && total !== null && (
                    <div className="flex items-center justify-between gap-6 border-t border-zinc-800 pt-1.5 mt-0.5 py-1">
                        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">Total</span>
                        <span className="shrink-0 font-mono text-xs font-semibold text-zinc-100 tabular-nums">
                            {totalFormatter ? totalFormatter(total) : String(total)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
