import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface DrillDownData {
  title: string;
  period: string;
  value: number;
  change?: number;
  changePercent?: number;
  details?: Array<{
    label: string;
    value: string | number;
    badge?: string;
    trend?: 'up' | 'down' | 'neutral';
  }>;
  breakdown?: Array<{
    category: string;
    value: number;
    percentage: number;
    color?: string;
  }>;
  relatedMetrics?: Array<{
    label: string;
    value: string | number;
    change?: number;
  }>;
}

export interface DrillDownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DrillDownData | null;
}

export function DrillDownModal({
  open,
  onOpenChange,
  data,
}: DrillDownModalProps) {
  if (!data) return null;

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-emerald-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'neutral':
        return <Minus className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getChangeColor = (change?: number) => {
    if (change === undefined) return '';
    if (change > 0) return 'text-emerald-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{data.title}</DialogTitle>
          <DialogDescription className="text-base">
            Detailed breakdown for {data.period}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          {/* Main Metric */}
          <div className="mb-6">
            <div className="flex items-baseline gap-4">
              <div className="text-4xl font-bold">{data.value.toLocaleString()}</div>
              {data.changePercent !== undefined && (
                <div className={cn('flex items-center gap-1', getChangeColor(data.changePercent))}>
                  {getTrendIcon(data.changePercent > 0 ? 'up' : data.changePercent < 0 ? 'down' : 'neutral')}
                  <span className="text-lg font-semibold">
                    {data.changePercent > 0 ? '+' : ''}{data.changePercent.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            {data.change !== undefined && (
              <div className="text-sm text-muted-foreground mt-1">
                Change: {data.change > 0 ? '+' : ''}{data.change} from previous period
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Details Section */}
          {data.details && data.details.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Details</h3>
              <div className="grid grid-cols-2 gap-4">
                {data.details.map((detail, index) => (
                  <div key={index} className="flex flex-col">
                    <div className="text-sm text-muted-foreground mb-1">{detail.label}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">{detail.value}</span>
                      {detail.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {detail.badge}
                        </Badge>
                      )}
                      {detail.trend && getTrendIcon(detail.trend)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Breakdown Section */}
          {data.breakdown && data.breakdown.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Breakdown</h3>
              <div className="space-y-3">
                {data.breakdown.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.category}</span>
                      <span className="text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.color || 'hsl(var(--primary))',
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold min-w-[60px] text-right">
                        {item.value.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Metrics Section */}
          {data.relatedMetrics && data.relatedMetrics.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Related Metrics</h3>
              <div className="grid grid-cols-1 gap-3">
                {data.relatedMetrics.map((metric, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm font-medium">{metric.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{metric.value}</span>
                      {metric.change !== undefined && (
                        <span className={cn('text-xs font-medium', getChangeColor(metric.change))}>
                          ({metric.change > 0 ? '+' : ''}{metric.change}%)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}