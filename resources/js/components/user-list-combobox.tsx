import { User } from '@/types/user'
import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useInfiniteUsers, useOptimizedUserFilters } from '@/hooks/useUsers'
import { usePortalContainer } from '@/contexts/PortalContainerContext'
import { Lead } from '@/types/lead'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from '@/components/ui/button'
import { Check, X, Loader2 } from 'lucide-react'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils'
import {useOptimisticLeadUpdate} from "@/hooks/useLead";
import {useQueryClient} from "@tanstack/react-query";

const UserListCombobox = ({
    lead,
}: {
    lead: Lead | undefined | null,
}) => {
    const { mutate: updateLead } = useOptimisticLeadUpdate();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const { filters, updateSearch } = useOptimizedUserFilters({
        page: 1,
        per_page: 10,
        search: search,
    });

    // Use infinite scrolling hook instead of standard users hook
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = useInfiniteUsers(filters);

    const users = data?.data || [];
    const queryClient = useQueryClient();
    const portalContainer = usePortalContainer();

    // Handle scroll to load more users
    const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
        const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

        // Load more when user scrolls to 80% of the content
        if (scrollPercentage > 0.8 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    // Update search with debouncing effect through the filter system
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            updateSearch(search);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [search, updateSearch]);

    const handleServiceSelect = (user: User) => {
        // Optimistically update the lead cache
        queryClient.setQueryData(['lead', lead?.id], (oldLead: Lead) => ({
            ...oldLead,
            assigned_to: user
        }));

        updateLead({id: lead?.id || "", updates: {assigned_to: user as User}});
        setOpen(false);
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
    };

    if(!lead){
        return;
    }

    return (
        <div className="flex items-center gap-3 min-w-0 flex-1 ">
            <span className="text-sm text-gray-300 w-20 flex-shrink-0">Assignee</span>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <div className="flex items-center gap-2 hover:bg-gray-800 rounded-md p-1 transition-colors cursor-pointer">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src="/placeholder.svg?height=24&width=24" />
                            <AvatarFallback className="bg-blue-600 text-white text-xs">{lead.assigned_to?.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-white">{lead.assigned_to?.name}</span>

                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400">
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                </PopoverTrigger>
                <PopoverContent
                    container={portalContainer}
                    className="w-[250px] h-auto p-0"
                    align="start"
                    onWheel={(e) => e.stopPropagation()}
                >
                    <Command className="">
                        <CommandInput
                            placeholder="Search users..."
                            className="h-9"
                            value={search}
                            onValueChange={handleSearchChange}
                        />
                        <CommandList className=" overflow-hidden">
                            <ScrollArea
                                ref={scrollAreaRef}
                                className="h-[220px]"
                                onScrollCapture={handleScroll}
                            >
                                <CommandEmpty>
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            <span>Loading users...</span>
                                        </div>
                                    ) : (
                                        "No users found."
                                    )}
                                </CommandEmpty>
                                <CommandGroup className="">
                                    {users.map((user: User) => (
                                        <CommandItem
                                            key={user.id}
                                            value={user.name}
                                            onSelect={() => handleServiceSelect(user)}
                                            className="flex items-center gap-2 cursor-pointer"
                                        >
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src="/placeholder.svg?height=24&width=24" />
                                                <AvatarFallback className="bg-blue-600 text-white text-xs">
                                                    {user.name[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="flex-1">{user.name}</span>
                                            <Check
                                                className={cn(
                                                    "ml-auto h-4 w-4 flex-shrink-0",
                                                    lead.assigned_to?.id === user.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                        </CommandItem>
                                    ))}
                                    {isFetchingNextPage && (
                                        <div className="flex items-center justify-center py-3">
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            <span className="text-sm ">Loading more users...</span>
                                        </div>
                                    )}
                                </CommandGroup>
                            </ScrollArea>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}

export default UserListCombobox
