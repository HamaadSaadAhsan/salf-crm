import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/http';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { router } from '@inertiajs/react';
import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { ExternalLink, TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface ProgramQuarterData {
    quarter: string;
    total_leads: number;
    won_leads: number;
    conversion_rate: number;
}

interface ProgramDrillDownDialogProps {
    programName: string | null;
    onClose: () => void;
}

function useProgramQuarterly(programName: string | null) {
    return useQuery({
        queryKey: ['dashboard', 'quarterly-trends-program', programName],
        queryFn: async () => {
            const res = await axios.get('/api/dashboard/lead-analytics', {
                params: { program: programName, period: '1Y' },
            });
            return res.data;
        },
        enabled: !!programName,
        staleTime: 5 * 60 * 1000,
    });
}

function useProgramFunnel(programName: string | null) {
    return useQuery({
        queryKey: ['dashboard', 'funnel-program', programName],
        queryFn: async () => {
            const res = await axios.get('/api/dashboard/lifecycle-funnel', {
                params: { program: programName, period: 90 },
            });
            return res.data;
        },
        enabled: !!programName,
        staleTime: 5 * 60 * 1000,
    });
}

function useProgramLeads(programName: string | null) {
    return useQuery({
        queryKey: ['dashboard', 'leads-program', programName],
        queryFn: async () => {
            const res = await axios.get('/api/leads', {
                params: { service_id: programName, per_page: 10, sort: 'created_at', direction: 'desc' },
            });
            return res.data;
        },
        enabled: !!programName,
        staleTime: 2 * 60 * 1000,
    });
}

function SankeyWidget({ funnel }: { funnel: any[] }) {
    const isDark = document.documentElement.classList.contains('dark');

    const { nodes, links } = useMemo(() => {
        const nodes: any[] = [];
        const links: any[] = [];
        funnel.forEach((s: any, i: number) => {
            nodes.push({ name: s.stage, itemStyle: { color: s.color || '#3b82f6' } });
            if (i < funnel.length - 1) {
                const next = funnel[i + 1];
                const flow = Math.min(s.count, next.count);
                const drop = Math.max(0, s.count - next.count);
                if (flow > 0) links.push({ source: s.stage, target: next.stage, value: flow });
                if (drop > 0) {
                    const dn = `Lost (${s.stage})`;
                    if (!nodes.find((n: any) => n.name === dn)) {
                        nodes.push({ name: dn, itemStyle: { color: '#ef4444' } });
                    }
                    links.push({ source: s.stage, target: dn, value: drop, lineStyle: { color: '#ef444440', opacity: 0.4 } });
                }
            }
        });
        return { nodes, links };
    }, [funnel]);

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            backgroundColor: '#16181c',
            borderColor: '#27272a',
            textStyle: { color: '#e4e4e7', fontSize: 12, fontFamily: 'monospace' },
            formatter: (p: any) => {
                if (p.dataType === 'node') {
                    return `<b>${p.name}</b><br/>${p.value ?? ''} leads`;
                }
                return `${p.data.source} → ${p.data.target}<br/><b>${p.data.value}</b> leads`;
            },
        },
        series: [{
            type: 'sankey',
            layout: 'none',
            nodeAlign: 'left',
            nodeGap: 14,
            nodeWidth: 16,
            top: 10, bottom: 10, left: '2%', right: '20%',
            data: nodes,
            links,
            lineStyle: { curveness: 0.5, opacity: 0.25 },
            label: {
                position: 'right',
                fontSize: 11,
                color: isDark ? '#a1a1aa' : '#52525b',
                formatter: (p: any) => p.name.startsWith('Lost') ? `{r|${p.name}}` : `{b|${p.name}} {v|${p.value ?? ''}}`,
                rich: {
                    b: { fontWeight: 600 },
                    v: { color: isDark ? '#71717a' : '#94a3b8', fontSize: 10 },
                    r: { color: '#ef4444', fontSize: 10 },
                },
            },
        }],
    };

    return <ReactECharts option={option} style={{ height: 260 }} notMerge />;
}

