import React, { useState } from 'react';
import { TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface ComparisonData {
  label: string;
  current: {
    value: number;
    period: string;
  };
  previous: {
    value: number;
    period: string;
  };
  change: number;
  changePercent: number;
  unit?: string;
}

export interface ComparisonModeProps {
  data: ComparisonData[];
  title?: string;
  className?: string;
}

export function ComparisonMode({ data, title = 'Period Comparison', className }: ComparisonModeProps) {
  const [showDetails, setShowDetails] = useState(false);

  const formatValue = (value: number, unit?: string) => {
    const formatted = value.toLocaleString();
    return unit ? `${formatted} ${unit}` : formatted;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-emerald-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getTrendBadgeVariant = (change: number): 'default' | 'secondary' | 'destructive' => {
    if (change > 10) return 'default';
    if (change < -10) return 'destructive';
    return 'secondary';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {data.map((item, index) => (
          <div key={index}>
            <div className="space-y-3">
              {/* Metric Header */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {item.label}
                </span>
                <Badge variant={getTrendBadgeVariant(item.changePercent)}>
                  {item.changePercent > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : item.changePercent < 0 ? (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  ) : null}
                  {item.changePercent > 0 ? '+' : ''}
                  {item.changePercent.toFixed(1)}%
                </Badge>
              </div>

              {/* Values Comparison */}
              <div className="grid grid-cols-2 gap-4">
                {/* Current Period */}
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{item.current.period}</div>
                  <div className="text-2xl font-bold">
                    {formatValue(item.current.value, item.unit)}
                  </div>
                </div>

                {/* Previous Period */}
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{item.previous.period}</div>
                  <div className="text-2xl font-bold text-muted-foreground">
                    {formatValue(item.previous.value, item.unit)}
                  </div>
                </div>
              </div>

              {/* Change Details */}
              {showDetails && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Absolute Change:</span>
                    <span className={cn('font-semibold', getTrendColor(item.change))}>
                      {item.change > 0 ? '+' : ''}{formatValue(item.change, item.unit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Growth Rate:</span>
                    <span className={cn('font-semibold', getTrendColor(item.changePercent))}>
                      {item.changePercent > 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="pt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            item.changePercent >= 0 ? 'bg-emerald-600' : 'bg-red-600'
                          )}
                          style={{
                            width: `${Math.min(Math.abs(item.changePercent), 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium w-12 text-right">
                        {Math.abs(item.changePercent).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {index < data.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}

        {/* Summary */}
        {showDetails && data.length > 1 && (
          <>
            <Separator />
            <div className="pt-2">
              <div className="text-sm font-medium mb-2">Summary</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between p-2 rounded bg-muted/50">
                  <span>Improved Metrics:</span>
                  <span className="font-semibold text-emerald-600">
                    {data.filter(d => d.changePercent > 0).length}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted/50">
                  <span>Declined Metrics:</span>
                  <span className="font-semibold text-red-600">
                    {data.filter(d => d.changePercent < 0).length}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
