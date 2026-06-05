import { useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react/lib/core';
import echarts from '@/lib/echarts-core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDailyMetrics } from '@/hooks/useDashboard';
import { router } from '@inertiajs/react';

interface CalendarHeatmapProps {
    year?: number;
}

export function CalendarHeatmap({ year = new Date().getFullYear() }: CalendarHeatmapProps) {
    const chartRef = useRef<any>(null);

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data: dailyMetrics, isLoading } = useDailyMetrics({ start_date: startDate, end_date: endDate });

    const calendarData: [string, number][] = useMemo(() => {
        if (!dailyMetrics) return [];
        return (dailyMetrics as any[]).map((m) => [m.metric_date, m.new_leads_today ?? 0]);
    }, [dailyMetrics]);

    const maxVal = useMemo(() => {
        if (!calendarData.length) return 10;
        return Math.max(...calendarData.map((d) => d[1]), 1);
    }, [calendarData]);

    // Top 10 days by lead volume — shown with ripple effectScatter (pissang pattern)
    const topDays = useMemo(() => (
        [...calendarData].sort((a, b) => b[1] - a[1]).slice(0, 10)
    ), [calendarData]);

    const isDark = document.documentElement.classList.contains('dark');

    const cellSize = 14;

    const option = useMemo(() => ({
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            backgroundColor: '#16181c',
            borderColor: '#27272a',
            borderWidth: 1,
            textStyle: { color: '#e4e4e7', fontFamily: 'monospace', fontSize: 12 },
            formatter: (params: any) => {
                const d = params.data ?? params.value;
                if (!d) return '';
                const [date, val] = Array.isArray(d) ? d : [d[0], d[1]];
                return `<div style="padding:4px 10px">
                    <div style="color:#71717a;font-size:11px">${date}</div>
                    <div style="font-weight:600;margin-top:2px;color:#e4e4e7">${val} new lead${val !== 1 ? 's' : ''}</div>
                </div>`;
            },
        },
        visualMap: {
            show: false,
            min: 0,
            max: maxVal,
            inRange: {
                color: isDark
                    ? ['#1a2440', '#1d4ed8', '#3b82f6', '#60a5fa']
                    : ['#eff6ff', '#93c5fd', '#3b82f6', '#1d4ed8'],
            },
        },
        calendar: {
            top: 24,
            left: 38,
            right: 12,
            bottom: 4,
            range: year,
            cellSize: [cellSize, cellSize],
            splitLine: { show: false },
            itemStyle: {
                borderWidth: 2.5,
                borderColor: isDark ? '#09090b' : '#f8fafc',
                color: isDark ? '#18181b' : '#f1f5f9',
                borderRadius: 2,
            },
            yearLabel: { show: false },
            monthLabel: {
                nameMap: 'en',
                color: isDark ? '#52525b' : '#94a3b8',
                fontSize: 10,
                fontFamily: 'inherit',
            },
            dayLabel: {
                firstDay: 0,
                nameMap: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
                color: isDark ? '#3f3f46' : '#cbd5e1',
                fontSize: 9,
                fontFamily: 'inherit',
            },
        },
        series: [
            {
                // Base scatter — all days (pissang uses roundRect scatter)
                type: 'scatter',
                coordinateSystem: 'calendar',
                symbol: 'roundRect',
                symbolSize: cellSize - 3,
                data: calendarData,
                itemStyle: {},
                universalTransition: { enabled: true, seriesKey: 'calendar' },
                emphasis: {
                    itemStyle: {
                        borderColor: isDark ? '#6366f1' : '#4f46e5',
                        borderWidth: 2,
                        shadowBlur: 8,
                        shadowColor: 'rgba(99,102,241,0.5)',
                    },
                },
            },
            {
                // Ripple highlight on top-10 days (pissang effectScatter pattern)
                type: 'effectScatter',
                coordinateSystem: 'calendar',
                symbolSize: cellSize - 3,
                rippleEffect: {
                    brushType: 'stroke',
                    scale: 3.5,
                    period: 4,
                },
                itemStyle: { color: isDark ? '#60a5fa' : '#2563eb' },
                data: topDays,
                z: 10,
            },
        ],
    }), [calendarData, topDays, maxVal, year, isDark, cellSize]);

    const handleChartClick = (params: any) => {
        const d = params.data ?? params.value;
        if (!d) return;
        const date = Array.isArray(d) ? d[0] : d[0];
        if (date) router.visit(`/leads?date_from=${date}&date_to=${date}`);
    };

    if (isLoading) {
        return (
            <Card className="min-w-0">
                <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                    <CardTitle className="text-sm font-semibold">Lead Volume — {year}</CardTitle>
                </CardHeader>
                <CardContent><Skeleton className="h-[180px] w-full" /></CardContent>
            </Card>
        );
    }

    const totalNew = calendarData.reduce((s, d) => s + (d[1] || 0), 0);

    return (
        <Card className="min-w-0">
            <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                <div>
                    <CardTitle className="text-sm font-semibold">Lead Volume — {year}</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {totalNew.toLocaleString()} new leads · ripple = top 10 days · click any day to view leads
                    </p>
                </div>
            </CardHeader>
            <CardContent className="px-3 pb-4 pt-0">
                <ReactECharts
                    ref={chartRef}
                    echarts={echarts}
                    option={option}
                    style={{ height: 180 }}
                    onEvents={{ click: handleChartClick }}
                    notMerge
                />
            </CardContent>
        </Card>
    );
}
