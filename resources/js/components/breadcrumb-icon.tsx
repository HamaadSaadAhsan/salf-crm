import React from 'react';
import { cn } from '@/lib/utils';

type BreadcrumbIconProps = {
    icon: React.ComponentType<{ className?: string }>;
    className?: string;
};

export function BreadcrumbItemIcon({ icon: Icon, className }: BreadcrumbIconProps) {
    return (
        <div
            className={cn(
                'inline-flex size-3.5 shrink-0 items-center justify-center rounded-[30%] border border-white/5',
                className,
            )}
        >
            <Icon className="size-3.5 text-white" />
        </div>
    );
}