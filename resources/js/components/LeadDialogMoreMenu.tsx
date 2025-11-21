import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePortalContainer } from '@/contexts/PortalContainerContext';
import { LoaderIcon, MilestoneIcon, MoreHorizontal, Settings2Icon, TagIcon, TicketIcon } from 'lucide-react';

export function LeadDialogMoreMenu({ handleTagsInputsShow }: { handleTagsInputsShow: (value: boolean) => void }) {
    const portalContainer = usePortalContainer();

    const showTags = () => {
        handleTagsInputsShow(true);
    };
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:bg-gray-800 hover:text-white">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent container={portalContainer} className="w-56" align="end">
                <DropdownMenuGroup>
                    <DropdownMenuItem asChild className="">
                        <Button onClick={showTags} variant="ghost" className="w-full outline-0 hover:bg-gray-800 focus-visible:ring-0">
                            <div className="flex items-center-safe gap-2 text-sm">
                                <TagIcon className="text-white" />
                                Add Tags
                            </div>
                            <DropdownMenuShortcut>{/Macintosh|Mac/i.test(navigator.userAgent) ? '⌘T' : 'Ctrl+T'}</DropdownMenuShortcut>
                        </Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <div className="flex items-center-safe gap-2 text-sm">
                            <LoaderIcon className="text-white" />
                            Create follow-up task
                        </div>
                        <DropdownMenuShortcut>{/Macintosh|Mac/i.test(navigator.userAgent) ? '⌘F' : 'Ctrl+F'}</DropdownMenuShortcut>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <div className="inline-flex items-center-safe gap-1 text-sm text-white">
                                <Settings2Icon className="h-4 w-4" />
                                <span>Convert to</span>
                            </div>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal container={portalContainer}>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem>
                                    <TicketIcon /> Ticket
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <MilestoneIcon /> Sale
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
