import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Minus, Maximize2, X, Minimize2, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type MailUser, type MailMessage } from '../types';

interface ComposeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSent: () => void;
    replyTo?: MailMessage | null;
    forwardFrom?: MailMessage | null;
    gmailConnected?: boolean;
    gmailEmail?: string | null;
}

type ComposeMode = 'normal' | 'minimized' | 'fullscreen';

// ─── Shared transition presets ────────────────────────────────────────────────

const spring = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 } as const;
const fastFade = { duration: 0.15 } as const;

// ─── RecipientInput ────────────────────────────────────────────────────────────

function RecipientInput({
    label,
    recipients,
    onAdd,
    onRemove,
    onShowCc,
    showCcButton,
    onHide,
}: {
    label: string;
    recipients: MailUser[];
    onAdd: (user: MailUser) => void;
    onRemove: (userId: number) => void;
    onShowCc?: () => void;
    showCcButton?: boolean;
    onHide?: () => void;
}) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<MailUser[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (query.length < 1) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }
        const timeout = setTimeout(async () => {
            try {
                const res = await api.get('/api/mail/users', { search: query });
                const filtered = (res.users as MailUser[]).filter(
                    (u) => !recipients.find((r) => r.id === u.id),
                );
                setSuggestions(filtered);
                setShowDropdown(filtered.length > 0);
                setActiveIndex(-1);
            } catch {
                setSuggestions([]);
            }
        }, 200);
        return () => clearTimeout(timeout);
    }, [query, recipients]);

    const selectUser = useCallback(
        (user: MailUser) => {
            onAdd(user);
            setQuery('');
            setSuggestions([]);
            setShowDropdown(false);
            inputRef.current?.focus();
        },
        [onAdd],
    );

    const commitQuery = useCallback(() => {
        const trimmed = query.trim();
        if (!trimmed) return;

        if (activeIndex >= 0 && suggestions[activeIndex]) {
            selectUser(suggestions[activeIndex]);
            return;
        }

        if (trimmed.includes('@')) {
            const displayName = trimmed.split('@')[0] || trimmed;
            onAdd({ id: -Date.now(), name: displayName, email: trimmed, isExternal: true });
            setQuery('');
            setSuggestions([]);
            setShowDropdown(false);
            inputRef.current?.focus();
        }
    }, [query, activeIndex, suggestions, selectUser, onAdd]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, -1));
        } else if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
            if (query.trim()) {
                e.preventDefault();
                commitQuery();
            }
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
        } else if (e.key === 'Backspace' && query === '' && recipients.length > 0) {
            onRemove(recipients[recipients.length - 1].id);
        }
    };

    return (
        <div className="relative border-b border-border/60">
            <div
                className="flex min-h-[42px] flex-wrap items-center gap-1 px-3 py-1.5 cursor-text"
                onClick={() => inputRef.current?.focus()}
            >
                <span className="shrink-0 text-xs text-muted-foreground w-7">{label}</span>

                <AnimatePresence initial={false} mode="popLayout">
                    {recipients.map((user) => (
                        <motion.div
                            key={user.id}
                            layout
                            initial={{ opacity: 0, scale: 0.75 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.75 }}
                            transition={spring}
                        >
                            <Badge variant="secondary" className="h-5 gap-1 rounded px-1.5 text-xs font-normal">
                                {user.name}
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onRemove(user.id); }}
                                    className="ml-0.5 opacity-60 hover:opacity-100"
                                >
                                    <X className="size-2.5" />
                                </button>
                            </Badge>
                        </motion.div>
                    ))}
                </AnimatePresence>

                <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => query.length >= 1 && suggestions.length > 0 && setShowDropdown(true)}
                    onBlur={() => {
                        setTimeout(() => {
                            setShowDropdown(false);
                            commitQuery();
                        }, 150);
                    }}
                    className="h-5 flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                    placeholder={recipients.length === 0 ? 'Recipients' : ''}
                />

                <div className="ml-auto flex shrink-0 items-center gap-2">
                    {showCcButton && (
                        <button
                            type="button"
                            onClick={onShowCc}
                            className="text-xs text-muted-foreground hover:text-foreground"
                        >
                            Cc
                        </button>
                    )}
                    {onHide && (
                        <button
                            type="button"
                            onClick={onHide}
                            className="text-muted-foreground/60 hover:text-foreground"
                        >
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Suggestions dropdown */}
            <AnimatePresence>
                {showDropdown && (
                    <motion.div
                        ref={dropdownRef}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.14, ease: 'easeOut' }}
                        className="absolute left-0 right-0 top-full z-50 rounded-b-lg border border-t-0 border-border bg-popover shadow-lg overflow-hidden"
                    >
                        {suggestions.map((user, i) => (
                            <motion.button
                                key={user.id}
                                type="button"
                                onMouseDown={() => selectUser(user)}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.12, delay: i * 0.03 }}
                                className={cn(
                                    'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                                    i === activeIndex ? 'bg-accent' : 'hover:bg-accent/50',
                                    i === suggestions.length - 1 && 'rounded-b-lg',
                                )}
                            >
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                    {user.name.substring(0, 1).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-medium text-foreground">{user.name}</div>
                                    <div className="text-xs text-muted-foreground">{user.email}</div>
                                </div>
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── ComposeHeader ─────────────────────────────────────────────────────────────

function ComposeHeader({
    title,
    mode,
    onMinimize,
    onToggleFullscreen,
    onClose,
}: {
    title: string;
    mode: ComposeMode;
    onMinimize: () => void;
    onToggleFullscreen: () => void;
    onClose: () => void;
}) {
    return (
        <div className="flex items-center justify-between bg-zinc-800 px-4 py-2.5 dark:bg-zinc-900 cursor-default select-none">
            <motion.span
                key={title}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={fastFade}
                className="text-sm font-medium text-white"
            >
                {title}
            </motion.span>
            <div className="flex items-center gap-1">
                <motion.button
                    type="button"
                    onClick={onMinimize}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex size-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                    title={mode === 'minimized' ? 'Restore' : 'Minimize'}
                >
                    {mode === 'minimized' ? <ChevronDown className="size-4 rotate-180" /> : <Minus className="size-4" />}
                </motion.button>
                <motion.button
                    type="button"
                    onClick={onToggleFullscreen}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex size-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                    title={mode === 'fullscreen' ? 'Exit fullscreen' : 'Expand'}
                >
                    {mode === 'fullscreen' ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                </motion.button>
                <motion.button
                    type="button"
                    onClick={onClose}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex size-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                    title="Close"
                >
                    <X className="size-4" />
                </motion.button>
            </div>
        </div>
    );
}

// ─── ComposeBody ───────────────────────────────────────────────────────────────

function ComposeBody({
    to, cc, showCc, onAddTo, onRemoveTo, onAddCc, onRemoveCc, onShowCc, onHideCc,
    subject, onSubjectChange, body, onBodyChange, error, fullscreen = false,
}: {
    to: MailUser[]; cc: MailUser[]; showCc: boolean;
    onAddTo: (u: MailUser) => void; onRemoveTo: (id: number) => void;
    onAddCc: (u: MailUser) => void; onRemoveCc: (id: number) => void;
    onShowCc: () => void; onHideCc: () => void;
    subject: string; onSubjectChange: (s: string) => void;
    body: string; onBodyChange: (s: string) => void;
    error: string | null; fullscreen?: boolean;
}) {
    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            {/* Error banner */}
            <AnimatePresence initial={false}>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive overflow-hidden"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            <RecipientInput
                label="To"
                recipients={to}
                onAdd={onAddTo}
                onRemove={onRemoveTo}
                showCcButton={!showCc}
                onShowCc={onShowCc}
            />

            {/* CC row */}
            <AnimatePresence initial={false}>
                {showCc && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="overflow-hidden"
                    >
                        <RecipientInput
                            label="Cc"
                            recipients={cc}
                            onAdd={onAddCc}
                            onRemove={onRemoveCc}
                            onHide={onHideCc}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Subject */}
            <div className="border-b border-border/60">
                <input
                    value={subject}
                    onChange={(e) => onSubjectChange(e.target.value)}
                    placeholder="Subject"
                    className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/50"
                />
            </div>

            {/* Body */}
            <textarea
                value={body}
                onChange={(e) => onBodyChange(e.target.value)}
                placeholder="Compose email"
                className={cn(
                    'flex-1 resize-none bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground/40',
                    fullscreen ? 'min-h-[320px]' : 'min-h-0',
                )}
            />
        </div>
    );
}

// ─── ComposeFooter ─────────────────────────────────────────────────────────────

function ComposeFooter({
    sending,
    onSend,
    onDraft,
    gmailConnected,
    gmailEmail,
}: {
    sending: boolean;
    onSend: () => void;
    onDraft: () => void;
    gmailConnected: boolean;
    gmailEmail?: string | null;
}) {
    const handleConnect = async () => {
        const res = await api.get('/api/gmail/connect');
        window.location.href = res.auth_url;
    };

    return (
        <div className="border-t border-border/60 bg-background">
            {/* Gmail connection status */}
            <AnimatePresence mode="wait" initial={false}>
                {!gmailConnected ? (
                    <motion.div
                        key="not-connected"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={fastFade}
                        className="flex items-center gap-2 border-b border-border/40 px-3 py-1.5"
                    >
                        <span className="flex-1 text-xs text-muted-foreground">
                            Connect Gmail to send real emails
                        </span>
                        <button
                            type="button"
                            onClick={handleConnect}
                            className="text-xs font-medium text-primary hover:underline"
                        >
                            Connect
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="connected"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={fastFade}
                        className="flex items-center gap-1.5 border-b border-border/40 px-3 py-1.5"
                    >
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ ...spring, delay: 0.1 }}
                            className="size-1.5 rounded-full bg-green-500"
                        />
                        <span className="text-xs text-muted-foreground">Sending via {gmailEmail}</span>
                        <a
                            href="/api/gmail/disconnect"
                            onClick={async (e) => {
                                e.preventDefault();
                                await api.delete('/api/gmail/disconnect');
                                window.location.reload();
                            }}
                            className="ml-auto text-xs text-muted-foreground/60 hover:text-foreground"
                        >
                            Disconnect
                        </a>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-center justify-between px-3 py-2.5">
                <motion.div whileTap={{ scale: 0.96 }}>
                    <Button onClick={onSend} disabled={sending} size="sm" className="rounded-full px-5">
                        {sending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                        Send
                    </Button>
                </motion.div>
                <button
                    type="button"
                    onClick={onDraft}
                    disabled={sending}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                    Save draft
                </button>
            </div>
        </div>
    );
}

// ─── ComposeDialog (main) ──────────────────────────────────────────────────────

export function ComposeDialog({ isOpen, onClose, onSent, replyTo, forwardFrom, gmailConnected = false, gmailEmail }: ComposeDialogProps) {
    const [to, setTo] = useState<MailUser[]>([]);
    const [cc, setCc] = useState<MailUser[]>([]);
    const [showCc, setShowCc] = useState(false);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<ComposeMode>('normal');

    useEffect(() => {
        if (isOpen) {
            resetForm();
            setMode('normal');
            if (replyTo) {
                setSubject(`Re: ${replyTo.subject.replace(/^(Re|Fwd): /i, '')}`);
                setBody(`\n\n— ${replyTo.sender?.name} wrote:\n${replyTo.body}`);
                if (replyTo.sender) {
                    setTo([{ id: replyTo.sender.id, name: replyTo.sender.name, email: replyTo.sender.email }]);
                }
            } else if (forwardFrom) {
                setSubject(`Fwd: ${forwardFrom.subject.replace(/^(Re|Fwd): /i, '')}`);
                setBody(`\n\n— Forwarded from ${forwardFrom.sender?.name}:\n${forwardFrom.body}`);
            }
        }
    }, [isOpen, replyTo, forwardFrom]);

    const resetForm = () => {
        setTo([]);
        setCc([]);
        setShowCc(false);
        setSubject('');
        setBody('');
        setError(null);
    };

    const handleSend = async (isDraft = false) => {
        if (!isDraft && to.length === 0) {
            setError('Please add at least one recipient.');
            return;
        }
        if (!subject.trim()) {
            setError('Subject is required.');
            return;
        }

        setSending(true);
        setError(null);

        try {
            await api.post('/api/mail/messages', {
                to: to.map((u) => u.isExternal ? u.email : u.id),
                cc: cc.map((u) => u.isExternal ? u.email : u.id),
                bcc: [],
                subject: subject.trim(),
                body: body.trim(),
                parent_id: replyTo?.id || forwardFrom?.id || null,
                type: replyTo ? 'reply' : forwardFrom ? 'forward' : 'new',
                is_draft: isDraft,
            });
            onSent();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    const title = replyTo ? 'Reply' : forwardFrom ? 'Forward' : 'New Message';

    const bodyProps = {
        to, cc, showCc,
        onAddTo: (u: MailUser) => setTo([...to, u]),
        onRemoveTo: (id: number) => setTo(to.filter(u => u.id !== id)),
        onAddCc: (u: MailUser) => setCc([...cc, u]),
        onRemoveCc: (id: number) => setCc(cc.filter(u => u.id !== id)),
        onShowCc: () => setShowCc(true),
        onHideCc: () => { setShowCc(false); setCc([]); },
        subject, onSubjectChange: setSubject,
        body, onBodyChange: setBody,
        error,
    };

    const footerProps = {
        sending,
        onSend: () => handleSend(false),
        onDraft: () => handleSend(true),
        gmailConnected,
        gmailEmail,
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Fullscreen backdrop */}
                    {mode === 'fullscreen' && (
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                            onClick={() => setMode('normal')}
                        />
                    )}

                    {mode === 'fullscreen' ? (
                        /* ── Fullscreen panel ── */
                        <motion.div
                            key="fullscreen"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={spring}
                            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                        >
                            <div className="flex w-full max-w-3xl flex-col rounded-xl shadow-2xl overflow-hidden bg-background border border-border pointer-events-auto">
                                <ComposeHeader
                                    title={title}
                                    mode={mode}
                                    onMinimize={() => setMode('minimized')}
                                    onToggleFullscreen={() => setMode('normal')}
                                    onClose={onClose}
                                />
                                <ComposeBody {...bodyProps} fullscreen />
                                <ComposeFooter {...footerProps} />
                            </div>
                        </motion.div>
                    ) : (
                        /* ── Bottom-right panel (normal / minimized) ── */
                        <motion.div
                            key="panel"
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 40 }}
                            transition={spring}
                            className="fixed bottom-0 right-6 z-50 flex w-[500px] flex-col rounded-t-xl shadow-2xl overflow-hidden border border-border border-b-0 bg-background"
                        >
                            <ComposeHeader
                                title={title}
                                mode={mode}
                                onMinimize={() => setMode(mode === 'minimized' ? 'normal' : 'minimized')}
                                onToggleFullscreen={() => setMode('fullscreen')}
                                onClose={onClose}
                            />

                            <AnimatePresence initial={false}>
                                {mode !== 'minimized' && (
                                    <motion.div
                                        key="body"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                                        className="flex flex-col overflow-hidden"
                                        style={{ minHeight: mode === 'minimized' ? 0 : 476 }}
                                    >
                                        <ComposeBody {...bodyProps} />
                                        <ComposeFooter {...footerProps} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </>
            )}
        </AnimatePresence>
    );
}
