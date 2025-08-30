import React, {useState, useRef} from 'react'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover'
import {Command, CommandEmpty, CommandInput, CommandGroup, CommandItem, CommandList} from '@/components/ui/command'
import {usePortalContainer} from '@/contexts/PortalContainerContext'
import {cn} from '@/lib/utils'
import {X, ChevronsUpDown, Check, TagIcon} from 'lucide-react'
import {useOptimisticLeadUpdate} from "@/hooks/useLead";
import {useQueryClient} from "@tanstack/react-query";
import {Lead} from "@/types/lead";

interface LeadTag {
    label: string
    value: string
    color?: string
    icon?: React.ReactElement
}

interface TagSelectorProps {
    lead: Lead | null | undefined
    selectedTags: LeadTag[]
    availableTags: LeadTag[]
    onTagAdd: (tag: LeadTag) => void
    onTagRemove: (tagValue: string) => void
    showTagsInputs?: boolean
    onShowTagsInputsChange?: (show: boolean) => void
}

const defaultTags: LeadTag[] = [
    {
        label: 'Potential',
        value: 'potential',
        color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200',
        icon: <TagIcon className="text-yellow-600 dark:text-yellow-400"/>
    },
    {
        label: 'Non Potential',
        value: 'non-potential',
        color: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200',
        icon: <TagIcon className="text-red-600 dark:text-red-400"/>
    },
    {
        label: 'Meeting Done',
        value: 'meeting-done',
        color: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200',
        icon: <TagIcon className="text-green-600 dark:text-green-400"/>
    },
    {
        label: 'Not Interested',
        value: 'not-interested',
        color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
        icon: <TagIcon className="text-gray-600 dark:text-gray-400"/>
    },
    {
        label: 'Not responsive',
        value: 'not-responsive',
        color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
        icon: <TagIcon className="text-gray-600 dark:text-gray-400"/>
    },
    {
        label: 'Following Up',
        value: 'following-up',
        color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200',
        icon: <TagIcon className="text-blue-600 dark:text-blue-400"/>
    },
]

export function TagSelector({
                                lead,
                                selectedTags,
                                availableTags = defaultTags,
                                onTagAdd,
                                onTagRemove,
                                showTagsInputs = false,
                                onShowTagsInputsChange
                            }: TagSelectorProps) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const portalContainer = usePortalContainer()
    const {mutate: updateLead} = useOptimisticLeadUpdate();
    const queryClient = useQueryClient();

    const handleAddTag = () => {
        onShowTagsInputsChange?.(true)
        // Small delay to ensure the popover renders before opening
        setTimeout(() => setOpen(true), 100)
    }

    const handleSelectTag = (tagValue: string) => {
        const tag = availableTags.find((t) => t.value === tagValue)
        if (tag && !selectedTags.find((t) => t.value === tagValue)) {
            onTagAdd(tag);
        }

        setOpen(false)
    }

    const availableTagsFiltered = availableTags.filter(
        (tag) => !selectedTags.find((selected) => selected.value === tag.value)
    )

    return (
        <div className="flex items-center gap-3" ref={containerRef}>
            <span className="text-sm text-gray-300 w-20 flex-shrink-0">Tags</span>
            <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                    <Badge
                        key={tag.value}
                        variant="secondary"
                        className={cn(
                            "border-0 pr-1",
                            tag.color || "h-6 border-transparent dark:bg-gray-800 dark:text-white text-black hover:text-foreground hover:border-border/80 justify-between "
                        )}
                    >
                        <div className={cn(
                            "w-3 h-3 rounded-full mr-2",
                            tag.color?.includes('yellow') && "bg-yellow-500",
                            tag.color?.includes('red') && "bg-red-500",
                            tag.color?.includes('green') && "bg-green-500",
                            tag.color?.includes('gray') && "bg-gray-500",
                            tag.color?.includes('blue') && "bg-blue-500",
                            !tag.color && "bg-muted"
                        )}/>
                        {tag.label}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0 ml-1 hover:bg-black/20 dark:hover:bg-white/20"
                            onClick={() => onTagRemove(tag.value)}
                        >
                            <X className="h-3 w-3"/>
                        </Button>
                    </Badge>
                ))}
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="h-6 border-transparent dark:bg-gray-800 dark:text-white text-black hover:text-foreground hover:border-border/80 justify-between "
                        >
                            Add tag
                            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50"/>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        align="start"
                        container={portalContainer}
                        className="w-[200px] p-0"
                    >
                        <Command>
                            <CommandInput
                                placeholder="Search tags..."
                                className="h-9"
                            />
                            <CommandList>
                                <CommandEmpty className="p-3 text-center text-sm">No tag found.</CommandEmpty>
                                <CommandGroup>
                                    {availableTagsFiltered.map((tag) => (
                                        <CommandItem
                                            key={tag.value}
                                            value={tag.value}
                                            onSelect={handleSelectTag}
                                        >
                                            <div className={cn(
                                                "w-3 h-3 rounded-full mr-2",
                                                tag.color?.includes('yellow') && "bg-yellow-500",
                                                tag.color?.includes('red') && "bg-red-500",
                                                tag.color?.includes('green') && "bg-green-500",
                                                tag.color?.includes('gray') && "bg-gray-500",
                                                tag.color?.includes('blue') && "bg-blue-500",
                                                !tag.color && "bg-muted"
                                            )}/>
                                            {tag.label}
                                            <Check className={cn(
                                                "ml-auto",
                                                selectedTags.find(t => t.value === tag.value) ? "opacity-100" : "opacity-0"
                                            )}/>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    )
}

export type {LeadTag}
export {defaultTags}
