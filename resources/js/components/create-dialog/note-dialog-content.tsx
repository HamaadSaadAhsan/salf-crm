import { useCreateDialog } from '@/providers/CreateDialogProvider';
import { Link } from '@inertiajs/react';
import { User2, Video, X } from 'lucide-react';
import { LinkMeetingPopover } from './link-meeting-popover';
import { useCallback, useEffect, useRef } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { CodeNode } from '@lexical/code';
import type { EditorState } from 'lexical';
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical';
import { cn } from '@/lib/utils';
import { FloatingToolbarPlugin } from './lexical-floating-toolbar';
import { InsertButton } from './lexical-insert-button';
import { ImageNode } from './lexical-image-node';
import { ImagePlugin } from './lexical-image-plugin';

const EDITOR_THEME = {
    paragraph: 'text-sm font-medium tracking-[-0.01em] leading-6',
    heading: {
        h1: 'text-[28px] font-semibold tracking-[-0.02em] leading-[32px] pt-3 pb-1',
        h2: 'text-[20px] font-semibold tracking-[-0.02em] leading-6 pt-2 pb-1',
        h3: 'text-base font-semibold tracking-[-0.02em] leading-6 pt-2 pb-1',
    },
    list: {
        ul: 'list-disc ps-[4ch] [&_::marker]:text-[rgb(162,164,167)]',
        ol: 'list-decimal ps-[4ch] [&_::marker]:text-[rgb(162,164,167)] [&_::marker]:font-[Inter,sans-serif]',
        listitem: 'text-sm font-medium tracking-[-0.01em] leading-6 font-[Inter,sans-serif]',
        nested: {
            listitem: 'list-none',
        },
    },
    link: 'text-blue-500 underline cursor-pointer',
    text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
        strikethrough: 'line-through',
        code: 'bg-zinc-100 dark:bg-zinc-800 rounded px-1 py-0.5 font-mono text-[0.85em]',
    },
    code: 'bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 font-mono text-sm block mb-2',
    quote: 'border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 italic text-muted-foreground mb-2',
};

const EDITOR_NODES = [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, AutoLinkNode, CodeNode, ImageNode];

