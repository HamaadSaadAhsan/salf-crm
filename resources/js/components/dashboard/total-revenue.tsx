import { MoreHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardToolbar,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

interface TotalRevenueProps {
  revenue?: number;
  delta?: number;
  avgDealValue?: number;
  activeDeals?: number;
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$ ${(value / 1_000_000).toFixed(2)}M`;
  }
  return `$ ${value.toLocaleString()}`;
}

export function TotalRevenue({
  revenue = 0,
  delta = 0,
  avgDealValue = 0,
  activeDeals = 0,
  isLoading = false,
}: TotalRevenueProps) {
  if (isLoading) {
    return (
      <Card className="">
        <CardHeader className="min-h-auto py-6 border-0">
          <CardTitle className="text-xl font-semibold">Pipeline Revenue</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-between gap-3.5">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-6 w-32" />
          <div className="space-y-1">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPositive = delta >= 0;

  return (
    <Card className="">
      <CardHeader className="min-h-auto py-6 border-0">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <CardTitle className="text-xl font-semibold">Pipeline Revenue</CardTitle>
        </div>
        <CardToolbar className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Export Data</DropdownMenuItem>
              <DropdownMenuItem>Pin to Dashboard</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Remove</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardToolbar>
      </CardHeader>
      <CardContent className="flex flex-col justify-between gap-3.5">
        <div className="space-y-3.5">
          {/* Revenue */}
          <div className="flex items-center gap-2.5 mb-2.5">
            <span className="text-3xl font-bold text-foreground tracking-tight">
              {formatCurrency(revenue)}
            </span>
            <span className="text-xs text-muted-foreground font-medium leading-none">
              USD
            </span>
          </div>

          {/* Revenue trend */}
          <div className="flex items-center gap-2 mb-4">
            <Badge
              variant={isPositive ? 'success' : 'destructive'}
              appearance="light"
            >
              {isPositive ? (
                <ArrowUp className="size-3.5" />
              ) : (
                <ArrowDown className="size-3.5" />
              )}
              {isPositive ? '+' : ''}
              {delta.toFixed(1)}%
            </Badge>
            <span className="text-sm text-muted-foreground">
              {isPositive ? 'increased' : 'decreased'} from last month
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="p-2.5 bg-muted/60 flex items-center justify-between rounded-lg">
            <span className="text-sm text-accent-foreground">
              Avg. Deal Value:
            </span>
            <span className="text-base font-semibold text-foreground">
              {formatCurrency(avgDealValue)}
            </span>
          </div>
          <div className="p-2.5 bg-muted/60 flex items-center justify-between rounded-lg">
            <span className="text-sm text-accent-foreground">
              Active Deals:
            </span>
            <span className="text-base font-semibold text-foreground">
              {activeDeals}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
