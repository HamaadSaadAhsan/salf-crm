import { useCallback } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Search, Star, RefreshCw, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type MailMessage, type MailFolder } from '../types';

interface MailListProps {
    messages: MailMessage[];
    selectedId: number | null;
    onSelect: (message: MailMessage) => void;
    onToggleStar: (messageId: number) => void;
    folder: MailFolder;
    search: string;
    onSearchChange: (search: string) => void;
    onRefresh: () => void;
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
    selectedId,
    onSelect,
    onToggleStar,
    folder,
    search,
    onSearchChange,
    onRefresh,
    loading,
    className,
}: MailListProps) {
    const handleStarClick = useCallback(
        (e: React.MouseEvent, messageId: number) => {
            e.stopPropagation();
            onToggleStar(messageId);
        },
        [onToggleStar],
    );

    return (
        <div className={cn(className, `flex w-full flex-col border-r border-l lg:w-[440px] lg:shrink-0`)}>
            {/* Search bar */}
            <div className="flex items-center gap-2 border-b px-3 py-2.5">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={`Search in ${FOLDER_LABELS[folder].toLowerCase()}...`}
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="h-9 rounded-full border-muted bg-muted/50 pl-9 text-sm focus-visible:bg-background"
                    />
                </div>
                <Button variant="ghost" size="icon" className="size-9 shrink-0 rounded-full" onClick={onRefresh} disabled={loading}>
                    <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
                </Button>
            </div>

            {/* Folder heading */}
            <div className="border-b px-5 py-2.5">
                <h2 className="text-[0.8125rem] font-semibold text-foreground/80">{FOLDER_LABELS[folder]}</h2>
            </div>

            {/* Message list */}
            <ScrollArea className="flex-1">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                        <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-muted">
                            <Inbox className="size-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium text-foreground/70">No messages here</p>
                        <p className="mt-1 text-xs text-muted-foreground/50">
                            {folder === 'inbox' ? 'Your inbox is empty' : `No messages in ${FOLDER_LABELS[folder].toLowerCase()}`}
                        </p>
                    </div>
                ) : (
                    <div>
                        {messages.map((message) => {
                            const isSelected = selectedId === message.id;
                            const isUnread = !message.is_read;
                            const senderName =
                                folder === 'sent'
                                    ? message.recipients.find((r) => r.type === 'to')?.name || 'Unknown'
                                    : message.sender?.name || 'Unknown';

                            return (
                                <button
                                    key={message.id}
                                    onClick={() => onSelect(message)}
                                    className={cn(
                                        'group flex w-full items-center gap-3 border-b px-3 py-2 text-left transition-colors',
                                        isSelected
                                            ? 'bg-blue-50 dark:bg-blue-950/30'
                                            : isUnread
                                              ? 'bg-background hover:bg-muted/40'
                                              : 'bg-muted/20 hover:bg-muted/40',
                                    )}
                                >
                                    {/* Star */}
                                    <button
                                        onClick={(e) => handleStarClick(e, message.id)}
                                        className="shrink-0 rounded p-0.5 transition-colors hover:bg-accent"
                                    >
                                        <Star
                                            className={cn(
                                                'size-4 transition-colors',
                                                message.is_starred
                                                    ? 'fill-amber-400 text-amber-400'
                                                    : 'text-muted-foreground/20 group-hover:text-muted-foreground/50',
                                            )}
                                        />
                                    </button>

                                    {/* Content */}
                                    <div className="flex min-w-0 flex-1 items-baseline gap-2">
                                        {/* Sender name — fixed width */}
                                        <span
                                            className={cn(
                                                'w-[140px] shrink-0 truncate text-[0.8125rem]',
                                                isUnread ? 'font-semibold text-foreground' : 'font-normal text-foreground/75',
                                            )}
                                        >
                                            {folder === 'sent' ? `To: ${senderName}` : senderName}
                                        </span>

                                        {/* Subject + preview */}
                                        <span className="min-w-0 flex-1 truncate text-[0.8125rem]">
                                            <span className={cn(isUnread ? 'font-semibold text-foreground' : 'text-foreground/80')}>
                                                {message.subject}
                                            </span>
                                            {message.preview && <span className="font-normal text-muted-foreground"> — {message.preview}</span>}
                                        </span>
                                    </div>

                                    {/* Date */}
                                    <span
                                        className={cn(
                                            'shrink-0 text-xs tabular-nums',
                                            isUnread ? 'font-semibold text-foreground/80' : 'text-muted-foreground',
                                        )}
                                    >
                                        {formatDate(message.sent_at || message.created_at)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
