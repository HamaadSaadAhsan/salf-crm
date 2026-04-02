import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Loader2,
    Minus,
    Maximize2,
    X,
    Minimize2,
    ChevronDown,
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Link2,
    List,
    ListOrdered,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { type MailUser, type MailMessage } from '../types';

// Lexical imports
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { $generateHtmlFromNodes } from '@lexical/html';
import {
    $getRoot,
    $createParagraphNode,
    $createTextNode,
    FORMAT_TEXT_COMMAND,
    $getSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_LOW,
    SELECTION_CHANGE_COMMAND,
} from 'lexical';
import {
    INSERT_ORDERED_LIST_COMMAND,
    INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';

interface ComposeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSent: () => void;
    replyTo?: MailMessage | null;
    forwardFrom?: MailMessage | null;
    gmailConnected?: boolean;
    gmailEmail?: string | null;
    isOffline?: boolean;
}

type ComposeMode = 'normal' | 'minimized' | 'fullscreen';

// ─── Shared transition presets ────────────────────────────────────────────────

const spring = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 } as const;
const fastFade = { duration: 0.15 } as const;

// ─── Lexical config ───────────────────────────────────────────────────────────

const EDITOR_THEME = {
    paragraph: 'text-sm leading-6',
    list: {
        ul: 'list-disc ps-[4ch]',
        ol: 'list-decimal ps-[4ch]',
        listitem: 'text-sm leading-6',
    },
    link: 'text-blue-500 underline cursor-pointer',
    text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
        strikethrough: 'line-through',
    },
};

const EDITOR_NODES = [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, AutoLinkNode];

// ─── LexicalErrorBoundary ─────────────────────────────────────────────────────

function LexicalErrorBoundary({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

// ─── HtmlExtractPlugin ────────────────────────────────────────────────────────

function HtmlExtractPlugin({ onHtmlChange }: { onHtmlChange: (html: string) => void }) {
    const [editor] = useLexicalComposerContext();
    const callbackRef = useRef(onHtmlChange);
    callbackRef.current = onHtmlChange;

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const raw = $generateHtmlFromNodes(editor);
                // Strip Lexical theme classes and inline styles for clean email HTML
                const html = raw
                    .replace(/ class="[^"]*"/g, '')
                    .replace(/ style="[^"]*"/g, '');
                callbackRef.current(html);
            });
        });
    }, [editor]);

    return null;
}

// ─── FormattingToolbar ────────────────────────────────────────────────────────

function FormattingToolbar() {
    const [editor] = useLexicalComposerContext();
    const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

    useEffect(() => {
        return editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            () => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    const formats = new Set<string>();
                    if (selection.hasFormat('bold')) formats.add('bold');
                    if (selection.hasFormat('italic')) formats.add('italic');
                    if (selection.hasFormat('underline')) formats.add('underline');
                    if (selection.hasFormat('strikethrough')) formats.add('strikethrough');
                    setActiveFormats(formats);
                }
                return false;
            },
            COMMAND_PRIORITY_LOW,
        );
    }, [editor]);

    const formatActions = [
        { format: 'bold' as const, Icon: Bold, title: 'Bold' },
        { format: 'italic' as const, Icon: Italic, title: 'Italic' },
        { format: 'underline' as const, Icon: UnderlineIcon, title: 'Underline' },
        { format: 'strikethrough' as const, Icon: Strikethrough, title: 'Strikethrough' },
    ];

    return (
        <div className="flex items-center gap-0.5 border-t border-border/40 px-2 py-1.5">
            {formatActions.map(({ format, Icon, title }) => (
                <button
                    key={format}
                    type="button"
                    title={title}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
                    }}
                    className={cn(
                        'flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                        activeFormats.has(format) && 'bg-muted text-foreground',
                    )}
                >
                    <Icon className="size-3.5" />
                </button>
            ))}

            <Separator orientation="vertical" className="mx-1 h-4" />

            <button
                type="button"
                title="Insert link"
                onMouseDown={(e) => {
                    e.preventDefault();
                    const url = window.prompt('Enter URL:');
                    if (url) {
                        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
                    }
                }}
                className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
                <Link2 className="size-3.5" />
            </button>

            <button
                type="button"
                title="Bullet list"
                onMouseDown={(e) => {
                    e.preventDefault();
                    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
                }}
                className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
                <List className="size-3.5" />
            </button>

            <button
                type="button"
                title="Numbered list"
                onMouseDown={(e) => {
                    e.preventDefault();
                    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
                }}
                className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
                <ListOrdered className="size-3.5" />
            </button>
        </div>
    );
}