export function ProgramDrillDownDialog({ programName, onClose }: ProgramDrillDownDialogProps) {
    const { data: funnelData, isLoading: funnelLoading } = useProgramFunnel(programName);
    const { data: leadsData, isLoading: leadsLoading } = useProgramLeads(programName);

    const funnel = (funnelData as any)?.funnel_data ?? [];
    const leads = (leadsData as any)?.data ?? [];
    const totalLeads = funnel[0]?.count ?? 0;
    const wonLeads = funnel[funnel.length - 1]?.count ?? 0;
    const convRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0.0';

    return (
        <Dialog open={!!programName} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden p-0">
                <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <DialogTitle className="text-lg font-semibold truncate">{programName}</DialogTitle>
                            <p className="mt-0.5 text-xs text-muted-foreground">LTS (Won) pipeline drill-down · last 90 days</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 text-sm">
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground">Total Leads</p>
                                <p className="font-bold tabular-nums">{totalLeads}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground">Won</p>
                                <p className="font-bold tabular-nums text-emerald-500">{wonLeads}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground">Rate</p>
                                <p className="font-bold tabular-nums">{convRate}%</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    router.visit(`/leads?service_id=${encodeURIComponent(programName ?? '')}`);
                                }}
                                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                            >
                                <ExternalLink className="size-3.5" />
                                View all leads
                            </button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    {/* Sankey */}
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pipeline Flow</p>
                        {funnelLoading ? (
                            <Skeleton className="h-[260px] w-full" />
                        ) : funnel.length > 0 ? (
                            <SankeyWidget funnel={funnel} />
                        ) : (
                            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                                No pipeline data for this program
                            </div>
                        )}
                    </div>

                    {/* Stage breakdown table */}
                    {funnel.length > 0 && (
                        <div className="border-t pt-4">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stage Breakdown</p>
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-muted-foreground">
                                        <th className="pb-2 text-left font-medium">Stage</th>
                                        <th className="pb-2 text-right font-medium">Count</th>
                                        <th className="pb-2 text-right font-medium">% of total</th>
                                        <th className="pb-2 text-right font-medium">Stage conv.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {funnel.map((s: any) => (
                                        <tr
                                            key={s.stage}
                                            className="cursor-pointer hover:bg-muted/30 transition-colors"
                                            onClick={() => {
                                                onClose();
                                                router.visit(`/leads?service_id=${encodeURIComponent(programName ?? '')}&status=${encodeURIComponent(s.stage.toLowerCase())}`);
                                            }}
                                        >
                                            <td className="py-1.5 pr-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-block size-2 rounded-full" style={{ backgroundColor: s.color }} />
                                                    <span className="font-medium">{s.stage}</span>
                                                </div>
                                            </td>
                                            <td className="py-1.5 text-right tabular-nums font-semibold">{s.count}</td>
                                            <td className="py-1.5 text-right tabular-nums text-muted-foreground">{s.percentage.toFixed(1)}%</td>
                                            <td className="py-1.5 text-right tabular-nums">
                                                {s.conversion_rate !== null ? (
                                                    <span className="text-emerald-500">{s.conversion_rate.toFixed(1)}%</span>
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Recent leads */}
                    <div className="border-t pt-4">
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Leads</p>
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    router.visit(`/leads?service_id=${encodeURIComponent(programName ?? '')}`);
                                }}
                                className="text-xs text-primary hover:underline"
                            >
                                View all →
                            </button>
                        </div>
                        {leadsLoading ? (
                            <div className="space-y-2">
                                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                            </div>
                        ) : leads.length > 0 ? (
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-muted-foreground">
                                        <th className="pb-2 text-left font-medium">Name</th>
                                        <th className="pb-2 text-left font-medium">Status</th>
                                        <th className="pb-2 text-left font-medium">Source</th>
                                        <th className="pb-2 text-right font-medium">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {leads.slice(0, 10).map((lead: any) => (
                                        <tr
                                            key={lead.id}
                                            className="cursor-pointer hover:bg-muted/30 transition-colors"
                                            onClick={() => { onClose(); router.visit(`/leads/${lead.id}`); }}
                                        >
                                            <td className="py-1.5 pr-3 font-medium">{lead.name}</td>
                                            <td className="py-1.5 pr-3">
                                                <Badge variant="secondary" size="sm" appearance="light">
                                                    {lead.status?.name ?? lead.inquiry_status ?? '—'}
                                                </Badge>
                                            </td>
                                            <td className="py-1.5 pr-3 text-muted-foreground">{lead.lead_source?.name ?? '—'}</td>
                                            <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                                                {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-sm text-muted-foreground">No recent leads for this program.</p>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
