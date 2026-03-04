import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeCountVariants = cva(
  'relative inline-flex items-center justify-center px-1 gap-1 rounded font-[Inter,sans-serif] tabular-nums font-medium text-[10px] tracking-[-0.02em]',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-[inset_0_0_0_1px_var(--color-border)]',
        tertiary:
          'bg-zinc-100 text-zinc-500 shadow-[inset_0_0_0_1px_rgb(212,212,216)] dark:bg-zinc-800 dark:text-zinc-300 dark:shadow-[inset_0_0_0_1px_rgb(70,71,74)]',
        success:
          'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
        warning:
          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
        destructive:
          'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
        info:
          'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
        mono:
          'bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900',
        outline:
          'bg-transparent text-secondary-foreground shadow-[inset_0_0_0_1px_var(--color-border)]',
      },
    },
    defaultVariants: {
      variant: 'tertiary',
    },
  },
);

interface BadgeCountProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeCountVariants> {
  count: number;
  max?: number;
  size?: number;
}

function BadgeCount({
  className,
  variant,
  size,
  count,
  max = 99,
  style,
  ...props
}: BadgeCountProps) {
  const displayCount = count > max ? `${max}+` : count;

  const sizeStyle = size
    ? {
        height: size,
        minWidth: size,
        lineHeight: `${size}px`,
        fontSize: Math.round(size * 0.714),
      }
    : undefined;

  return (
    <span
      data-slot="badge-count"
      className={cn(
        badgeCountVariants({ variant }),
        !size && 'h-3.5 min-w-3.5 leading-3.5',
        className,
      )}
      style={{ ...sizeStyle, ...style }}
      {...props}
    >
      {displayCount}
    </span>
  );
}

export { BadgeCount, badgeCountVariants };
export type { BadgeCountProps };
