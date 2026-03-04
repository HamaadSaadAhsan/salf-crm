import * as React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: React.ReactNode;
    variant?: 'default' | 'ghost';
}

function CreateButton({ className, children, icon, variant = 'default', ...props }: CreateButtonProps) {
    const iconOnly = !children;
    const isGhost = variant === 'ghost';

    return (
        <button
            type="button"
            className={cn(
                'relative inline-flex shrink-0 grow-0 items-center justify-center cursor-pointer border-0 outline-none no-underline',
                'transition-[background-color,color,box-shadow] duration-200',
                isGhost
                    ? [
                          'rounded-md p-1 gap-1 bg-transparent shadow-none',
                          'hover:bg-black/5 active:bg-black/5',
                          'dark:hover:bg-white/5 dark:active:bg-white/5',
                      ]
                    : [
                          iconOnly ? 'rounded-lg p-1.5 gap-0' : 'rounded-lg py-1 pr-2 pl-1.5 gap-1.5',
                          'bg-white text-foreground',
                          '[box-shadow:inset_0_0_0_1px_rgb(212,212,216),0_0_2px_0_rgba(0,0,0,0.04),0_1px_3px_0_rgba(0,0,0,0.06)]',
                          'hover:bg-zinc-50',
                          'active:bg-zinc-50',
                          'dark:bg-[#1A1D21] dark:text-[#EEEFF1]',
                          'dark:[box-shadow:inset_0_0_0_1px_#2F3033,0_0_2px_0_rgb(0,0,0),0_1px_3px_0_rgba(0,0,0,0.08)]',
                          'dark:hover:bg-[#27282B]',
                          'dark:active:bg-[#27282B]',
                      ],
                className,
            )}
            {...props}
        >
            <span
                className={cn(
                    'inline-flex items-center justify-center [&_svg]:shrink-0',
                    isGhost ? '[&_svg:not([class*=size-])]:size-3' : '[&_svg:not([class*=size-])]:size-3.5',
                )}
            >
                {icon ?? <Plus />}
            </span>
            {children && (
                <span className="text-sm leading-5 font-medium tracking-[-0.01em] overflow-hidden text-ellipsis whitespace-nowrap">
                    {children}
                </span>
            )}
        </button>
    );
}

export { CreateButton };
