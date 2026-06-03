import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { NightTooltip } from '@/components/dashboard/night-tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { CommandList } from 'cmdk';
import { useQuarterlyPerformanceTrends } from '@/hooks/useDashboard';
import { CHART_COLORS } from '@/lib/dashboard-colors';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProgramDrillDownDialog } from '@/components/dashboard/program-drilldown-dialog';

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
    const [drillDownProgram, setDrillDownProgram] = useState<string | null>(null);

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
        <Card className="min-w-0 overflow-visible">
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

                        {/* Summary metrics */}
                        {data.trends.length > 0 && (() => {
                            const last = data.trends[data.trends.length - 1];
                            return (
                                <div className="mb-4 flex items-center gap-6 text-sm">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Leads</p>
                                        <p className="text-xl font-bold tabular-nums">{last.total_leads.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Won</p>
                                        <p className="text-xl font-bold tabular-nums text-emerald-500">{last.won_leads}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Rate</p>
                                        <p className="text-xl font-bold tabular-nums">{last.conversion_rate}%</p>
                                    </div>
                                    <p className="ml-auto text-xs text-muted-foreground">{last.quarter}</p>
                                </div>
                            );
                        })()}

                        <ChartContainer config={chartConfig} className="h-[280px] w-full">
                            <LineChart data={chartData} margin={{ top: 8, left: -10, right: 10, bottom: 0 }}>
                                <CartesianGrid horizontal vertical={false} stroke="currentColor" strokeOpacity={0.07} />
                                <XAxis dataKey="quarter" tick={{ fontSize: 11, opacity: 0.5 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, opacity: 0.5 }} axisLine={false} tickLine={false} width={42} tickFormatter={(v) => `${v}%`} />
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
                                            valueFormatter={(v) => `${Number(v).toFixed(1)}%`}
                                            hideZeroValues
                                        />
                                    )}
                                />
                                {visibleKeys.has('overall') && (
                                    <Line
                                        type="monotone"
                                        dataKey="overall"
                                        stroke="var(--color-overall)"
                                        strokeWidth={2}
                                        strokeDasharray="6 3"
                                        dot={{ r: 4, fill: 'var(--color-overall)', strokeWidth: 0 }}
                                        activeDot={{ r: 6 }}
                                        name="overall"
                                    />
                                )}
                                {programs.map((name, i) => {
                                    const key = safeCssKey(i);
                                    if (!visibleKeys.has(key)) return null;
                                    return (
                                        <Line
                                            key={key}
                                            type="monotone"
                                            dataKey={key}
                                            stroke={`var(--color-${key})`}
                                            strokeWidth={1.5}
                                            dot={{ r: 3, fill: `var(--color-${key})`, strokeWidth: 0 }}
                                            activeDot={{
                                                r: 6,
                                                cursor: 'pointer',
                                                onClick: () => setDrillDownProgram(name),
                                            }}
                                            name={key}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    );
                                })}
                            </LineChart>
                        </ChartContainer>

                        <div className="mt-4 overflow-x-auto border-t pt-3">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-muted-foreground">
                                        <th className="pb-2 px-2 text-left font-medium">Quarter</th>
                                        <th className="pb-2 px-2 text-right font-medium">Leads</th>
                                        <th className="pb-2 px-2 text-right font-medium">Won</th>
                                        <th className="pb-2 px-2 text-right font-medium">Rate</th>
                                        {programs.map((name) => (
                                            <th
                                                key={name}
                                                className="pb-2 text-right font-medium whitespace-nowrap px-2 cursor-pointer hover:text-foreground transition-colors"
                                                onClick={() => setDrillDownProgram(name)}
                                                title={`Drill down: ${name}`}
                                            >
                                                {name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {data.trends.map((t) => (
                                        <tr key={t.quarter} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-1.5 px-2 font-medium whitespace-nowrap">{t.quarter}</td>
                                            <td className="py-1.5 px-2 text-right tabular-nums">{t.total_leads.toLocaleString()}</td>
                                            <td className="py-1.5 px-2 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                                                {t.won_leads.toLocaleString()}
                                            </td>
                                            <td className="py-1.5 px-2 text-right tabular-nums font-medium">{t.conversion_rate}%</td>
                                            {programs.map((name) => (
                                                <td
                                                    key={name}
                                                    className="py-1.5 text-right tabular-nums px-2 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                                                    onClick={() => setDrillDownProgram(name)}
                                                >
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

            <ProgramDrillDownDialog
                programName={drillDownProgram}
                onClose={() => setDrillDownProgram(null)}
            />
        </Card>
    );
}
