import { useState, useRef, useEffect, useCallback } from 'react';
import { format, isToday, isThisYear } from 'date-fns';
import {
    ArrowLeft,
    Reply,
    Forward,
    Star,
    Trash2,
    MailIcon,
    MailOpen,
    ChevronDown,
    MoreVertical,
    EllipsisVertical,
} from 'lucide-react';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatMessageDate(dateStr: string | null): string {
    if (!dateStr) return 'Draft';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isThisYear(date)) return format(date, 'MMM d');
    return format(date, 'MMM d, yyyy');
}

function formatFullDate(dateStr: string | null): string {
    if (!dateStr) return 'Draft';
    const date = new Date(dateStr);
    return format(date, "MMM d, yyyy, h:mm a");
}

function getRecipientSummary(msg: MailMessage): string {
    const toRecipients = msg.recipients.filter((r) => r.type === 'to');
    if (toRecipients.length === 0) return 'me';
    if (toRecipients.length === 1) {
        return toRecipients[0].name || toRecipients[0].email.split('@')[0];
    }
    return `${toRecipients[0].name || toRecipients[0].email.split('@')[0]} and ${toRecipients.length - 1} other${toRecipients.length > 2 ? 's' : ''}`;
}

// ─── EmailBody ───────────────────────────────────────────────────────────────

function EmailBody({ html }: { html: string }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const isFullHtml = /<(!doctype|html|head|body)[\s>]/i.test(html);

    const adjustHeight = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe?.contentDocument?.body) return;
        iframe.style.height = iframe.contentDocument.body.scrollHeight + 'px';
    }, []);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe || !isFullHtml) return;

        const onLoad = () => {
            adjustHeight();
            // Watch for images loading
            const images = iframe.contentDocument?.querySelectorAll('img') ?? [];
            images.forEach((img) => img.addEventListener('load', adjustHeight));
        };

        iframe.addEventListener('load', onLoad);
        return () => iframe.removeEventListener('load', onLoad);
    }, [html, isFullHtml, adjustHeight]);

    if (!isFullHtml) {
        return (
            <div
                className="text-sm leading-relaxed text-foreground/90 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_img]:max-w-full [&_img]:rounded-md [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted/50 [&_pre]:p-3 [&_pre]:text-xs"
                dangerouslySetInnerHTML={{
                    __html: /<[a-z][\s\S]*>/i.test(html)
                        ? html
                        : html.replace(/\n/g, '<br />'),
                }}
            />
        );
    }

    return (
        <iframe
            ref={iframeRef}
            srcDoc={html}
            sandbox="allow-same-origin"
            className="w-full border-0"
            style={{ minHeight: 100 }}
            title="Email content"
        />
    );
}

// ─── ExpandedMessage ──────────────────────────────────────────────────────────

