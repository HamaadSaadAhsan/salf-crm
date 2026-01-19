import { Check, HandshakeIcon, MailIcon, MessageCircleIcon, MessageSquare, PhoneCallIcon, PlusIcon, X } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ResponsiveSelect, useResponsiveSelectStyles } from '@/components/responsive-select';
import { cn } from '@/lib/utils';

const frameworks = [
    {
        value: 'call',
        label: 'Call',
        icon: <PhoneCallIcon className="h-3 w-3" />,
    },
    {
        value: 'message',
        label: 'Message',
        icon: <MessageCircleIcon className="h-3 w-3" />,
    },
    {
        value: 'email',
        label: 'Email',
        icon: <MailIcon className="h-3 w-3" />,
    },
    {
        value: 'meeting',
        label: 'Meeting',
        icon: <HandshakeIcon className="h-3 w-3" />,
    },
];

export default function ActivityTypeCombobox({
    commentBoxRef,
    selectedType,
    onTypeChange,
}: {
    commentBoxRef: React.RefObject<HTMLDivElement | null>;
    selectedType?: string;
    onTypeChange?: (type: string) => void;
}) {
    const [open, setOpen] = React.useState(false);
    const [value, setValue] = React.useState(selectedType || '');
    const [openTooltip, setOpenTooltip] = React.useState(false);
    const { isMobile, itemClassName, listClassName, inputClassName, inputWrapperClassName } = useResponsiveSelectStyles();

    // Sync with external selectedType prop
    React.useEffect(() => {
        setValue(selectedType || '');
    }, [selectedType]);

    const handleClearValue = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent popover from opening
        setValue('');
        onTypeChange?.('');
    };

    const handleTypeSelect = (currentValue: string) => {
        const newValue = currentValue === value ? '' : currentValue;
        setValue(newValue);
        onTypeChange?.(newValue);

        if (commentBoxRef && commentBoxRef.current) {
            commentBoxRef?.current?.focus();
        }
        setOpen(false);
    };

    const triggerButton = (
        <Button
            role="combobox"
            aria-expanded={open}
            variant="ghost"
            className={cn(
                !value
                    ? 'group relative h-8 w-8 cursor-pointer overflow-hidden rounded-full px-2 text-gray-400 transition-all duration-300 ease-in-out hover:w-14 hover:bg-blue-900 hover:px-2 hover:text-white dark:hover:bg-blue-900'
                    : 'cursor-pointer rounded-full bg-blue-900 px-2 transition-all hover:px-2 dark:bg-blue-900',
                isMobile && 'h-10 w-10',
            )}
        >
            {!value ? (
                <div className="flex w-full items-center justify-start">
                    <MessageSquare className={cn('h-4 w-4 flex-shrink-0', isMobile && 'h-5 w-5')} />
                    <PlusIcon className="ml-1 h-3 w-3 translate-x-2 transform opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-hover:transition-all group-hover:duration-300 group-hover:ease-in-out" />
                </div>
            ) : (
                <div className="flex w-full items-center justify-start gap-2">
                    {frameworks.find((framework) => framework.value === value)?.icon}
                    {frameworks.find((framework) => framework.value === value)?.label}
                    <span
                        role="button"
                        tabIndex={0}
                        className="flex h-4 w-4 cursor-pointer items-center justify-center rounded hover:bg-black/20 dark:hover:bg-white/20"
                        onClick={handleClearValue}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleClearValue(e as unknown as React.MouseEvent);
                            }
                        }}
                    >
                        <X className="h-3 w-3" />
                    </span>
                </div>
            )}
        </Button>
    );

    return (
        <TooltipProvider delayDuration={0}>
            <ResponsiveSelect
                open={open}
                onOpenChange={setOpen}
                trigger={
                    <Tooltip open={value || open ? false : openTooltip} onOpenChange={setOpenTooltip}>
                        <TooltipTrigger asChild>
                            {triggerButton}
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Select activity type</p>
                        </TooltipContent>
                    </Tooltip>
                }
                title="Select Activity Type"
                contentClassName={isMobile ? 'w-full' : 'w-[min(200px,calc(100vw-2rem))]'}
            >
                <Command shouldFilter={true} className={inputWrapperClassName}>
                    <CommandInput placeholder="Search activity type..." className={inputClassName} />
                    <CommandList className={cn(listClassName, 'touch-pan-y overscroll-contain')}>
                        <CommandEmpty>No activity found.</CommandEmpty>
                        <CommandGroup>
                            {frameworks.map((framework) => (
                                <CommandItem
                                    className={cn(itemClassName, 'gap-2')}
                                    key={framework.value}
                                    value={framework.label}
                                    onSelect={() => handleTypeSelect(framework.value)}
                                >
                                    <span className={cn(isMobile && '[&_svg]:h-5 [&_svg]:w-5')}>
                                        {framework.icon}
                                    </span>
                                    {framework.label}
                                    <Check className={cn('ml-auto h-4 w-4', value === framework.value ? 'opacity-100' : 'opacity-0')} />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </ResponsiveSelect>
        </TooltipProvider>
    );
}
