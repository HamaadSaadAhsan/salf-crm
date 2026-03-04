import * as React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Slot as SlotPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

function Breadcrumb({
  ...props
}: React.ComponentProps<'nav'> & {
  separator?: React.ReactNode;
}) {
  return <nav data-slot="breadcrumb" aria-label="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        'flex flex-wrap items-center gap-1 break-words text-sm font-medium tracking-[-0.01em] text-[rgb(162,164,167)]',
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn('inline-flex items-center gap-1', className)}
      {...props}
    />
  );
}

function BreadcrumbLink({
  asChild,
  className,
  ...props
}: React.ComponentProps<'a'> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? SlotPrimitive.Slot : 'a';

  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn('inline-flex items-center gap-1 rounded px-1 py-0.5 transition-[color,background-color] duration-[140ms] hover:text-foreground hover:bg-white/[0.06]', className)}
      {...props}
    />
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('inline-flex items-center gap-1 rounded px-1 py-0.5 text-[rgb(238,239,241)] max-w-[400px] truncate', className)}
      {...props}
    />
  );
}

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<'li'>) => (
  <li
    data-slot="breadcrumb-separator"
    role="presentation"
    aria-hidden="true"
    className={cn('text-[rgb(162,164,167)]', className)}
    {...props}
  >
    {children ?? '/'}
  </li>
);

const BreadcrumbEllipsis = ({
  className,
  ...props
}: React.ComponentProps<'span'>) => (
  <span
    data-slot="breadcrumb-ellipsis"
    role="presentation"
    aria-hidden="true"
    className={cn('flex h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
);

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
