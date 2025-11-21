import React, { useState, useMemo } from 'react';
import { ChartNoAxesCombined, Info, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, XAxis } from 'recharts';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useLeadAnalytics } from '@/hooks/useDashboard';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { ExportButton } from '@/components/dashboard/export-button';
import { DrillDownModal, DrillDownData } from '@/components/dashboard/drill-down-modal';
import { useRealtimeMetrics } from '@/hooks/useRealtimeMetrics';

const chartConfig = {
  leads: {
    label: 'Leads',
    color: 'var(--color-violet-500)',
  },
} satisfies ChartConfig;

// Period configuration
const PERIODS = {
  '5D': { key: '5D', label: '5D' },
  '2W': { key: '2W', label: '2W' },
  '1M': { key: '1M', label: '1M' },
  '6M': { key: '6M', label: '6M' },
} as const;

type PeriodKey = keyof typeof PERIODS;

// Custom Tooltip
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="bg-zinc-900 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg">
        {value} leads
      </div>
    );
  }
  return null;
};

export function LeadAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('5D');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);

  // Fetch data from API
  const { data, isLoading, error } = useLeadAnalytics(selectedPeriod);

  // Real-time updates
  const { isConnected, lastUpdate } = useRealtimeMetrics({
    channel: 'dashboard',
    events: ['LeadCreated', 'MetricUpdated'],
    enabled: true,
  });

  // Get chart data
  const currentData = data?.chart_data || [];
  const totalLeads = data?.total_leads || 0;
  const growthPercentage = data?.growth_percentage || 0;

  // Prepare data for export
  const exportData = useMemo(() => {
    return currentData.map(item => ({
      Period: item.period,
      Leads: item.leads,
    }));
  }, [currentData]);

  // Handle chart element click for drill-down
  const handleChartClick = (payload: any) => {
    console.log('Chart clicked with payload:', payload);

    if (!payload || !payload.leads) {
      console.log('Invalid payload, missing leads data');
      return;
    }

    // Create drill-down data
    const drillDown: DrillDownData = {
      title: `${payload.period} Lead Analytics`,
      period: payload.period,
      value: payload.leads,
      changePercent: growthPercentage,
      details: [
        { label: 'Total Leads', value: payload.leads, trend: 'up' },
        { label: 'Growth Rate', value: `${growthPercentage}%`, trend: growthPercentage > 0 ? 'up' : 'down' },
        { label: 'Average Daily', value: Math.floor(totalLeads / 30), trend: 'neutral' },
        { label: 'Period Average', value: Math.floor(payload.leads / 7), badge: 'Daily' },
      ],
      breakdown: [
        { category: 'Qualified', value: Math.floor(payload.leads * 0.7), percentage: 70, color: '#10b981' },
        { category: 'Contacted', value: Math.floor(payload.leads * 0.2), percentage: 20, color: '#f59e0b' },
        { category: 'New', value: Math.floor(payload.leads * 0.1), percentage: 10, color: '#3b82f6' },
      ],
      relatedMetrics: [
        { label: 'Conversion Rate', value: '45%', change: 8 },
        { label: 'Response Time', value: '2.5h', change: -15 },
        { label: 'Quality Score', value: '8.2/10', change: 3 },
      ],
    };

    console.log('Opening drill-down modal with data:', drillDown);
    setDrillDownData(drillDown);
  };

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader className="min-h-auto py-6 border-0">
          <CardTitle className="text-xl font-semibold">Lead Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Failed to load lead analytics data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card id="lead-analytics-chart" className="h-full">
        <CardHeader className="min-h-auto py-6 border-0">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl font-semibold">Lead Analytics</CardTitle>
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
              elementId="lead-analytics-chart"
              filename={`lead-analytics-${selectedPeriod}-${format(new Date(), 'yyyy-MM-dd')}`}
              title="Lead Analytics Report"
              formats={['csv', 'png', 'pdf']}
              variant="outline"
              size="sm"
            />
          </CardToolbar>
        </CardHeader>
      <CardContent className="flex flex-col space-y-6 p-6">
        {isLoading ? (
          <>
            {/* Main Metric Skeleton */}
            <div className="space-y-6">
              <div className="space-y-1">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-5 w-48" />
              </div>

              {/* Toggle Group Skeleton */}
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Chart Skeleton */}
            <div className="grow h-32 w-full">
              <Skeleton className="h-full w-full" />
            </div>
          </>
        ) : (
          <>
            {/* Period Selector */}
            <div className="space-y-6">
              {/* Main Metric */}
              <div className="space-y-1">
                <div className="text-3xl font-semibold text-foreground">
                  {totalLeads}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="size-4 text-emerald-600" />
                  <span className="text-emerald-600 font-medium">+{growthPercentage}%</span>
                  <span className="text-gray-600">
                    compared to last {selectedPeriod === '5D' ? 'week' : 'period'}
                  </span>
                </div>
              </div>

              {/* Toggle Group */}
              <ToggleGroup
                type="single"
                value={selectedPeriod}
                onValueChange={(value) =>
                  value && setSelectedPeriod(value as PeriodKey)
                }
                variant="outline"
                className="w-full shadow-none!"
              >
                {Object.values(PERIODS).map((period) => (
                  <ToggleGroupItem
                    key={period.key}
                    value={period.key}
                    className="flex-1 shadow-none data-[state=on]:bg-muted/60"
                  >
                    {period.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {/* Chart */}
            <div className="grow h-32 w-full">
              <ChartContainer
                config={chartConfig}
                className="h-full w-full rounded-b-3xl overflow-hidden [&_.recharts-curve.recharts-tooltip-cursor]:stroke-initial"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={currentData}
                    margin={{
                      top: 10,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    }}
                  >
                    <defs>
                      <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={chartConfig.leads.color}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor={chartConfig.leads.color}
                          stopOpacity={0.1}
                        />
                      </linearGradient>

                      <filter
                        id="activeDotShadow"
                        x="-50%"
                        y="-50%"
                        width="200%"
                        height="200%"
                      >
                        <feDropShadow
                          dx="2"
                          dy="2"
                          stdDeviation="4"
                          floodColor={chartConfig.leads.color}
                          floodOpacity="0.6"
                        />
                      </filter>
                    </defs>

                    <XAxis dataKey="period" hide />

                    <ChartTooltip
                      content={<CustomTooltip />}
                      cursor={{
                        strokeWidth: 1,
                        strokeDasharray: '2 2',
                        stroke: chartConfig.leads.color,
                        strokeOpacity: 1,
                      }}
                    />

                    <Area
                      dataKey="leads"
                      type="natural"
                      fill="url(#leadsGradient)"
                      stroke={chartConfig.leads.color}
                      strokeWidth={2}
                      style={{ cursor: 'pointer' }}
                      dot={{
                        r: 4,
                        fill: chartConfig.leads.color,
                        stroke: 'white',
                        strokeWidth: 2,
                        filter: 'url(#activeDotShadow)',
                        cursor: 'pointer',
                      }}
                      activeDot={(props: any) => {
                        const { cx, cy, payload } = props;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={6}
                            fill={chartConfig.leads.color}
                            stroke="white"
                            strokeWidth={2}
                            filter="url(#activeDotShadow)"
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