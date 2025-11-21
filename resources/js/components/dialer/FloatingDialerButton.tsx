import React from 'react';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FloatingDialerButtonProps {
  onClick: () => void;
  missedCallsCount?: number;
  className?: string;
}

export function FloatingDialerButton({
  onClick,
  missedCallsCount = 0,
  className,
}: FloatingDialerButtonProps) {
  return (
    <div
      className={cn(
        'fixed bottom-5 right-5 z-40',
        'transition-all duration-300 ease-in-out',
        className
      )}
    >
      <div className="relative">
        <Button
          onClick={onClick}
          size="icon"
          className={cn(
            'h-14 w-14 rounded-full shadow-lg',
            'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700',
            'transition-all duration-200',
            'hover:scale-110 active:scale-95',
            'focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2'
          )}
          aria-label="Open phone dialer"
        >
          <Phone className="h-6 w-6 text-white" />
        </Button>

        {/* Missed calls badge */}
        {missedCallsCount > 0 && (
          <Badge
            variant="destructive"
            className={cn(
              'absolute -top-1 -right-1',
              'h-5 min-w-5 px-1',
              'flex items-center justify-center',
              'text-xs font-semibold',
              'animate-in zoom-in-50 duration-200'
            )}
          >
            {missedCallsCount > 99 ? '99+' : missedCallsCount}
          </Badge>
        )}

        {/* Pulse animation ring for missed calls */}
        {missedCallsCount > 0 && (
          <span
            className={cn(
              'absolute inset-0 rounded-full',
              'bg-green-500 dark:bg-green-600',
              'animate-ping opacity-75'
            )}
          />
        )}
      </div>
    </div>
  );
}
