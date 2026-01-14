import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ResponsiveSelect, useResponsiveSelectStyles } from '@/components/responsive-select';
import { useOptimisticLeadUpdate } from '@/hooks/useLead';
import { cn } from '@/lib/utils';
import { Lead } from '@/types/lead';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown, TagIcon, X } from 'lucide-react';
import React, { useRef, useState } from 'react';

interface LeadTag {
    label: string;
    value: string;
    color?: string;
    icon?: React.ReactElement;
}

interface TagSelectorProps {
    lead: Lead | null | undefined;
    selectedTags: LeadTag[];
    availableTags: LeadTag[];
    onTagAdd: (tag: LeadTag) => void;
    onTagRemove: (tagValue: string) => void;
    showTagsInputs?: boolean;
    onShowTagsInputsChange?: (show: boolean) => void;
}

const defaultTags: LeadTag[] = [
    {
        label: 'Potential',
        value: 'potential',
        color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200',
        icon: <TagIcon className="text-yellow-600 dark:text-yellow-400" />,
    },
    {
        label: 'Non Potential',
        value: 'non-potential',
        color: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200',
        icon: <TagIcon className="text-red-600 dark:text-red-400" />,
    },
    {
        label: 'Meeting Done',
        value: 'meeting-done',
        color: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200',
        icon: <TagIcon className="text-green-600 dark:text-green-400" />,
    },
    {
        label: 'Not Interested',
        value: 'not-interested',
        color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
        icon: <TagIcon className="text-gray-600 dark:text-gray-400" />,
    },
    {
        label: 'Not responsive',
        value: 'not-responsive',
        color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
        icon: <TagIcon className="text-gray-600 dark:text-gray-400" />,
    },
    {
        label: 'Following Up',
        value: 'following-up',
        color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200',
        icon: <TagIcon className="text-blue-600 dark:text-blue-400" />,
    },
];

export function TagSelector({
    lead,
    selectedTags,
    availableTags = defaultTags,
    onTagAdd,
    onTagRemove,
    showTagsInputs = false,
    onShowTagsInputsChange,
}: TagSelectorProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { isMobile, itemClassName, listClassName, inputClassName, inputWrapperClassName } = useResponsiveSelectStyles();
    const { mutate: updateLead } = useOptimisticLeadUpdate();
    const queryClient = useQueryClient();

    const handleAddTag = () => {
        onShowTagsInputsChange?.(true);
        // Small delay to ensure the popover renders before opening
        setTimeout(() => setOpen(true), 100);
    };

    const handleSelectTag = (tagValue: string) => {
        const tag = availableTags.find((t) => t.value === tagValue);
        if (tag && !selectedTags.find((t) => t.value === tagValue)) {
            onTagAdd(tag);
        }

        setOpen(false);
    };

    const availableTagsFiltered = availableTags.filter((tag) => !selectedTags.find((selected) => selected.value === tag.value));

    return (
        <div className="flex items-center gap-3" ref={containerRef}>
            <span className="w-20 flex-shrink-0 text-sm text-gray-300">Tags</span>
            <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                    <Badge
                        key={tag.value}
                        variant="secondary"
                        className={cn(
                            'border-0 pr-1',
                            tag.color ||
                                'h-6 justify-between border-transparent text-black hover:border-border/80 hover:text-foreground dark:bg-gray-800 dark:text-white',
                        )}
                    >
                        <div
                            className={cn(
                                'mr-2 h-3 w-3 rounded-full',
                                tag.color?.includes('yellow') && 'bg-yellow-500',
                                tag.color?.includes('red') && 'bg-red-500',
                                tag.color?.includes('green') && 'bg-green-500',
                                tag.color?.includes('gray') && 'bg-gray-500',
                                tag.color?.includes('blue') && 'bg-blue-500',
                                !tag.color && 'bg-muted',
                            )}
                        />
                        {tag.label}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="ml-1 h-4 w-4 p-0 hover:bg-black/20 dark:hover:bg-white/20"
                            onClick={() => onTagRemove(tag.value)}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </Badge>
                ))}
                <ResponsiveSelect
                    open={open}
                    onOpenChange={setOpen}
                    trigger={
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className={cn(
                                'h-6 justify-between border-transparent text-black hover:border-border/80 hover:text-foreground dark:bg-gray-800 dark:text-white',
                                isMobile && 'h-9 px-3',
                            )}
                        >
                            Add tag
                            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                    }
                    title="Add Tags"
                    contentClassName={isMobile ? 'w-full' : 'w-[min(200px,calc(100vw-2rem))]'}
                >
                    <Command shouldFilter={true} className={inputWrapperClassName}>
                        <CommandInput placeholder="Search tags..." className={inputClassName} />
                        <CommandList className={cn(listClassName, 'touch-pan-y overscroll-contain')}>
                            <CommandEmpty className="p-3 text-center text-sm">No tag found.</CommandEmpty>
                            <CommandGroup>
                                {availableTagsFiltered.map((tag) => (
                                    <CommandItem
                                        key={tag.value}
                                        value={tag.label}
                                        onSelect={() => handleSelectTag(tag.value)}
                                        className={cn(itemClassName, 'gap-2')}
                                    >
                                        <div
                                            className={cn(
                                                'h-3 w-3 rounded-full',
                                                isMobile && 'h-4 w-4',
                                                tag.color?.includes('yellow') && 'bg-yellow-500',
                                                tag.color?.includes('red') && 'bg-red-500',
                                                tag.color?.includes('green') && 'bg-green-500',
                                                tag.color?.includes('gray') && 'bg-gray-500',
                                                tag.color?.includes('blue') && 'bg-blue-500',
                                                !tag.color && 'bg-muted',
                                            )}
                                        />
                                        {tag.label}
                                        <Check
                                            className={cn(
                                                'ml-auto h-4 w-4',
                                                selectedTags.find((t) => t.value === tag.value) ? 'opacity-100' : 'opacity-0',
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </ResponsiveSelect>
            </div>
        </div>
    );
}

export { defaultTags };
export type { LeadTag };