function ExpandedMessage({
    message,
    onToggleStar,
    onReply,
    onForward,
}: {
    message: MailMessage;
    onToggleStar?: (id: number) => void;
    onReply?: (m: MailMessage) => void;
    onForward?: (m: MailMessage) => void;
}) {
    const [showDetails, setShowDetails] = useState(false);
    const senderName = message.sender?.name ?? 'Unknown';
    const senderEmail = message.sender?.email ?? '';
    const initials = message.sender?.initials || getInitials(senderName);
    const toRecipients = message.recipients.filter((r) => r.type === 'to');
    const ccRecipients = message.recipients.filter((r) => r.type === 'cc');

    return (
        <div className="border-b border-border/50 px-4 py-4">
            {/* Header row */}
            <div className="flex items-start gap-3">
                <Avatar className="size-10 shrink-0">
                    <AvatarFallback
                        className={cn(
                            'text-xs font-semibold text-white',
                            getAvatarColor(senderName),
                        )}
                    >
                        {initials}
                    </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-sm font-semibold text-foreground">
                                    {senderName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    &lt;{senderEmail}&gt;
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDetails(!showDetails)}
                                className="mt-0.5 flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
                            >
                                to {getRecipientSummary(message)}
                                <ChevronDown
                                    className={cn(
                                        'size-3 transition-transform duration-150',
                                        showDetails && 'rotate-180',
                                    )}
                                />
                            </button>
                        </div>

                        {/* Right side: date + actions */}
                        <div className="flex shrink-0 items-center gap-0.5">
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {formatFullDate(message.sent_at)}
                            </span>
                            {onToggleStar && (
                                <Button
                                    variant="ghost"
                                    mode="icon"
                                    size="sm"
                                    onClick={() => onToggleStar(message.id)}
                                >
                                    <Star
                                        className={cn(
                                            'size-4',
                                            message.is_starred && 'fill-amber-400 text-amber-400',
                                        )}
                                    />
                                </Button>
                            )}
                            {onReply && (
                                <Button
                                    variant="ghost"
                                    mode="icon"
                                    size="sm"
                                    onClick={() => onReply(message)}
                                >
                                    <Reply className="size-4" />
                                </Button>
                            )}
                            <Button variant="ghost" mode="icon" size="sm">
                                <EllipsisVertical className="size-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Expandable details */}
                    {showDetails && (
                        <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                            <p>from: {senderName} &lt;{senderEmail}&gt;</p>
                            <p>
                                to:{' '}
                                {toRecipients.length > 0
                                    ? toRecipients.map((r) => `${r.name || ''} <${r.email}>`).join(', ')
                                    : 'me'}
                            </p>
                            {ccRecipients.length > 0 && (
                                <p>
                                    cc: {ccRecipients.map((r) => `${r.name || ''} <${r.email}>`).join(', ')}
                                </p>
                            )}
                            <p>date: {formatFullDate(message.sent_at)}</p>
                            <p>subject: {message.subject}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="mt-3 pl-[52px]">
                <EmailBody html={message.body} />
            </div>
        </div>
    );
}

// ─── CollapsedMessage ─────────────────────────────────────────────────────────

function CollapsedMessage({
    message,
    onClick,
    onToggleStar,
    onReply,
}: {
    message: MailMessage;
    onClick: () => void;
    onToggleStar?: (id: number) => void;
    onReply?: (m: MailMessage) => void;
}) {
    const senderName = message.sender?.name ?? 'Unknown';
    const initials = message.sender?.initials || getInitials(senderName);

    return (
        <div
            className="group flex cursor-pointer items-center gap-3 border-b border-border/50 px-4 py-2.5 transition-colors hover:bg-muted/30"
            onClick={onClick}
        >
            <Avatar className="size-8 shrink-0">
                <AvatarFallback
                    className={cn(
                        'text-[0.5rem] font-semibold text-white',
                        getAvatarColor(senderName),
                    )}
                >
                    {initials}
                </AvatarFallback>
            </Avatar>

            <span className="shrink-0 text-sm font-medium text-foreground">
                {senderName}
            </span>

            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {message.preview || '\u2014'}
            </span>

            {/* Right side: timestamp always visible, actions on hover */}
            <div className="flex shrink-0 items-center gap-0.5">
                <span className="text-xs text-muted-foreground tabular-nums">
                    {formatMessageDate(message.sent_at)}
                </span>
                {onToggleStar && (
                    <div
                        className={cn(
                            'opacity-0 transition-opacity group-hover:opacity-100',
                            message.is_starred && 'opacity-100',
                        )}
                    >
                        <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleStar(message.id);
                            }}
                        >
                            <Star
                                className={cn(
                                    'size-3.5',
                                    message.is_starred && 'fill-amber-400 text-amber-400',
                                )}
                            />
                        </Button>
                    </div>
                )}
                {onReply && (
                    <div className="opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onReply(message);
                            }}
                        >
                            <Reply className="size-3.5" />
                        </Button>
                    </div>
                )}
                <div className="opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                        variant="ghost"
                        mode="icon"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MoreVertical className="size-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── ThreadMessage ────────────────────────────────────────────────────────────

