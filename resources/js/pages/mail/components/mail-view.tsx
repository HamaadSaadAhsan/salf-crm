import { useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Reply, Forward, Star, Trash2, MailOpen, MailIcon, ChevronDown, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { type MailMessage } from '../types';

interface MailViewProps {
    message: MailMessage | null;
    thread: MailMessage[];
    onBack: () => void;
    onReply: (message: MailMessage) => void;
    onForward: (message: MailMessage) => void;
    onToggleStar: (messageId: number) => void;
    onToggleRead: (messageId: number) => void;
    onTrash: (messageId: number) => void;
}

const AVATAR_COLORS = [
    'bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600',
    'bg-rose-600', 'bg-cyan-600', 'bg-pink-600', 'bg-teal-600',
];

function getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function MessageCard({
    message,
    collapsible = false,
    onReply,
    onForward,
}: {
    message: MailMessage;
    collapsible?: boolean;
    onReply?: (m: MailMessage) => void;
    onForward?: (m: MailMessage) => void;
}) {
    const [collapsed, setCollapsed] = useState(collapsible);
    const senderName = message.sender?.name || 'Unknown';
    const initials = message.sender?.initials || senderName.substring(0, 2).toUpperCase();
    const toRecipients = message.recipients.filter((r) => r.type === 'to');
    const ccRecipients = message.recipients.filter((r) => r.type === 'cc');

    return (
        <div className="border-b border-border/50 py-4">
            {/* Message header */}
            <div
                className={cn('flex items-start gap-3', collapsible && 'cursor-pointer')}
                onClick={collapsible ? () => setCollapsed(!collapsed) : undefined}
            >
                <Avatar className="mt-0.5 size-10 shrink-0">
                    <AvatarFallback className={cn('text-xs font-semibold text-white', getAvatarColor(senderName))}>
                        {initials}
                    </AvatarFallback>
                </Avatar>

                <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[0.8125rem] font-semibold text-foreground">{senderName}</span>
                            {collapsed && (
                                <span className="truncate text-xs text-muted-foreground">
                                    {message.preview}
                                </span>
                            )}
                        </div>
                        {!collapsed && (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                                <span>to {toRecipients.map((r) => r.name || r.email).join(', ')}</span>
                                {ccRecipients.length > 0 && (
                                    <span>, cc {ccRecipients.map((r) => r.name || r.email).join(', ')}</span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                        <span className="text-xs text-muted-foreground tabular-nums">
                            {message.sent_at
                                ? format(new Date(message.sent_at), 'MMM d, h:mm a')
                                : 'Draft'}
                        </span>
                        {collapsible && (
                            <ChevronDown
                                className={cn('size-3.5 text-muted-foreground transition-transform', !collapsed && 'rotate-180')}
                            />
                        )}
                        {!collapsible && onReply && (
                            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/msg:opacity-100">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="size-7" onClick={(e) => { e.stopPropagation(); onReply(message); }}>
                                            <Reply className="size-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reply</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="size-7" onClick={(e) => { e.stopPropagation(); onForward?.(message); }}>
                                            <Forward className="size-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Forward</TooltipContent>
                                </Tooltip>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Body */}
            {!collapsed && (
                <div className="mt-4 pl-[52px]">
                    <div
                        className="prose prose-sm max-w-none text-[0.8125rem] leading-relaxed text-foreground/90 dark:prose-invert [&_a]:text-primary [&_blockquote]:border-l-border [&_blockquote]:text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: message.body.replace(/\n/g, '<br />') }}
                    />

                    {/* Inline actions */}
                    {onReply && (
                        <div className="mt-6 flex gap-2">
                            <Button variant="outline" size="sm" className="gap-1.5 rounded-full" onClick={() => onReply(message)}>
                                <Reply className="size-3.5" />
                                Reply
                            </Button>
                            {onForward && (
                                <Button variant="outline" size="sm" className="gap-1.5 rounded-full" onClick={() => onForward(message)}>
                                    <Forward className="size-3.5" />
                                    Forward
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function MailView({ message, thread, onBack, onReply, onForward, onToggleStar, onToggleRead, onTrash }: MailViewProps) {
    if (!message) {
        return (
            <div className="hidden flex-1 flex-col items-center justify-center lg:flex">
                <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-muted/60">
                    <MailIcon className="size-9 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-medium text-foreground/50">Select an email to read</p>
            </div>
        );
    }

    return (
        <div className="flex min-w-0 flex-1 flex-col">
            {/* Toolbar */}
            <div className="flex items-center gap-1 border-b px-3 py-2">
                <Button variant="ghost" size="icon" className="size-9 rounded-full lg:hidden" onClick={onBack}>
                    <ArrowLeft className="size-4" />
                </Button>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-9 rounded-full" onClick={() => onTrash(message.id)}>
                            <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-9 rounded-full" onClick={() => onToggleRead(message.id)}>
                            {message.is_read
                                ? <MailIcon className="size-4 text-muted-foreground" />
                                : <MailOpen className="size-4 text-muted-foreground" />
                            }
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{message.is_read ? 'Mark as unread' : 'Mark as read'}</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-9 rounded-full" onClick={() => onToggleStar(message.id)}>
                            <Star className={cn('size-4', message.is_starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{message.is_starred ? 'Unstar' : 'Star'}</TooltipContent>
                </Tooltip>
            </div>

            {/* Scrollable content */}
            <ScrollArea className="flex-1">
                <div className="mx-auto max-w-3xl px-6 py-5">
                    {/* Subject */}
                    <h1 className="mb-5 text-2xl font-normal text-foreground">
                        {message.subject}
                    </h1>

                    {/* Thread + current message */}
                    <div className="group/msg">
                        {thread.map((threadMsg) => (
                            <MessageCard key={threadMsg.id} message={threadMsg} collapsible />
                        ))}
                        <MessageCard message={message} onReply={onReply} onForward={onForward} />
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
