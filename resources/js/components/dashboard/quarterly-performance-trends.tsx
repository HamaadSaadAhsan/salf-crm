import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { CommandList } from 'cmdk';
import { useQuarterlyPerformanceTrends } from '@/hooks/useDashboard';
import { CHART_COLORS } from '@/lib/dashboard-colors';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const PROGRAM_COLORS = [
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

function safeCssKey(index: number): string {
    return `program_${index}`;
}

export function QuarterlyPerformanceTrends() {
    const { data, isLoading, error } = useQuarterlyPerformanceTrends(4);
    const [selectedPrograms, setSelectedPrograms] = useState<Set<string> | null>(null);
    const [comboOpen, setComboOpen] = useState(false);

    const programs = useMemo(() => data?.programs ?? [], [data]);

    // Default: all selected (overall + all programs)
    const visibleKeys = useMemo(() => {
        if (selectedPrograms === null) {
            const all = new Set(programs.map((_, i) => safeCssKey(i)));
            all.add('overall');
            return all;
        }
        return selectedPrograms;
    }, [selectedPrograms, programs]);

    const toggleKey = (key: string) => {
        setSelectedPrograms((prev) => {
            const current = prev ?? new Set([...programs.map((_, i) => safeCssKey(i)), 'overall']);
            const next = new Set(current);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const selectAll = () => setSelectedPrograms(null);
    const clearAll = () => setSelectedPrograms(new Set());

    const programKeyMap = useMemo(() => {
        const map: Record<string, string> = {};
        programs.forEach((name, i) => {
            map[name] = safeCssKey(i);
        });
        return map;
    }, [programs]);

    const chartConfig = useMemo<ChartConfig>(() => {
        const config: ChartConfig = {
            overall: {
                label: 'Overall',
                color: CHART_COLORS.blue.DEFAULT,
            },
        };
        programs.forEach((name, i) => {
            config[safeCssKey(i)] = {
                label: name,
                color: PROGRAM_COLORS[i % PROGRAM_COLORS.length],
            };
        });
        return config;
    }, [programs]);

    const chartData = useMemo(() => {
        if (!data) return [];
        return data.trends.map((t) => {
            const row: Record<string, any> = {
                quarter: t.quarter,
                overall: t.conversion_rate,
                total_leads: t.total_leads,
                won_leads: t.won_leads,
            };
            programs.forEach((name) => {
                row[programKeyMap[name]] = t.programs?.[name]?.conversion_rate ?? 0;
            });
            return row;
        });
    }, [data, programs, programKeyMap]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="min-h-auto border-0 py-4 sm:py-6">
                    <CardTitle className="text-base font-semibold sm:text-xl">LTS (Won) Performance Trends</CardTitle>
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
                    <CardTitle className="text-base font-semibold sm:text-xl">LTS (Won) Performance Trends</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                        {error ? 'Error loading data' : 'No data available'}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const allItems = [
        { key: 'overall', label: 'Overall', color: CHART_COLORS.blue.DEFAULT, dashed: true },
        ...programs.map((name, i) => ({
            key: safeCssKey(i),
            label: name,
            color: PROGRAM_COLORS[i % PROGRAM_COLORS.length],
            dashed: false,
        })),
    ];

    const visibleCount = visibleKeys.size;
    const totalCount = allItems.length;

    return (
        <Card className="min-w-0">
            <CardHeader className="min-h-auto border-0 py-4 sm:py-6">
                <CardTitle className="text-base font-semibold sm:text-xl">LTS (Won) Performance Trends</CardTitle>
                <CardDescription>
                    Quarterly conversion rate trends across {programs.length} program
                    {programs.length !== 1 ? 's' : ''}
                </CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
                {chartData.length === 0 ? (
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                        No quarterly data available
                    </div>
                ) : (
                    <>
                        {/* Multi-select combobox for programs */}
                        <div className="mb-4">
                            <Popover open={comboOpen} onOpenChange={setComboOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
                                    >
                                        <span>
                                            {visibleCount === totalCount
                                                ? 'All programs'
                                                : visibleCount === 0
                                                  ? 'No programs selected'
                                                  : `${visibleCount} of ${totalCount} selected`}
                                        </span>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[280px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search programs..." className="h-9" />
                                        <CommandList className="max-h-[300px] overflow-y-auto">
                                            <CommandEmpty>No program found.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    onSelect={selectAll}
                                                    className="cursor-pointer text-xs font-medium text-muted-foreground"
                                                >
                                                    Select All
                                                </CommandItem>
                                                <CommandItem
                                                    onSelect={clearAll}
                                                    className="cursor-pointer text-xs font-medium text-muted-foreground"
                                                >
                                                    Clear All
                                                </CommandItem>
                                            </CommandGroup>
                                            <CommandGroup>
                                                {allItems.map((item) => {
                                                    const isSelected = visibleKeys.has(item.key);
                                                    return (
                                                        <CommandItem
                                                            key={item.key}
                                                            value={item.label}
                                                            onSelect={() => toggleKey(item.key)}
                                                            className="cursor-pointer"
                                                        >
                                                            <span
                                                                className={cn(
                                                                    'mr-2 inline-block shrink-0',
                                                                    item.dashed
                                                                        ? 'h-0.5 w-4 rounded border-b-2 border-dashed'
                                                                        : 'h-2.5 w-2.5 rounded-full',
                                                                )}
                                                                style={
                                                                    item.dashed
                                                                        ? { borderColor: item.color }
                                                                        : { backgroundColor: item.color }
                                                                }
                                                            />
                                                            <span className="flex-1 truncate">{item.label}</span>
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
                                <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 11 }} width={45} tickFormatter={(v) => `${v}%`} />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            className="p-3"
                                            formatter={(value, name) => (
                                                <div className="flex w-full items-center justify-between gap-4">
                                                    <span className="text-muted-foreground">
                                                        {chartConfig[name as string]?.label ?? name}
                                                    </span>
                                                    <span className="font-mono font-medium tabular-nums">
                                                        {Number(value).toFixed(1)}%
                                                    </span>
                                                </div>
                                            )}
                                        />
                                    }
                                />
                                {visibleKeys.has('overall') && (
                                    <Line
                                        type="monotone"
                                        dataKey="overall"
                                        stroke="var(--color-overall)"
                                        strokeWidth={3}
                                        strokeDasharray="6 3"
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                        name="overall"
                                    />
                                )}
                                {programs.map((_, i) => {
                                    const key = safeCssKey(i);
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

                        {/* Quarter summary table */}
                        <div className="mt-4 overflow-x-auto border-t pt-4">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        <th className="pb-2 text-left font-medium">Quarter</th>
                                        <th className="pb-2 text-right font-medium">Leads</th>
                                        <th className="pb-2 text-right font-medium">Won</th>
                                        <th className="pb-2 text-right font-medium">Rate</th>
                                        {programs.map((name) => (
                                            <th key={name} className="pb-2 text-right font-medium">
                                                {name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.trends.map((t) => (
                                        <tr key={t.quarter} className="border-b last:border-0">
                                            <td className="py-2 font-medium">{t.quarter}</td>
                                            <td className="py-2 text-right">{t.total_leads.toLocaleString()}</td>
                                            <td className="py-2 text-right font-medium text-emerald-600">
                                                {t.won_leads.toLocaleString()}
                                            </td>
                                            <td className="py-2 text-right font-medium">{t.conversion_rate}%</td>
                                            {programs.map((name) => (
                                                <td key={name} className="py-2 text-right">
                                                    {t.programs?.[name]
                                                        ? `${t.programs[name].won_leads}/${t.programs[name].total_leads} (${t.programs[name].conversion_rate}%)`
                                                        : '—'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
