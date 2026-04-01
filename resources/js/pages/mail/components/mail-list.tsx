import { useCallback, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Search, RefreshCw, Inbox, MailCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

const AVATAR_COLORS = [
    'bg-blue-600',
    'bg-emerald-600',
    'bg-violet-600',
    'bg-amber-600',
    'bg-rose-600',
    'bg-cyan-600',
    'bg-pink-600',
    'bg-teal-600',
];

function getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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
        <div
            className={cn(
                className,
                'flex w-full flex-col border-r border-border/60 lg:w-[340px] lg:shrink-0',
            )}
        >
            {/* Search bar */}
            <div className="flex items-center gap-2 px-3 py-2.5">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={`Search in ${FOLDER_LABELS[folder].toLowerCase()}...`}
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="h-9 rounded-full border-muted bg-muted/50 pl-9 text-sm focus-visible:bg-background"
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
                        <MailCheck
                            className={cn('size-4', syncing && 'animate-pulse')}
                        />
                    </Button>
                )}
            </div>

            {/* Separator */}
            <div className="border-b border-border/60" />

            {/* Message list */}
            <ScrollArea className="flex-1">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                        <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-muted">
                            <Inbox className="size-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium text-foreground/70">
                            No messages here
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/50">
                            {folder === 'inbox'
                                ? 'Your inbox is empty'
                                : `No messages in ${FOLDER_LABELS[folder].toLowerCase()}`}
                        </p>
                    </div>
                ) : (
                    <div>
                        {messages.map((message) => {
                            const isSelected = selectedId === message.id;
                            const isUnread = !message.is_read;
                            const senderName =
                                folder === 'sent'
                                    ? message.recipients.find(
                                          (r) => r.type === 'to',
                                      )?.name || 'Unknown'
                                    : message.sender?.name || 'Unknown';
                            const initials = getInitials(senderName);

                            return (
                                <button
                                    key={message.id}
                                    onClick={() => onSelect(message)}
                                    className={cn(
                                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                                        isSelected
                                            ? 'bg-primary text-primary-foreground'
                                            : isUnread
                                              ? 'bg-background hover:bg-muted/40'
                                              : 'bg-muted/20 hover:bg-muted/40',
                                    )}
                                >
                                    {/* Avatar */}
                                    <Avatar className="size-10 shrink-0">
                                        <AvatarFallback
                                            className={cn(
                                                'text-xs font-semibold text-white',
                                                isSelected
                                                    ? 'bg-primary-foreground/20'
                                                    : getAvatarColor(senderName),
                                            )}
                                        >
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>

                                    {/* Content */}
                                    <div className="min-w-0 flex-1">
                                        {/* Top row: sender name + unread dot + date */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex min-w-0 items-center gap-1.5">
                                                <span
                                                    className={cn(
                                                        'truncate text-sm',
                                                        isSelected
                                                            ? 'font-semibold'
                                                            : isUnread
                                                              ? 'font-semibold text-foreground'
                                                              : 'font-medium text-foreground/80',
                                                    )}
                                                >
                                                    {folder === 'sent'
                                                        ? `To: ${senderName}`
                                                        : senderName}
                                                </span>
                                                {isUnread && !isSelected && (
                                                    <span className="size-2 shrink-0 rounded-full bg-primary" />
                                                )}
                                            </div>
                                            <span
                                                className={cn(
                                                    'shrink-0 text-xs tabular-nums',
                                                    isSelected
                                                        ? 'text-primary-foreground/70'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                {formatDate(
                                                    message.sent_at ||
                                                        message.created_at,
                                                )}
                                            </span>
                                        </div>

                                        {/* Subject line */}
                                        <p
                                            className={cn(
                                                'mt-0.5 truncate text-xs',
                                                isSelected
                                                    ? 'font-medium text-primary-foreground/90'
                                                    : isUnread
                                                      ? 'font-medium text-foreground/70'
                                                      : 'text-foreground/60',
                                            )}
                                        >
                                            {message.subject}
                                        </p>

                                        {/* Preview text */}
                                        {message.preview && (
                                            <p
                                                className={cn(
                                                    'mt-0.5 truncate text-xs',
                                                    isSelected
                                                        ? 'text-primary-foreground/60'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                {message.preview}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
