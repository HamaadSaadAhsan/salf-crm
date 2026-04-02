import { useCallback, useEffect, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { PageProps } from '@/types/global';
import { api } from '@/lib/api';
import { useMailListener } from '@/hooks/useMailListener';
import { WifiOff } from 'lucide-react';
import { MailSidebar } from './components/mail-sidebar';
import { MailList } from './components/mail-list';
import { ComposeDialog } from './components/compose-dialog';
import { CreateLabelDialog } from './components/create-label-dialog';
import { type MailMessage, type MailFolder, type MailLabel, type MailCounts } from './types';

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

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Mail', href: '/mail' },
];

interface MailPageProps {
    folder?: string;
    labelId?: number | null;
}

export default function MailPage({ folder: initialFolder, labelId: initialLabelId }: MailPageProps) {
    const { auth } = usePage<PageProps>().props;
    const isOnline = useOnlineStatus();
    const [activeFolder, setActiveFolder] = useState<MailFolder>((initialFolder as MailFolder) || 'inbox');
    const [activeLabel, setActiveLabel] = useState<number | null>(initialLabelId ?? null);
    const [messages, setMessages] = useState<MailMessage[]>([]);
    const [labels, setLabels] = useState<MailLabel[]>([]);
    const [counts, setCounts] = useState<MailCounts>({ inbox: 0, drafts: 0, starred: 0 });
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [gmailConnected, setGmailConnected] = useState(false);
    const [gmailEmail, setGmailEmail] = useState<string | null>(null);

    // Dialogs
    const [composeOpen, setComposeOpen] = useState(false);
    const [createLabelOpen, setCreateLabelOpen] = useState(false);
    const [replyTo, setReplyTo] = useState<MailMessage | null>(null);
    const [forwardFrom, setForwardFrom] = useState<MailMessage | null>(null);

    const fetchMessages = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = { folder: activeFolder };
            if (activeLabel) params.label = activeLabel.toString();
            if (search) params.search = search;

            const res = await api.get('/api/mail/messages', params);
            setMessages(res.messages);
        } catch {
            setMessages([]);
        } finally {
            setLoading(false);
        }
    }, [activeFolder, activeLabel, search]);

    const fetchLabels = useCallback(async () => {
        try {
            const res = await api.get('/api/mail/labels');
            setLabels(res.labels);
        } catch {
            setLabels([]);
        }
    }, []);

    const fetchCounts = useCallback(async () => {
        try {
            const res = await api.get('/api/mail/counts');
            setCounts(res);
        } catch {}
    }, []);

    useEffect(() => {
        fetchMessages();
    }, [activeFolder, activeLabel, search]);

    useEffect(() => {
        fetchLabels();
        fetchCounts();
        api.get('/api/gmail/status').then((res) => {
            setGmailConnected(res.connected);
            setGmailEmail(res.email ?? null);
        }).catch(() => {});
    }, []);

    const handleSelectMessage = useCallback((message: MailMessage) => {
        router.visit(`/mail/messages/${message.id}?folder=${activeFolder}`);
    }, [activeFolder]);

    const handleToggleStar = useCallback(async (messageId: number) => {
        try {
            const res = await api.post(`/api/mail/messages/${messageId}/star`);
            setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, is_starred: res.is_starred } : m)));
        } catch {}
    }, []);

    const handleCompose = useCallback(() => {
        setReplyTo(null);
        setForwardFrom(null);
        setComposeOpen(true);
    }, []);

    // Live inbox updates
    useMailListener({
        userId: auth.user.id,
        onMessageReceived: useCallback(() => {
            fetchMessages();
            fetchCounts();
        }, [fetchMessages, fetchCounts]),
    });

    const handleSync = useCallback(async () => {
        try {
            await api.post('/api/gmail/sync');
            setTimeout(() => { fetchMessages(); fetchCounts(); }, 3000);
        } catch {}
    }, [fetchMessages, fetchCounts]);

    const handleMessageSent = useCallback(() => {
        fetchMessages();
        fetchCounts();
    }, [fetchMessages, fetchCounts]);

    const handleLabelCreated = useCallback(() => {
        fetchLabels();
    }, [fetchLabels]);

    const handleFolderChange = useCallback((folder: MailFolder) => {
        setActiveFolder(folder);
        setSearch('');
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs} fullHeight collapseSidebar>
            <Head title="Mail" />

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
                    activeFolder={activeFolder}
                    onFolderChange={handleFolderChange}
                    activeLabel={activeLabel}
                    onLabelSelect={setActiveLabel}
                    labels={labels}
                    counts={counts}
                    onCompose={handleCompose}
                    onCreateLabel={() => setCreateLabelOpen(true)}
                    userName={auth.user.name}
                    userEmail={auth.user.email}
                />

                <MailList
                    messages={messages}
                    onSelect={handleSelectMessage}
                    onToggleStar={handleToggleStar}
                    folder={activeFolder}
                    search={search}
                    onSearchChange={setSearch}
                    onRefresh={fetchMessages}
                    onSync={handleSync}
                    gmailConnected={gmailConnected}
                    loading={loading}
                />
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

            <CreateLabelDialog
                isOpen={createLabelOpen}
                onClose={() => setCreateLabelOpen(false)}
                onCreated={handleLabelCreated}
            />
        </AppLayout>
    );
}
