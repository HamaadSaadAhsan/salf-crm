import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { NightTooltip } from '@/components/dashboard/night-tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { CommandList } from 'cmdk';
import { useAdSourceTimeSeries } from '@/hooks/useDashboard';
import { CHART_COLORS } from '@/lib/dashboard-colors';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Months = 3 | 6 | 9 | 12;

const MONTH_OPTIONS: { value: Months; label: string }[] = [
    { value: 3, label: '3M' },
    { value: 6, label: '6M' },
    { value: 9, label: '9M' },
    { value: 12, label: '1Y' },
];

const SOURCE_COLORS = [
    CHART_COLORS.blue.DEFAULT,
    CHART_COLORS.emerald.DEFAULT,
    CHART_COLORS.amber.DEFAULT,
    CHART_COLORS.rose.DEFAULT,
    CHART_COLORS.violet.DEFAULT,
    CHART_COLORS.cyan.DEFAULT,
    CHART_COLORS.indigo.DEFAULT,
    CHART_COLORS.teal.DEFAULT,
    CHART_COLORS.orange.DEFAULT,
    CHART_COLORS.pink.DEFAULT,
    CHART_COLORS.lime.DEFAULT,
    CHART_COLORS.fuchsia.DEFAULT,
];

function safeKey(index: number): string {
    return `source_${index}`;
}

export function AdSourceConversions() {
    const [months, setMonths] = useState<Months>(6);
    const { data, isLoading, error } = useAdSourceTimeSeries(months);
    const [selectedSources, setSelectedSources] = useState<Set<string> | null>(null);
    const [comboOpen, setComboOpen] = useState(false);

    const sources = useMemo(() => data?.sources ?? [], [data]);

    // Default: all selected
    const visibleKeys = useMemo(() => {
        if (selectedSources === null) {
            return new Set(sources.map((_, i) => safeKey(i)));
        }
        return selectedSources;
    }, [selectedSources, sources]);

    const toggleSource = (key: string) => {
        setSelectedSources((prev) => {
            const current = prev ?? new Set(sources.map((_, i) => safeKey(i)));
            const next = new Set(current);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const selectAll = () => setSelectedSources(null);
    const clearAll = () => setSelectedSources(new Set());

    const chartConfig = useMemo<ChartConfig>(() => {
        const config: ChartConfig = {};
        sources.forEach((name, i) => {
            config[safeKey(i)] = {
                label: name,
                color: SOURCE_COLORS[i % SOURCE_COLORS.length],
            };
        });
        return config;
    }, [sources]);

    const chartData = useMemo(() => {
        if (!data) return [];
        return data.series.map((entry) => {
            const row: Record<string, any> = { month: entry.month };
            sources.forEach((name, i) => {
                row[safeKey(i)] = entry.sources?.[name]?.won_leads ?? 0;
            });
            return row;
        });
    }, [data, sources]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="min-h-auto border-0 py-4 sm:py-6">
                    <CardTitle className="text-base font-semibold sm:text-xl">
                        Ad Sources: LTS (Won) Comparison
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[350px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader className="min-h-auto border-0 py-4 sm:py-6">
                    <CardTitle className="text-base font-semibold sm:text-xl">
                        Ad Sources: LTS (Won) Comparison
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                        {error ? 'Error loading data' : 'No data available'}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const visibleCount = visibleKeys.size;
    const totalCount = sources.length;

    return (
        <Card className="min-w-0 overflow-visible">
            <CardHeader className="min-h-auto border-0 py-4 sm:py-6">
                <div>
                    <CardTitle className="text-base font-semibold sm:text-xl">
                        Ad Sources: LTS (Won) Comparison
                    </CardTitle>
                    <CardDescription>Monthly won leads trend per ad source</CardDescription>
                </div>
                <CardToolbar className="flex items-center gap-2">
                    <ToggleGroup
                        type="single"
                        value={String(months)}
                        variant="outline"
                        onValueChange={(v) => v && setMonths(Number(v) as Months)}
                    >
                        {MONTH_OPTIONS.map((o) => (
                            <ToggleGroupItem
                                key={o.value}
                                value={String(o.value)}
                                className="px-2.5 text-xs first:rounded-s-full! last:rounded-e-full!"
                            >
                                {o.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </CardToolbar>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
                {chartData.length === 0 ? (
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                        No data available
                    </div>
                ) : (
                    <>
                        {/* Multi-select combobox for sources */}
                        <div className="mb-4">
                            <Popover open={comboOpen} onOpenChange={setComboOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
                                    >
                                        <span>
                                            {visibleCount === totalCount
                                                ? 'All sources'
                                                : visibleCount === 0
                                                  ? 'No sources selected'
                                                  : `${visibleCount} of ${totalCount} sources`}
                                        </span>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[250px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search sources..." className="h-9" />
                                        <CommandList className="max-h-[250px] overflow-y-auto">
                                            <CommandEmpty>No source found.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem onSelect={selectAll} className="cursor-pointer text-xs font-medium text-muted-foreground">
                                                    Select All
                                                </CommandItem>
                                                <CommandItem onSelect={clearAll} className="cursor-pointer text-xs font-medium text-muted-foreground">
                                                    Clear All
                                                </CommandItem>
                                            </CommandGroup>
                                            <CommandGroup>
                                                {sources.map((name, i) => {
                                                    const key = safeKey(i);
                                                    const isSelected = visibleKeys.has(key);
                                                    const color = SOURCE_COLORS[i % SOURCE_COLORS.length];
                                                    return (
                                                        <CommandItem
                                                            key={key}
                                                            value={name}
                                                            onSelect={() => toggleSource(key)}
                                                            className="cursor-pointer"
                                                        >
                                                            <span
                                                                className="mr-2 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                                                                style={{ backgroundColor: color }}
                                                            />
                                                            <span className="flex-1 truncate">{name}</span>
                                                            <Check
                                                                className={cn(
                                                                    'ml-auto h-4 w-4 shrink-0',
                                                                    isSelected ? 'opacity-100' : 'opacity-0',
                                                                )}
                                                            />
                                                        </CommandItem>
                                                    );
                                                })}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <ChartContainer config={chartConfig} className="h-[350px] w-full">
                            <LineChart data={chartData} margin={{ top: 10, left: -10, right: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} width={40} allowDecimals={false} />
                                <ChartTooltip
                                    allowEscapeViewBox={{ x: false, y: true }}
                                    wrapperStyle={{ zIndex: 9999 }}
                                    content={(props: any) => (
                                        <NightTooltip
                                            {...props}
                                            payload={props.payload?.map((p: any) => ({
                                                ...p,
                                                name: chartConfig[p.dataKey as string]?.label ?? p.name,
                                            }))}
                                            valueFormatter={(v) => `${v} won`}
                                            hideZeroValues
                                        />
                                    )}
                                />
                                {sources.map((_, i) => {
                                    const key = safeKey(i);
                                    if (!visibleKeys.has(key)) return null;
                                    return (
                                        <Line
                                            key={key}
                                            type="monotone"
                                            dataKey={key}
                                            stroke={`var(--color-${key})`}
                                            strokeWidth={2}
                                            dot={{ r: 3 }}
                                            activeDot={{ r: 5 }}
                                            name={key}
                                        />
                                    );
                                })}
                            </LineChart>
                        </ChartContainer>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
