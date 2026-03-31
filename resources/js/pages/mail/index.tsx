import { useCallback, useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { api } from '@/lib/api';
import { MailSidebar } from './components/mail-sidebar';
import { MailList } from './components/mail-list';
import { MailView } from './components/mail-view';
import { ComposeDialog } from './components/compose-dialog';
import { CreateLabelDialog } from './components/create-label-dialog';
import { type MailMessage, type MailFolder, type MailLabel, type MailCounts } from './types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Mail', href: '/mail' },
];

interface MailPageProps {
    folder?: string;
    labelId?: number | null;
}

export default function MailPage({ folder: initialFolder, labelId: initialLabelId }: MailPageProps) {
    const [activeFolder, setActiveFolder] = useState<MailFolder>((initialFolder as MailFolder) || 'inbox');
    const [activeLabel, setActiveLabel] = useState<number | null>(initialLabelId ?? null);
    const [messages, setMessages] = useState<MailMessage[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<MailMessage | null>(null);
    const [threadMessages, setThreadMessages] = useState<MailMessage[]>([]);
    const [labels, setLabels] = useState<MailLabel[]>([]);
    const [counts, setCounts] = useState<MailCounts>({ inbox: 0, drafts: 0, starred: 0 });
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

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
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        fetchMessages();
    }, [activeFolder, activeLabel, search]);

    useEffect(() => {
        fetchLabels();
        fetchCounts();
    }, []);

    const handleSelectMessage = useCallback(async (message: MailMessage) => {
        setSelectedMessage(message);
        try {
            const res = await api.get(`/api/mail/messages/${message.id}`);
            setSelectedMessage(res.message);
            setThreadMessages(res.thread || []);

            // Update read status in list
            setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, is_read: true } : m)));
            fetchCounts();
        } catch {
            // keep the message from list
            setThreadMessages([]);
        }
    }, [fetchCounts]);

    const handleToggleStar = useCallback(async (messageId: number) => {
        try {
            const res = await api.post(`/api/mail/messages/${messageId}/star`);
            setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, is_starred: res.is_starred } : m)));
            if (selectedMessage?.id === messageId) {
                setSelectedMessage((prev) => (prev ? { ...prev, is_starred: res.is_starred } : prev));
            }
        } catch {
            // ignore
        }
    }, [selectedMessage]);

    const handleToggleRead = useCallback(async (messageId: number) => {
        try {
            const res = await api.post(`/api/mail/messages/${messageId}/read`);
            setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, is_read: res.is_read } : m)));
            if (selectedMessage?.id === messageId) {
                setSelectedMessage((prev) => (prev ? { ...prev, is_read: res.is_read } : prev));
            }
            fetchCounts();
        } catch {
            // ignore
        }
    }, [selectedMessage, fetchCounts]);

    const handleTrash = useCallback(async (messageId: number) => {
        try {
            await api.post(`/api/mail/messages/${messageId}/trash`);
            setMessages((prev) => prev.filter((m) => m.id !== messageId));
            if (selectedMessage?.id === messageId) {
                setSelectedMessage(null);
                setThreadMessages([]);
            }
            fetchCounts();
        } catch {
            // ignore
        }
    }, [selectedMessage, fetchCounts]);

    const handleReply = useCallback((message: MailMessage) => {
        setReplyTo(message);
        setForwardFrom(null);
        setComposeOpen(true);
    }, []);

    const handleForward = useCallback((message: MailMessage) => {
        setForwardFrom(message);
        setReplyTo(null);
        setComposeOpen(true);
    }, []);

    const handleCompose = useCallback(() => {
        setReplyTo(null);
        setForwardFrom(null);
        setComposeOpen(true);
    }, []);

    const handleMessageSent = useCallback(() => {
        fetchMessages();
        fetchCounts();
    }, [fetchMessages, fetchCounts]);

    const handleLabelCreated = useCallback(() => {
        fetchLabels();
    }, [fetchLabels]);

    const handleFolderChange = useCallback((folder: MailFolder) => {
        setActiveFolder(folder);
        setSelectedMessage(null);
        setThreadMessages([]);
        setSearch('');
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs} fullHeight>
            <Head title="Mail" />

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
                />

                <MailList
                    className="ml-2"
                    messages={messages}
                    selectedId={selectedMessage?.id ?? null}
                    onSelect={handleSelectMessage}
                    onToggleStar={handleToggleStar}
                    folder={activeFolder}
                    search={search}
                    onSearchChange={setSearch}
                    onRefresh={fetchMessages}
                    loading={loading}
                />

                <MailView
                    message={selectedMessage}
                    thread={threadMessages}
                    onBack={() => setSelectedMessage(null)}
                    onReply={handleReply}
                    onForward={handleForward}
                    onToggleStar={handleToggleStar}
                    onToggleRead={handleToggleRead}
                    onTrash={handleTrash}
                />
            </div>

            <ComposeDialog
                isOpen={composeOpen}
                onClose={() => setComposeOpen(false)}
                onSent={handleMessageSent}
                replyTo={replyTo}
                forwardFrom={forwardFrom}
            />

            <CreateLabelDialog
                isOpen={createLabelOpen}
                onClose={() => setCreateLabelOpen(false)}
                onCreated={handleLabelCreated}
            />
        </AppLayout>
    );
}