function ThreadMessage({
    message,
    onToggleStar,
    onReply,
    onForward,
}: {
    message: MailMessage;
    onToggleStar?: (id: number) => void;
    onReply?: (m: MailMessage) => void;
    onForward?: (m: MailMessage) => void;
}) {
    const [expanded, setExpanded] = useState(false);

    if (expanded) {
        return (
            <ExpandedMessage
                message={message}
                onToggleStar={onToggleStar}
                onReply={onReply}
                onForward={onForward}
            />
        );
    }

    return (
        <CollapsedMessage
            message={message}
            onClick={() => setExpanded(true)}
            onToggleStar={onToggleStar}
            onReply={onReply}
        />
    );
}

// ─── MailView ─────────────────────────────────────────────────────────────────

export function MailView({
    message,
    thread,
    onBack,
    onReply,
    onForward,
    onToggleStar,
    onToggleRead,
    onTrash,
}: MailViewProps) {
    if (!message) {
        return (
            <div className="hidden flex-1 flex-col items-center justify-center lg:flex">
                <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-muted/50">
                    <MailIcon className="size-9 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-medium text-muted-foreground/60">
                    Select an email to read
                </p>
            </div>
        );
    }

    return (
        <div className="flex min-w-0 flex-1 flex-col">
            {/* Toolbar */}
            <div className="flex items-center gap-1 border-b border-border/60 px-2 py-1.5">
                {/* Left group */}
                <Button
                    variant="ghost"
                    mode="icon"
                    size="sm"
                    onClick={onBack}
                    className="lg:hidden"
                >
                    <ArrowLeft className="size-4" />
                </Button>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            onClick={() => onTrash(message.id)}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            onClick={() => onToggleRead(message.id)}
                        >
                            {message.is_read ? (
                                <MailOpen className="size-4" />
                            ) : (
                                <MailIcon className="size-4" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {message.is_read ? 'Mark as unread' : 'Mark as read'}
                    </TooltipContent>
                </Tooltip>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Right group */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            onClick={() => onToggleStar(message.id)}
                        >
                            <Star
                                className={cn(
                                    'size-4',
                                    message.is_starred && 'fill-amber-400 text-amber-400',
                                )}
                            />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {message.is_starred ? 'Unstar' : 'Star'}
                    </TooltipContent>
                </Tooltip>
            </div>

            {/* Scrollable content */}
            <ScrollArea className="flex-1">
                <div className="mx-auto max-w-4xl">
                    {/* Subject */}
                    <div className="px-4 pt-5 pb-2">
                        <h1 className="text-xl font-semibold text-foreground">
                            {message.subject}
                            <span className="ml-2 inline-block rounded bg-muted px-1.5 py-0.5 align-middle text-xs font-normal text-muted-foreground">
                                Inbox
                            </span>
                        </h1>
                    </div>

                    {/* Thread messages (collapsed by default) */}
                    {thread.length > 0 &&
                        thread.map((threadMsg) => (
                            <ThreadMessage
                                key={threadMsg.id}
                                message={threadMsg}
                                onToggleStar={onToggleStar}
                                onReply={onReply}
                                onForward={onForward}
                            />
                        ))}

                    {/* Current / latest message (always expanded) */}
                    <ExpandedMessage
                        message={message}
                        onToggleStar={onToggleStar}
                        onReply={onReply}
                        onForward={onForward}
                    />

                    {/* Bottom action buttons */}
                    <div className="flex gap-2 px-4 pt-6 pb-8 pl-[68px]">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 rounded-full"
                            onClick={() => onReply(message)}
                        >
                            <Reply className="size-3.5" />
                            Reply
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 rounded-full"
                            onClick={() => onForward(message)}
                        >
                            <Forward className="size-3.5" />
                            Forward
                        </Button>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
