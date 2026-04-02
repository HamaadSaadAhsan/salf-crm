import { useCallback, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Search, RefreshCw, Inbox, MailCheck, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { type MailMessage, type MailFolder } from '../types';

interface MailListProps {
    messages: MailMessage[];
    onSelect: (message: MailMessage) => void;
    onToggleStar: (messageId: number) => void;
    folder: MailFolder;
    search: string;
    onSearchChange: (search: string) => void;
    onRefresh: () => void;
    onSync?: () => Promise<void>;
    gmailConnected?: boolean;
    loading: boolean;
    className?: string;
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
}

const FOLDER_LABELS: Record<MailFolder, string> = {
    inbox: 'Inbox',
    sent: 'Sent',
    drafts: 'Drafts',
    starred: 'Starred',
    trash: 'Trash',
};

export function MailList({
    messages,
    onSelect,
    onToggleStar,
    folder,
    search,
    onSearchChange,
    onRefresh,
    onSync,
    gmailConnected,
    loading,
    className,
}: MailListProps) {
    const [syncing, setSyncing] = useState(false);

    const handleSync = useCallback(async () => {
        if (!onSync) return;
        setSyncing(true);
        await onSync();
        setSyncing(false);
    }, [onSync]);

    return (
        <div className={cn('flex min-w-0 flex-1 flex-col', className)}>
            {/* Toolbar */}
            <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5">
                <div className="relative max-w-md flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={`Search in ${FOLDER_LABELS[folder].toLowerCase()}...`}
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="h-8 rounded-lg border-muted bg-muted/40 pl-9 text-sm focus-visible:bg-background"
                    />
                </div>
                <Button
                    variant="ghost"
                    mode="icon"
                    size="sm"
                    className="shrink-0"
                    onClick={onRefresh}
                    disabled={loading}
                >
                    <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
                </Button>
                {gmailConnected && onSync && (
                    <Button
                        variant="ghost"
                        mode="icon"
                        size="sm"
                        className="shrink-0"
                        onClick={handleSync}
                        disabled={syncing}
                        title="Sync Gmail inbox"
                    >
                        <MailCheck className={cn('size-4', syncing && 'animate-pulse')} />
                    </Button>
                )}
            </div>

            {/* Message rows */}
            <ScrollArea className="flex-1">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                        <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-muted">
                            <Inbox className="size-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium text-foreground/70">No messages here</p>
                        <p className="mt-1 text-xs text-muted-foreground/50">
                            {folder === 'inbox'
                                ? 'Your inbox is empty'
                                : `No messages in ${FOLDER_LABELS[folder].toLowerCase()}`}
                        </p>
                    </div>
                ) : (
                    <div>
                        {messages.map((message) => {
                            const isUnread = !message.is_read;
                            const senderName =
                                folder === 'sent'
                                    ? `To: ${message.recipients.find((r) => r.type === 'to')?.name || 'Unknown'}`
                                    : message.sender?.name || 'Unknown';

                            return (
                                <div
                                    key={message.id}
                                    onClick={() => onSelect(message)}
                                    className={cn(
                                        'group flex cursor-pointer items-center gap-1 border-b border-border/30 px-2 py-1 text-left transition-colors hover:shadow-[inset_2px_0_0_0] hover:shadow-border/80',
                                        isUnread ? 'bg-background' : 'bg-muted/15',
                                        'hover:bg-muted/30',
                                    )}
                                >
                                    {/* Checkbox */}
                                    <div className="flex shrink-0 items-center px-1" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox className="size-4" />
                                    </div>

                                    {/* Star */}
                                    <button
                                        type="button"
                                        className="shrink-0 p-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleStar(message.id);
                                        }}
                                    >
                                        <Star
                                            className={cn(
                                                'size-4',
                                                message.is_starred
                                                    ? 'fill-amber-400 text-amber-400'
                                                    : 'text-muted-foreground/40 hover:text-muted-foreground',
                                            )}
                                        />
                                    </button>

                                    {/* Sender */}
                                    <span
                                        className={cn(
                                            'w-[180px] shrink-0 truncate px-1 text-sm',
                                            isUnread ? 'font-semibold text-foreground' : 'text-foreground/80',
                                        )}
                                    >
                                        {senderName}
                                    </span>

                                    {/* Subject + preview */}
                                    <div className="flex min-w-0 flex-1 items-baseline gap-1 truncate px-1">
                                        <span
                                            className={cn(
                                                'shrink-0 truncate text-sm',
                                                isUnread ? 'font-semibold text-foreground' : 'text-foreground/80',
                                            )}
                                        >
                                            {message.subject}
                                        </span>
                                        {message.preview && (
                                            <>
                                                <span className="shrink-0 text-sm text-muted-foreground/50">—</span>
                                                <span className="min-w-0 truncate text-sm text-muted-foreground/60">
                                                    {message.preview}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Date */}
                                    <span
                                        className={cn(
                                            'shrink-0 px-2 text-xs tabular-nums',
                                            isUnread ? 'font-semibold text-foreground' : 'text-muted-foreground',
                                        )}
                                    >
                                        {formatDate(message.sent_at || message.created_at)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
