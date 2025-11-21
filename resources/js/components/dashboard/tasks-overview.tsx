import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface TasksOverviewProps {
  data?: {
    completed: number;
    followUps: number;
    inProgress: number;
    pending: number;
    total: number;
    completionRate: number;
  };
  isLoading?: boolean;
}

export function TasksOverview({ data, isLoading = false }: TasksOverviewProps) {
  const [progress, setProgress] = useState(0);

  const completionRate = data?.completionRate || 0;
  const completed = data?.completed || 0;
  const followUps = data?.followUps || 0;
  const inProgress = data?.inProgress || 0;
  const pending = data?.pending || 0;

  useEffect(() => {
    const timer = setTimeout(() => setProgress(completionRate), 800);
    return () => clearTimeout(timer);
  }, [completionRate]);

  if (isLoading) {
    return (
      <Card className="">
        <CardHeader className="min-h-auto py-6 border-0">
          <CardTitle className="text-xl font-semibold">Tasks Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Skeleton className="h-8 w-full" />
          <div className="grid grid-cols-3 gap-2.5">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="">
      <CardHeader className="min-h-auto py-6 border-0">
        <CardTitle className="text-xl font-semibold">Tasks Overview</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Progress bar and done tasks */}
        <div className="grow mb-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-foreground">
              Tasks Completed
            </span>
            <span className="text-sm font-semibold text-success">
              {completed}
            </span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Task summary */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="flex flex-col items-center justify-center bg-muted/60 rounded-lg py-3.5 px-2 gap-1">
            <span className="text-lg font-bold text-green-500">
              {followUps}
            </span>
            <span className="text-xs text-accent-foreground">Follow-ups</span>
          </div>
          <div className="flex flex-col items-center justify-center bg-muted/60 rounded-lg py-3.5 px-2 gap-1">
            <span className="text-lg font-bold text-yellow-500">
              {inProgress}
            </span>
            <span className="text-xs text-accent-foreground">
              In Progress
            </span>
          </div>
          <div className="flex flex-col items-center justify-center bg-muted/60 rounded-lg py-3.5 px-2 gap-1">
            <span className="text-lg font-bold text-violet-500">
              {pending}
            </span>
            <span className="text-xs text-accent-foreground">Pending</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