export function NoteDialogContent() {
    const { data, setData, association, viewState, activityId } = useCreateDialog();
    const titleRef = useRef<HTMLDivElement>(null);
    const initializedRef = useRef<string | null>(null);

    const isFull = viewState === 'full';

    // Populate title when opening an existing note (or when activityId changes)
    useEffect(() => {
        if (titleRef.current && activityId && initializedRef.current !== activityId) {
            initializedRef.current = activityId;
            if (data.subject && titleRef.current.textContent !== data.subject) {
                titleRef.current.textContent = data.subject;
            }
        }
    }, [activityId, data.subject]);

    const handleTitleInput = useCallback(() => {
        if (titleRef.current) {
            setData({ subject: titleRef.current.textContent || '' });
        }
    }, [setData]);

    const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Focus the editor
            const editor = document.querySelector('[data-lexical-editor="true"]');
            if (editor instanceof HTMLElement) {
                editor.focus();
            }
        }
    }, []);

    const handleTitlePaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    }, []);

    const handleEditorChange = useCallback((editorState: EditorState) => {
        editorState.read(() => {
            const root = $getRoot();
            const text = root.getTextContent();
            setData({
                description: text,
                editorState: JSON.stringify(editorState.toJSON()),
            });
        });
    }, [setData]);

    // Build initialConfig — restore from serialized JSON if available, else from plain text
    const initialConfig = {
        namespace: 'CreateDialogEditor',
        theme: EDITOR_THEME,
        nodes: EDITOR_NODES,
        onError: (error: Error) => {
            console.error('Lexical error:', error);
        },
        editorState: data.editorState
            ? data.editorState
            : data.description
                ? () => {
                    const root = $getRoot();
                    const lines = data.description.split('\n');
                    for (const line of lines) {
                        const paragraph = $createParagraphNode();
                        if (line) {
                            paragraph.append($createTextNode(line));
                        }
                        root.append(paragraph);
                    }
                }
                : undefined,
    };

    // Attio: .gNZZEj = padding-top: 136px, padding-left/right: 128px (full mode)
    // Responsive: px-32 only on xl+ to prevent content crush on narrow viewports
    const titlePad = isFull ? 'pt-[136px] px-8 sm:px-16 xl:px-32' : 'pt-6 px-6';
    // Attio: .bqcCLu = padding-left/right: 128px, padding-bottom: 20px (full mode)
    const editorPad = isFull ? 'px-8 sm:px-16 xl:px-32 pb-5' : 'px-6 pb-5';

    return (
        <LexicalComposer key={activityId || 'new'} initialConfig={initialConfig}>
            {/* Outer wrapper — Attio .ipVlEu: flex-col, gap-4, h-full, pb-6 */}
            <div className="flex flex-col gap-4 h-full pb-6">
                {/* Title + chips section — Attio .ihQQcV + .gNZZEj */}
                <div className={cn('flex flex-col items-start gap-2 pb-3', titlePad)}>
                    {/* Title — contentEditable + overlay placeholder */}
                    <div className="relative w-full">
                        <div
                            ref={titleRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={handleTitleInput}
                            onKeyDown={handleTitleKeyDown}
                            onPaste={handleTitlePaste}
                            className="relative z-1 text-[32px] font-semibold tracking-[-0.02em] leading-9 text-foreground outline-none caret-[rgb(78,140,252)]"
                            role="textbox"
                            aria-label="Note title"
                        />
                        {!data.subject && (
                            <div className="absolute inset-0 text-[32px] font-semibold tracking-[-0.02em] leading-9 text-muted-foreground/40 pointer-events-none">
                                Untitled note
                            </div>
                        )}
                    </div>

                    {/* Reference chips — Attio .jaLmeZ */}
                    {association?.name && (
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <Link
                                href={association.url || '#'}
                                className="inline-flex items-center gap-1 h-[22px] px-2 rounded-md text-xs font-medium tracking-[-0.01em] leading-4 bg-zinc-100 dark:bg-zinc-800 text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                                <User2 className="size-3 shrink-0 text-muted-foreground" />
                                <span className="truncate">{association.name}</span>
                            </Link>
                            {data.linkedMeeting ? (
                                <span className="inline-flex items-center gap-1 h-[22px] pl-2 pr-1 rounded-md text-xs font-medium tracking-[-0.01em] leading-4 bg-zinc-100 dark:bg-zinc-800 text-foreground">
                                    <Video className="size-3 shrink-0 text-muted-foreground" />
                                    {data.linkedMeeting.meet_link || data.linkedMeeting.url ? (
                                        <a
                                            href={data.linkedMeeting.meet_link || data.linkedMeeting.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="truncate max-w-[160px] hover:underline"
                                        >
                                            {data.linkedMeeting.title}
                                        </a>
                                    ) : (
                                        <span className="truncate max-w-[160px]">{data.linkedMeeting.title}</span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setData({ linkedMeeting: null })}
                                        className="ml-0.5 size-3.5 flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                                        aria-label="Remove linked meeting"
                                    >
                                        <X className="size-2.5" />
                                    </button>
                                </span>
                            ) : (
                                <LinkMeetingPopover />
                            )}
                        </div>
                    )}
                </div>

                {/* Editor section — Attio .fauKtQ: relative, isolate, flex: 1 1 auto, h-full
                    No horizontal padding on wrapper — padding is on editor content & placeholder */}
                <div className="relative isolate flex-auto h-full outline-none">
                    <div className="h-full outline-none">
                        <RichTextPlugin
                            contentEditable={
                                <ContentEditable
                                    className={cn(
                                        'outline-none text-sm font-medium tracking-[-0.01em] leading-6 text-foreground caret-[rgb(78,140,252)]',
                                        editorPad,
                                    )}
                                    style={{ userSelect: 'text', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                    aria-label="Note content"
                                />
                            }
                            placeholder={
                                <div className={cn(
                                    'absolute inset-0 text-sm font-medium tracking-[-0.01em] leading-6 text-muted-foreground/40 pointer-events-none',
                                    editorPad,
                                )}>
                                    Start typing, or create a template
                                </div>
                            }
                            ErrorBoundary={LexicalErrorBoundary}
                        />
                        <HistoryPlugin />
                        <ListPlugin />
                        <LinkPlugin />
                        <ImagePlugin />
                        <OnChangePlugin onChange={handleEditorChange} ignoreSelectionChange />
                        <FloatingToolbarPlugin />
                    </div>
                </div>

                {/* Insert button — Attio .izndRR: absolute, bottom: 12px, left: 12px
                    Positioned relative to ScrollArea root (nearest positioned ancestor) */}
                <InsertButton />
            </div>
        </LexicalComposer>
    );
}

function LexicalErrorBoundary({ children }: { children: React.ReactNode; onError?: (error: Error) => void }) {
    return <>{children}</>;
}
