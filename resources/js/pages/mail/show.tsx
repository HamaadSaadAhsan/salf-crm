import { useCallback, useEffect, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { PageProps } from '@/types/global';
import { api } from '@/lib/api';
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Trash2,
    MailOpen,
    MailIcon,
    Star,
    WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MailSidebar } from './components/mail-sidebar';
import { ComposeDialog } from './components/compose-dialog';
import { MailView } from './components/mail-view';
import { type MailMessage, type MailFolder, type MailLabel, type MailCounts } from './types';

interface ShowPageProps {
    message: MailMessage;
    thread: MailMessage[];
    folder: string;
    prevId: number | null;
    nextId: number | null;
    position: number | null;
    total: number;
}

function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true,
    );

    useEffect(() => {
        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    return isOnline;
}

export default function MailShowPage({
    message: initialMessage,
    thread: initialThread,
    folder,
    prevId,
    nextId,
    position,
    total,
}: ShowPageProps) {
    const { auth } = usePage<PageProps>().props;
    const isOnline = useOnlineStatus();
    const [message, setMessage] = useState(initialMessage);
    const [thread, setThread] = useState(initialThread);

    // Sidebar state
    const [labels, setLabels] = useState<MailLabel[]>([]);
    const [counts, setCounts] = useState<MailCounts>({ inbox: 0, drafts: 0, starred: 0 });

    // Compose dialog state
    const [composeOpen, setComposeOpen] = useState(false);
    const [replyTo, setReplyTo] = useState<MailMessage | null>(null);
    const [forwardFrom, setForwardFrom] = useState<MailMessage | null>(null);
    const [gmailConnected, setGmailConnected] = useState(false);
    const [gmailEmail, setGmailEmail] = useState<string | null>(null);

    useEffect(() => {
        api.get('/api/gmail/status').then((res) => {
            setGmailConnected(res.connected);
            setGmailEmail(res.email ?? null);
        }).catch(() => {});
        api.get('/api/mail/labels').then((res) => setLabels(res.labels)).catch(() => {});
        api.get('/api/mail/counts').then((res) => setCounts(res)).catch(() => {});
    }, []);

    // Reset state when navigating between messages
    useEffect(() => {
        setMessage(initialMessage);
        setThread(initialThread);
    }, [initialMessage, initialThread]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Mail', href: '/mail' },
        { title: message.subject, href: '#' },
    ];

    const navigateTo = useCallback((id: number) => {
        router.visit(`/mail/messages/${id}?folder=${folder}`, { preserveState: false });
    }, [folder]);

    const handleBack = useCallback(() => {
        router.visit(`/mail?folder=${folder}`);
    }, [folder]);

    const handleToggleStar = useCallback(async (messageId: number) => {
        try {
            const res = await api.post(`/api/mail/messages/${messageId}/star`);
            if (message.id === messageId) {
                setMessage((prev) => ({ ...prev, is_starred: res.is_starred }));
            }
            setThread((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, is_starred: res.is_starred } : m)),
            );
        } catch {}
    }, [message.id]);

    const handleToggleRead = useCallback(async (messageId: number) => {
        try {
            const res = await api.post(`/api/mail/messages/${messageId}/read`);
            if (message.id === messageId) {
                setMessage((prev) => ({ ...prev, is_read: res.is_read }));
            }
        } catch {}
    }, [message.id]);

    const handleTrash = useCallback(async (messageId: number) => {
        try {
            await api.post(`/api/mail/messages/${messageId}/trash`);
            // Navigate to next message or back to list
            if (nextId) {
                navigateTo(nextId);
            } else if (prevId) {
                navigateTo(prevId);
            } else {
                handleBack();
            }
        } catch {}
    }, [nextId, prevId, navigateTo, handleBack]);

    const handleReply = useCallback((msg: MailMessage) => {
        setReplyTo(msg);
        setForwardFrom(null);
        setComposeOpen(true);
    }, []);

    const handleForward = useCallback((msg: MailMessage) => {
        setForwardFrom(msg);
        setReplyTo(null);
        setComposeOpen(true);
    }, []);

    const handleMessageSent = useCallback(() => {
        router.reload({ only: ['message', 'thread'] });
    }, []);

    const handleFolderChange = useCallback((f: MailFolder) => {
        router.visit(`/mail?folder=${f}`);
    }, []);

    const handleCompose = useCallback(() => {
        setReplyTo(null);
        setForwardFrom(null);
        setComposeOpen(true);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (composeOpen) return;

            switch (e.key) {
                case 'j':
                    if (nextId) navigateTo(nextId);
                    break;
                case 'k':
                    if (prevId) navigateTo(prevId);
                    break;
                case 'u':
                case 'Escape':
                    handleBack();
                    break;
                case 'r':
                    handleReply(message);
                    break;
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [nextId, prevId, navigateTo, handleBack, handleReply, message, composeOpen]);

    return (
        <AppLayout breadcrumbs={breadcrumbs} fullHeight collapseSidebar>
            <Head title={message.subject} />

            {!isOnline && (
                <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-900/50 dark:bg-amber-950/30">
                    <WifiOff className="size-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm text-amber-700 dark:text-amber-300">
                        No internet connection. Some features may be unavailable.
                    </span>
                </div>
            )}

            <div className="flex h-full overflow-hidden">
                <MailSidebar
                    activeFolder={folder as MailFolder}
                    onFolderChange={handleFolderChange}
                    activeLabel={null}
                    onLabelSelect={() => {}}
                    labels={labels}
                    counts={counts}
                    onCompose={handleCompose}
                    onCreateLabel={() => {}}
                    userName={auth.user.name}
                    userEmail={auth.user.email}
                />

                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                {/* Top toolbar */}
                <div className="flex shrink-0 items-center gap-1 border-b border-border/60 px-2 py-1">
                    {/* Left: back + actions */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" mode="icon" size="sm" onClick={handleBack}>
                                <ArrowLeft className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Back to {folder}</TooltipContent>
                    </Tooltip>

                    <div className="mx-1 h-5 w-px bg-border/60" />

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" mode="icon" size="sm" onClick={() => handleTrash(message.id)}>
                                <Trash2 className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" mode="icon" size="sm" onClick={() => handleToggleRead(message.id)}>
                                {message.is_read ? <MailOpen className="size-4" /> : <MailIcon className="size-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{message.is_read ? 'Mark as unread' : 'Mark as read'}</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" mode="icon" size="sm" onClick={() => handleToggleStar(message.id)}>
                                <Star className={message.is_starred ? 'size-4 fill-amber-400 text-amber-400' : 'size-4'} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{message.is_starred ? 'Unstar' : 'Star'}</TooltipContent>
                    </Tooltip>

                    {/* Right: position + prev/next */}
                    <div className="flex-1" />

                    {position !== null && (
                        <span className="mr-2 text-xs text-muted-foreground tabular-nums">
                            {position} of {total}
                        </span>
                    )}

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                mode="icon"
                                size="sm"
                                disabled={!prevId}
                                onClick={() => prevId && navigateTo(prevId)}
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Newer</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                mode="icon"
                                size="sm"
                                disabled={!nextId}
                                onClick={() => nextId && navigateTo(nextId)}
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Older</TooltipContent>
                    </Tooltip>
                </div>

                {/* Mail view content */}
                <MailView
                    message={message}
                    thread={thread}
                    onBack={handleBack}
                    onReply={handleReply}
                    onForward={handleForward}
                    onToggleStar={handleToggleStar}
                    onToggleRead={handleToggleRead}
                    onTrash={handleTrash}
                />
                </div>
            </div>

            <ComposeDialog
                isOpen={composeOpen}
                onClose={() => setComposeOpen(false)}
                onSent={handleMessageSent}
                replyTo={replyTo}
                forwardFrom={forwardFrom}
                gmailConnected={gmailConnected}
                gmailEmail={gmailEmail}
                isOffline={!isOnline}
            />
        </AppLayout>
    );
}
