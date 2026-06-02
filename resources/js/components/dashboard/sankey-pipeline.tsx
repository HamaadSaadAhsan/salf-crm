import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLeadLifecycleFunnel } from '@/hooks/useDashboard';
import { router } from '@inertiajs/react';
import { useState } from 'react';

type Period = 7 | 14 | 30 | 60 | 90;

const STAGE_COLORS: Record<string, string> = {
    'New': '#3b82f6',
    'Contacted': '#8b5cf6',
    'Qualified': '#10b981',
    'Converted': '#f59e0b',
    'Won': '#22c55e',
};

const DROP_COLOR = '#ef444466';

function stageSlug(stage: string): string {
    return stage.toLowerCase().replace(/\s+/g, '-');
}

export function SankeyPipeline() {
    const [period, setPeriod] = useState<Period>(30);
    const { data, isLoading } = useLeadLifecycleFunnel(period);

    const isDark = document.documentElement.classList.contains('dark');

    const { nodes, links } = useMemo(() => {
        if (!data?.funnel_data?.length) return { nodes: [], links: [] };

        const funnel = data.funnel_data;
        const nodes: { name: string; itemStyle: { color: string } }[] = [];
        const links: { source: string; target: string; value: number; lineStyle?: any }[] = [];

        funnel.forEach((stage: any, i: number) => {
            const color = STAGE_COLORS[stage.stage] ?? '#6b7280';
            nodes.push({ name: stage.stage, itemStyle: { color } });

            if (i < funnel.length - 1) {
                const next = funnel[i + 1];
                const flowValue = Math.min(stage.count, next.count);
                const dropValue = Math.max(0, stage.count - next.count);

                if (flowValue > 0) {
                    links.push({
                        source: stage.stage,
                        target: next.stage,
                        value: flowValue,
                    });
                }

                // Drop-off node
                if (dropValue > 0) {
                    const dropName = `Drop (${stage.stage})`;
                    if (!nodes.find((n) => n.name === dropName)) {
                        nodes.push({ name: dropName, itemStyle: { color: '#ef4444' } });
                    }
                    links.push({
                        source: stage.stage,
                        target: dropName,
                        value: dropValue,
                        lineStyle: { color: DROP_COLOR, opacity: 0.4 },
                    });
                }
            }
        });

        return { nodes, links };
    }, [data]);

    const option = useMemo(() => ({
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            triggerOn: 'mousemove',
            backgroundColor: '#16181c',
            borderColor: '#27272a',
            borderWidth: 1,
            textStyle: { color: '#e4e4e7', fontFamily: 'monospace', fontSize: 12 },
            formatter: (params: any) => {
                if (params.dataType === 'node') {
                    return `<div style="padding:4px 8px">
                        <div style="font-weight:600">${params.name}</div>
                        <div style="color:#71717a;margin-top:2px">${params.value ?? ''} leads</div>
                    </div>`;
                }
                return `<div style="padding:4px 8px">
                    <div style="color:#71717a;font-size:11px">${params.data.source} → ${params.data.target}</div>
                    <div style="font-weight:600;margin-top:2px">${params.data.value} leads</div>
                </div>`;
            },
        },
        series: [
            {
                type: 'sankey',
                layout: 'none',
                emphasis: { focus: 'adjacency' },
                nodeAlign: 'left',
                nodeGap: 12,
                nodeWidth: 14,
                top: 12,
                bottom: 8,
                left: '2%',
                right: '18%',
                data: nodes,
                links,
                lineStyle: { curveness: 0.5, opacity: 0.25 },
                label: {
                    position: 'right',
                    fontSize: 11,
                    color: isDark ? '#a1a1aa' : '#52525b',
                    fontFamily: 'inherit',
                    formatter: (p: any) => {
                        const isDropOff = p.name.startsWith('Drop (');
                        return isDropOff ? `{drop|${p.name.replace('Drop (', '').replace(')', '')} lost}` : `{stage|${p.name}} {val|${p.value ?? ''}}`;
                    },
                    rich: {
                        stage: { fontWeight: 600, fontSize: 11 },
                        val: { color: isDark ? '#71717a' : '#94a3b8', fontSize: 10 },
                        drop: { color: '#ef4444', fontSize: 10 },
                    },
                },
            },
        ],
    }), [nodes, links, isDark]);

    const handleClick = (params: any) => {
        if (params.dataType !== 'node') return;
        const stage = params.name;
        if (stage.startsWith('Drop (')) return;
        router.visit(`/leads?status=${encodeURIComponent(stageSlug(stage))}`);
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                    <CardTitle className="text-sm font-semibold">Pipeline Flow</CardTitle>
                </CardHeader>
                <CardContent><Skeleton className="h-[260px] w-full" /></CardContent>
            </Card>
        );
    }

    if (!data?.funnel_data?.length) {
        return (
            <Card>
                <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                    <CardTitle className="text-sm font-semibold">Pipeline Flow</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                        No pipeline data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="min-w-0">
            <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                <div>
                    <CardTitle className="text-sm font-semibold">Pipeline Flow</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Sankey — click stage to view leads · drop-off shown in red
                    </p>
                </div>
                <CardToolbar>
                    <ToggleGroup
                        type="single"
                        value={String(period)}
                        variant="outline"
                        onValueChange={(v) => v && setPeriod(Number(v) as Period)}
                    >
                        {([7, 14, 30, 60, 90] as Period[]).map((p) => (
                            <ToggleGroupItem key={p} value={String(p)} className="px-2.5 text-xs first:rounded-s-full! last:rounded-e-full!">
                                {p < 30 ? `${p}D` : p === 30 ? '1M' : p === 60 ? '2M' : '3M'}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </CardToolbar>
            </CardHeader>
            <CardContent className="px-3 pb-5 pt-0">
                <ReactECharts
                    option={option}
                    style={{ height: 260 }}
                    onEvents={{ click: handleClick }}
                    notMerge
                />
            </CardContent>
        </Card>
    );
}
