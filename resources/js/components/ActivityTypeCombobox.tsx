import { Check, HandshakeIcon, MailIcon, MessageCircleIcon, MessageSquare, PhoneCallIcon, PlusIcon, X } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePortalContainer } from '@/contexts/PortalContainerContext';
import { cn } from '@/lib/utils';
import { Lead } from '@/types/lead';

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
    lead,
    commentBoxRef,
    selectedType,
    onTypeChange,
}: {
    lead: Lead | null | undefined;
    commentBoxRef: React.RefObject<HTMLDivElement | null>;
    selectedType?: string;
    onTypeChange?: (type: string) => void;
}) {
    const [open, setOpen] = React.useState(false);
    const [value, setValue] = React.useState(selectedType || '');
    const [openTooltip, setOpenTooltip] = React.useState(false);
    const containerRef = usePortalContainer();

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

    return (
        <TooltipProvider delayDuration={0}>
            <Popover open={open} onOpenChange={setOpen}>
                <Tooltip open={value || open ? false : openTooltip} onOpenChange={setOpenTooltip}>
                    <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                            <Button
                                role="combobox"
                                aria-expanded={open}
                                variant="ghost"
                                className={cn(
                                    !value
                                        ? 'group relative h-8 w-8 cursor-pointer overflow-hidden rounded-full px-2 text-gray-400 transition-all duration-300 ease-in-out hover:w-14 hover:bg-blue-900 hover:px-2 hover:text-white dark:hover:bg-blue-900'
                                        : 'cursor-pointer rounded-full bg-blue-900 px-2 transition-all hover:px-2 dark:bg-blue-900',
                                )}
                            >
                                {!value ? (
                                    <div className="flex w-full items-center justify-start">
                                        <MessageSquare className="h-4 w-4 flex-shrink-0" />
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
                                                    handleClearValue(e as any);
                                                }
                                            }}
                                        >
                                            <X className="h-3 w-3" />
                                        </span>
                                    </div>
                                )}
                            </Button>
                        </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Select activity type</p>
                    </TooltipContent>
                </Tooltip>
                <PopoverContent container={containerRef} align="start" className="w-[200px] p-0">
                    <Command>
                        <CommandInput placeholder="Search activity type..." className="h-9" />
                        <CommandList>
                            <CommandEmpty>No activity found.</CommandEmpty>
                            <CommandGroup>
                                {frameworks.map((framework) => (
                                    <CommandItem
                                        className="cursor-pointer"
                                        key={framework.value}
                                        value={framework.value}
                                        onSelect={handleTypeSelect}
                                    >
                                        {framework.icon}
                                        {framework.label}
                                        <Check className={cn('ml-auto', value === framework.value ? 'opacity-100' : 'opacity-0')} />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </TooltipProvider>
    );
}
