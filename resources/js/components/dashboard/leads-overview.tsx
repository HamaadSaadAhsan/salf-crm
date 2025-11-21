import React, { Fragment, useState, useMemo } from 'react';
import { CheckCircle, Clock, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardToolbar,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useLeadsOverview } from '@/hooks/useDashboard';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { ExportButton } from '@/components/dashboard/export-button';
import { DrillDownModal, DrillDownData } from '@/components/dashboard/drill-down-modal';
import { useRealtimeMetrics } from '@/hooks/useRealtimeMetrics';

const chartConfig = {
  deals: {
    label: 'Deals',
    color: 'var(--color-emerald-600)',
  },
} satisfies ChartConfig;

// Custom Tooltip
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg bg-zinc-900 text-white p-3 shadow-lg">
        <div className="text-xs font-medium mb-1">Deals:</div>
        <div className="text-sm font-semibold">{payload[0].value} deals</div>
      </div>
    );
  }
  return null;
};

// Period configuration
const PERIODS = {
  day: { key: 'day', label: 'Day' },
  week: { key: 'week', label: 'Week' },
  month: { key: 'month', label: 'Month' },
  year: { key: 'year', label: 'Year' },
} as const;

type PeriodKey = keyof typeof PERIODS;

export function LeadsOverview() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('day');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);

  // Fetch data from API
  const { data, isLoading, error } = useLeadsOverview(selectedPeriod);

  // Real-time updates
  const { isConnected, lastUpdate } = useRealtimeMetrics({
    channel: 'dashboard',
    events: ['LeadCreated', 'LeadConverted', 'MetricUpdated'],
    enabled: true,
  });

  // Get chart data and statistics
  const currentData = data?.chart_data || [];
  const statistics = data?.statistics;

  // Prepare data for export
  const exportData = useMemo(() => {
    return currentData.map(item => ({
      Period: item.period,
      Deals: item.deals,
    }));
  }, [currentData]);

  // Handle chart element click for drill-down
  const handleChartClick = (payload: any) => {
    console.log('Chart clicked with payload:', payload);

    if (!payload || !payload.deals) {
      console.log('Invalid payload, missing deals data');
      return;
    }

    // Create drill-down data
    const drillDown: DrillDownData = {
      title: `${payload.period} Deals`,
      period: payload.period,
      value: payload.deals,
      details: [
        { label: 'Total Deals', value: payload.deals, trend: 'neutral' },
        { label: 'Closed Deals', value: statistics?.closed_deals || 0, trend: 'up' },
        { label: 'Pipeline Value', value: statistics?.pipeline_value_formatted || '$0', badge: 'Active' },
        { label: 'Conversion Rate', value: `${statistics?.conversion_rate || 0}%`, trend: 'up' },
      ],
      breakdown: [
        { category: 'Closed', value: statistics?.closed_deals || 0, percentage: 60, color: '#10b981' },
        { category: 'In Progress', value: Math.floor((statistics?.closed_deals || 0) * 0.5), percentage: 30, color: '#f59e0b' },
        { category: 'Lost', value: Math.floor((statistics?.closed_deals || 0) * 0.17), percentage: 10, color: '#ef4444' },
      ],
      relatedMetrics: [
        { label: 'Average Deal Size', value: '$5,000', change: 12 },
        { label: 'Win Rate', value: '65%', change: 5 },
        { label: 'Sales Cycle', value: '14 days', change: -2 },
      ],
    };

    console.log('Opening drill-down modal with data:', drillDown);
    setDrillDownData(drillDown);
  };

  // Statistics data with real values
  const statisticsData = [
    {
      id: 'closed',
      label: 'Closed Deals',
      value: statistics?.closed_deals?.toString() || '0',
      change: statistics?.closed_deals_change || '+0 deals',
      changeType: 'positive',
      icon: CheckCircle,
    },
    {
      id: 'pipeline',
      label: 'Pipeline Value',
      value: statistics?.pipeline_value_formatted || '$0',
      change: statistics?.pipeline_change || '+$0',
      changeType: 'positive',
      icon: Clock,
    },
    {
      id: 'conversion',
      label: 'Conversion Rate',
      value: `${statistics?.conversion_rate || 0}%`,
      change: statistics?.conversion_change || '+0%',
      changeType: 'positive',
      icon: TrendingUp,
    },
  ] as const;

  if (error) {
    return (
      <Card className="">
        <CardHeader className="min-h-auto py-6 border-0">
          <CardTitle className="text-xl font-semibold">Deals Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Failed to load deals overview data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card id="leads-overview-chart" className="">
        <CardHeader className="min-h-auto py-6 border-0">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl font-semibold">Deals Overview</CardTitle>
              {isConnected && (
                <Badge variant="secondary" className="gap-1.5">
                  <Wifi className="h-3 w-3" />
                  Live
                  {lastUpdate && (
                    <span className="text-xs opacity-70">
                      {format(lastUpdate, 'HH:mm')}
                    </span>
                  )}
                </Badge>
              )}
            </div>
          </div>
          <CardToolbar className="flex items-center gap-2 flex-wrap">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              align="end"
              className="mr-2"
            />
            <ExportButton
              data={exportData}
              elementId="leads-overview-chart"
              filename={`leads-overview-${selectedPeriod}-${format(new Date(), 'yyyy-MM-dd')}`}
              title="Deals Overview Report"
              formats={['csv', 'png', 'pdf']}
              variant="outline"
              size="sm"
            />
            <ToggleGroup
              type="single"
              value={selectedPeriod}
              variant="outline"
              onValueChange={(value) =>
                value && setSelectedPeriod(value as PeriodKey)
              }
              className=""
            >
              {Object.values(PERIODS).map((period) => (
                <ToggleGroupItem
                  key={period.key}
                  value={period.key}
                  className="px-3.5 first:rounded-s-full! last:rounded-e-full!"
                >
                  {period.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </CardToolbar>
        </CardHeader>

      <CardContent className="px-0">
        {isLoading ? (
          <>
            {/* Statistics Blocks Skeleton */}
            <div className="flex items-center flex-wrap px-6 gap-10 mb-10">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                </div>
              ))}
            </div>
            {/* Chart Skeleton */}
            <div className="px-3.5 h-[250px] w-full">
              <Skeleton className="h-full w-full" />
            </div>
          </>
        ) : (
          <>
            {/* Statistics Blocks */}
            <div className="flex items-center flex-wrap px-6 gap-10 mb-10">
              {statisticsData.map((stat) => {
                const IconComponent = stat.icon;
                return (
                  <Fragment key={stat.id}>
                    <div className="h-10 w-px bg-border hidden lg:block first:hidden" />
                    <div key={stat.id} className="flex items-center gap-3">
                      <div className="flex items-center">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/60 border border-muted-foreground/10">
                            <IconComponent className="w-4.5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground mb-0.5">
                              {stat.label}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold">
                                {stat.value}
                              </span>
                              <span
                                className={`text-sm font-medium ${
                                  stat.changeType === 'positive'
                                    ? 'text-emerald-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {stat.change}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Fragment>
                );
              })}
            </div>

            {/* Chart */}
            <div className="px-3.5 h-[250px] w-full">
              <ChartContainer
                config={chartConfig}
                className="h-full w-full overflow-visible [&_.recharts-curve.recharts-tooltip-cursor]:stroke-initial"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={currentData}
                    margin={{
                      top: 15,
                      right: 10,
                      left: 10,
                      bottom: 15,
                    }}
                    style={{ overflow: 'visible' }}
                  >
                  {/* SVG Pattern for chart area */}
                  <defs>
                    {/* Grid pattern */}
                    <pattern
                      id="gridPattern"
                      x="0"
                      y="0"
                      width="20"
                      height="40"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 20 0 L 0 0 0 20"
                        fill="none"
                        stroke="var(--input)"
                        strokeWidth="0.5"
                        strokeOpacity="1"
                      />
                    </pattern>

                    {/* Area gradient fill */}
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={chartConfig.deals.color}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor={chartConfig.deals.color}
                        stopOpacity={0.05}
                      />
                    </linearGradient>

                    {/* Shadow filters for dots */}
                    <filter
                      id="dotShadow"
                      x="-100%"
                      y="-100%"
                      width="300%"
                      height="300%"
                    >
                      <feDropShadow
                        dx="2"
                        dy="2"
                        stdDeviation="3"
                        floodColor="rgba(0,0,0,0.4)"
                      />
                    </filter>
                    <filter
                      id="activeDotShadow"
                      x="-100%"
                      y="-100%"
                      width="300%"
                      height="300%"
                    >
                      <feDropShadow
                        dx="3"
                        dy="3"
                        stdDeviation="4"
                        floodColor="rgba(0,0,0,0.5)"
                      />
                    </filter>
                  </defs>

                  {/* Background pattern for chart area only */}
                  <rect
                    x="60px"
                    y="-20px"
                    width="calc(100% - 75px)"
                    height="calc(100% - 10px)"
                    fill="url(#gridPattern)"
                    style={{ pointerEvents: 'none' }}
                  />

                  <XAxis
                    dataKey="period"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickMargin={8}
                    interval={0}
                    includeHidden={true}
                  />

                  <YAxis
                    hide={true}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${value} deals`}
                    tickMargin={8}
                    domain={[0, 'dataMax']}
                    ticks={[0]}
                  />

                  <ChartTooltip
                    content={<CustomTooltip />}
                    cursor={{
                      stroke: chartConfig.deals.color,
                      strokeWidth: 1,
                      strokeDasharray: 'none',
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="deals"
                    stroke={chartConfig.deals.color}
                    strokeWidth={2}
                    fill="url(#areaGradient)"
                    style={{ cursor: 'pointer' }}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      // Show dots only for specific periods based on selected time range
                      const showDot =
                        (selectedPeriod === 'day' &&
                          (payload.period === '08:00' ||
                            payload.period === '16:00')) ||
                        (selectedPeriod === 'week' &&
                          (payload.period === 'Thu' || payload.period === 'Sat')) ||
                        (selectedPeriod === 'month' &&
                          payload.period === 'Week 2') ||
                        (selectedPeriod === 'year' && payload.period === 'Q2');

                      if (showDot) {
                        return (
                          <circle
                            key={`dot-${cx}-${cy}`}
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill={chartConfig.deals.color}
                            stroke="white"
                            strokeWidth={2}
                            filter="url(#dotShadow)"
                          />
                        );
                      }
                      return <g key={`dot-${cx}-${cy}`} />; // Return empty group for other points
                    }}
                    activeDot={(props: any) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill={chartConfig.deals.color}
                          stroke="white"
                          strokeWidth={2}
                          filter="url(#dotShadow)"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleChartClick(payload)}
                        />
                      );
                    }}
                  />
                </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>

    {/* Drill-Down Modal */}
    <DrillDownModal
      open={!!drillDownData}
      onOpenChange={(open) => !open && setDrillDownData(null)}
      data={drillDownData}
    />
    </>
  );
}