// ─── SetInitialContentPlugin ──────────────────────────────────────────────────

function SetInitialContentPlugin({ content }: { content: string }) {
    const [editor] = useLexicalComposerContext();
    const appliedRef = useRef(false);

    useEffect(() => {
        if (!content || appliedRef.current) return;
        appliedRef.current = true;

        editor.update(() => {
            const root = $getRoot();
            root.clear();
            const lines = content.split('\n');
            for (const line of lines) {
                const paragraph = $createParagraphNode();
                if (line.trim()) {
                    paragraph.append($createTextNode(line));
                }
                root.append(paragraph);
            }
        });
    }, [editor, content]);

    return null;
}

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
                className="flex min-h-[42px] cursor-text flex-wrap items-center gap-1 px-3 py-1.5"
                onClick={() => inputRef.current?.focus()}
            >
                <span className="w-7 shrink-0 text-xs text-muted-foreground">{label}</span>

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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(user.id);
                                    }}
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
                    className="h-5 min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
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
                        className="absolute left-0 right-0 top-full z-50 overflow-hidden rounded-b-lg border border-t-0 border-border bg-popover shadow-lg"
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
        <div className="flex cursor-default select-none items-center justify-between bg-zinc-800 px-4 py-2.5 dark:bg-zinc-900">
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
                    {mode === 'minimized' ? (
                        <ChevronDown className="size-4 rotate-180" />
                    ) : (
                        <Minus className="size-4" />
                    )}
                </motion.button>
                <motion.button
                    type="button"
                    onClick={onToggleFullscreen}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex size-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                    title={mode === 'fullscreen' ? 'Exit fullscreen' : 'Expand'}
                >
                    {mode === 'fullscreen' ? (
                        <Minimize2 className="size-3.5" />
                    ) : (
                        <Maximize2 className="size-3.5" />
                    )}
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
    to,
    cc,
    showCc,
    onAddTo,
    onRemoveTo,
    onAddCc,
    onRemoveCc,
    onShowCc,
    onHideCc,
    subject,
    onSubjectChange,
    body,
    onBodyChange,
    error,
    fullscreen = false,
    initialBodyText,
    editorKey,
}: {
    to: MailUser[];
    cc: MailUser[];
    showCc: boolean;
    onAddTo: (u: MailUser) => void;
    onRemoveTo: (id: number) => void;
    onAddCc: (u: MailUser) => void;
    onRemoveCc: (id: number) => void;
    onShowCc: () => void;
    onHideCc: () => void;
    subject: string;
    onSubjectChange: (s: string) => void;
    body: string;
    onBodyChange: (html: string) => void;
    error: string | null;
    fullscreen?: boolean;
    initialBodyText: string;
    editorKey: number;
}) {
    const initialConfig = {
        namespace: 'ComposeEditor',
        theme: EDITOR_THEME,
        nodes: EDITOR_NODES,
        onError: (error: Error) => {
            console.error('Lexical compose error:', error);
        },
        editorState: initialBodyText
            ? () => {
                  const root = $getRoot();
                  const lines = initialBodyText.split('\n');
                  for (const line of lines) {
                      const paragraph = $createParagraphNode();
                      if (line.trim()) {
                          paragraph.append($createTextNode(line));
                      }
                      root.append(paragraph);
                  }
              }
            : undefined,
    };

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
                        className="overflow-hidden border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive"
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

            {/* Rich text editor */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <LexicalComposer key={editorKey} initialConfig={initialConfig}>
                    <div
                        className={cn(
                            'relative flex-1 overflow-auto',
                            fullscreen ? 'min-h-[320px]' : 'min-h-0',
                        )}
                    >
                        <RichTextPlugin
                            contentEditable={
                                <ContentEditable className="min-h-[200px] px-3 py-3 text-sm outline-none" />
                            }
                            placeholder={
                                <div className="pointer-events-none absolute left-3 top-3 text-sm text-muted-foreground/40">
                                    Compose email
                                </div>
                            }
                            ErrorBoundary={LexicalErrorBoundary}
                        />
                        <HistoryPlugin />
                        <ListPlugin />
                        <LinkPlugin />
                        <HtmlExtractPlugin onHtmlChange={onBodyChange} />
                    </div>
                    {/* Formatting toolbar */}
                    <FormattingToolbar />
                </LexicalComposer>
            </div>
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
    isOffline = false,
}: {
    sending: boolean;
    onSend: () => void;
    onDraft: () => void;
    gmailConnected: boolean;
    gmailEmail?: string | null;
    isOffline?: boolean;
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
                    <Button onClick={onSend} disabled={sending || isOffline} size="sm" className="rounded-full px-5">
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

export function ComposeDialog({
    isOpen,
    onClose,
    onSent,
    replyTo,
    forwardFrom,
    gmailConnected = false,
    gmailEmail,
    isOffline = false,
}: ComposeDialogProps) {
    const [to, setTo] = useState<MailUser[]>([]);
    const [cc, setCc] = useState<MailUser[]>([]);
    const [showCc, setShowCc] = useState(false);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<ComposeMode>('normal');
    const [initialBodyText, setInitialBodyText] = useState('');
    const [editorKey, setEditorKey] = useState(0);

    useEffect(() => {
        if (isOpen) {
            resetForm();
            setMode('normal');

            let bodyText = '';
            if (replyTo) {
                setSubject(`Re: ${replyTo.subject.replace(/^(Re|Fwd): /i, '')}`);
                bodyText = `\n\n--- ${replyTo.sender?.name} wrote:\n${replyTo.body}`;
                if (replyTo.sender) {
                    setTo([{ id: replyTo.sender.id, name: replyTo.sender.name, email: replyTo.sender.email }]);
                }
            } else if (forwardFrom) {
                setSubject(`Fwd: ${forwardFrom.subject.replace(/^(Re|Fwd): /i, '')}`);
                bodyText = `\n\n--- Forwarded from ${forwardFrom.sender?.name}:\n${forwardFrom.body}`;
            }

            setInitialBodyText(bodyText);
            setEditorKey((k) => k + 1);
        }
    }, [isOpen, replyTo, forwardFrom]);

    const resetForm = () => {
        setTo([]);
        setCc([]);
        setShowCc(false);
        setSubject('');
        setBody('');
        setInitialBodyText('');
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
            const res = await api.post('/api/mail/messages', {
                to: to.map((u) => (u.isExternal ? u.email : u.id)),
                cc: cc.map((u) => (u.isExternal ? u.email : u.id)),
                bcc: [],
                subject: subject.trim(),
                body: body,
                parent_id: replyTo?.id || forwardFrom?.id || null,
                type: replyTo ? 'reply' : forwardFrom ? 'forward' : 'new',
                is_draft: isDraft,
            });

            onSent();
            onClose();

            if (!isDraft) {
                const messageId = res.message?.id;
                toast.success('Email sent', {
                    duration: 5000,
                    action: messageId
                        ? {
                              label: 'Undo',
                              onClick: async () => {
                                  try {
                                      await api.delete(`/api/mail/messages/${messageId}/unsend`);
                                      toast.success('Email unsent');
                                      onSent();
                                  } catch {
                                      toast.error('Unsend window expired');
                                  }
                              },
                          }
                        : undefined,
                });
            } else {
                toast.success('Draft saved');
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    const title = replyTo ? 'Reply' : forwardFrom ? 'Forward' : 'New Message';

    const bodyProps = {
        to,
        cc,
        showCc,
        onAddTo: (u: MailUser) => setTo([...to, u]),
        onRemoveTo: (id: number) => setTo(to.filter((u) => u.id !== id)),
        onAddCc: (u: MailUser) => setCc([...cc, u]),
        onRemoveCc: (id: number) => setCc(cc.filter((u) => u.id !== id)),
        onShowCc: () => setShowCc(true),
        onHideCc: () => {
            setShowCc(false);
            setCc([]);
        },
        subject,
        onSubjectChange: setSubject,
        body,
        onBodyChange: setBody,
        error,
        initialBodyText,
        editorKey,
    };

    const footerProps = {
        sending,
        onSend: () => handleSend(false),
        onDraft: () => handleSend(true),
        gmailConnected,
        gmailEmail,
        isOffline,
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
                        /* Fullscreen panel */
                        <motion.div
                            key="fullscreen"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={spring}
                            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
                        >
                            <div className="pointer-events-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
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
                        /* Bottom-right panel (normal / minimized) */
                        <motion.div
                            key="panel"
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 40 }}
                            transition={spring}
                            className="fixed bottom-0 right-6 z-50 flex w-[500px] flex-col overflow-hidden rounded-t-xl border border-b-0 border-border bg-background shadow-2xl"
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
                                        style={{ minHeight: 476 }}
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
