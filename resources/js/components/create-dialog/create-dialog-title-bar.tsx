import { useCreateDialog } from '@/providers/CreateDialogProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { Link2, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from '@/lib/http';
import { destroy } from '@/actions/App/Http/Controllers/Api/LeadActivityController';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface CreateDialogTitleBarProps {
    isScrolled: boolean;
}

export function CreateDialogTitleBar({ isScrolled }: CreateDialogTitleBarProps) {
    const { data, activityId, isSaving, close, association } = useCreateDialog();
    const { auth } = usePage<SharedData>().props;
    const queryClient = useQueryClient();

    const getInitials = (name: string) =>
        name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

    const handleCopyLink = async () => {
        if (!activityId) return;
        const url = new URL(window.location.href);
        url.searchParams.set('modal', 'note');
        url.searchParams.set('id', activityId.toString());
        const urlString = url.toString();
        try {
            await navigator.clipboard.writeText(urlString);
        } catch {
            const el = document.createElement('textarea');
            el.value = urlString;
            el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
        toast.success('Link copied to clipboard');
    };

    const handleDelete = async () => {
        if (!activityId) return;
        try {
            await axios.delete(destroy.url(activityId));
            toast.success('Note deleted');
            if (association?.id) {
                await queryClient.invalidateQueries({ queryKey: ['lead-notes', association.id] });
                await queryClient.invalidateQueries({ queryKey: ['lead-activities', 'latest', association.id] });
            }
            close();
        } catch {
            toast.error('Failed to delete note');
        }
    };

    return (
        <div className="flex h-11 shrink-0 items-center justify-between gap-2 px-6">
            {/* Left: Title preview (visible when scrolled) */}
            <div className={cn('text-sm font-medium tracking-[-0.01em] text-foreground truncate transition-opacity duration-150', isScrolled ? 'opacity-100' : 'opacity-0')}>
                {data.subject || 'Untitled note'}
            </div>

            {/* Right: Author + actions */}
            <div className="flex items-center gap-2 shrink-0">
                {/* Saving indicator */}
                {isSaving && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="size-3 animate-spin" />
                        <span>Saving</span>
                    </div>
                )}

                {/* Author avatar */}
                <Avatar className="size-5">
                    {auth.user?.avatar && <AvatarImage src={auth.user.avatar} alt={auth.user.name} />}
                    <AvatarFallback className="text-[8px]">
                        {getInitials(auth.user.name)}
                    </AvatarFallback>
                </Avatar>

                {/* Copy link */}
                <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                    aria-label="Copy link"
                >
                    <Link2 className="size-3.5" />
                </button>

                {/* Options dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                            aria-label="Options"
                        >
                            <MoreHorizontal className="size-3.5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="z-[10000] min-w-[180px] gap-px p-1 rounded-xl bg-white dark:bg-[rgb(31,33,37)] shadow-[rgb(228,228,231)_0_0_0_1px_inset,rgba(0,0,0,0.04)_0_0_0_1px,rgba(0,0,0,0.06)_0_4px_8px_-4px] dark:shadow-[rgb(47,48,51)_0_0_0_1px_inset,rgba(0,0,0,0.16)_0_0_0_1px,rgba(0,0,0,0.48)_0_4px_8px_-4px,rgba(0,0,0,0.64)_0_4px_12px_-2px] border-0"
                    >
                        <DropdownMenuItem
                            onClick={handleCopyLink}
                            className="rounded-lg gap-1.5 px-2 py-1.5 text-sm font-normal tracking-[-0.02em] leading-5"
                        >
                            <Link2 className="size-3.5 shrink-0" />
                            Copy link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="mx-0 my-px" />
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={handleDelete}
                            className="rounded-lg gap-1.5 px-2 py-1.5 text-sm font-normal tracking-[-0.02em] leading-5"
                        >
                            <Trash2 className="size-3.5 shrink-0" />
                            Delete note
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
