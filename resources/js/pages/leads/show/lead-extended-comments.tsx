import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateComment, useInfiniteLeadComments } from '@/hooks/useLead';
import { useMentionUsers } from '@/hooks/useMentionUsers';
import { cn } from '@/lib/utils';
import type { Lead, LeadActivity, User as LeadUser } from '@/types/lead';
import { Task } from '@/types/task';
import { usePage } from '@inertiajs/react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ChevronUp, Hash, Loader2, MessageSquare, Send } from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// --- Helpers ---

function getUserFromActivity(activity: LeadActivity): LeadUser | undefined {
    if (!activity.user) return undefined;
    if ('data' in activity.user && activity.user.data) return activity.user.data;
    if ('id' in activity.user) return activity.user as LeadUser;
    return undefined;
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// --- Mention Rendering ---

function renderCommentText(
    text: string,
    mentions?: Array<{ user_id: number; name: string }>,
    taskRefs?: Array<{ task_id: string; title: string }>,
) {
    if (!text) return null;

    // Build a regex that matches all @name and #task patterns
    const parts: Array<{ type: 'text' | 'mention' | 'task'; value: string; id?: number | string }> = [];

    let remaining = text;

    // Replace mentions
    if (mentions && mentions.length > 0) {
        for (const mention of mentions) {
            const pattern = `@${mention.name}`;
            const idx = remaining.indexOf(pattern);
            if (idx !== -1) {
                if (idx > 0) {
                    parts.push({ type: 'text', value: remaining.slice(0, idx) });
                }
                parts.push({ type: 'mention', value: mention.name, id: mention.user_id });
                remaining = remaining.slice(idx + pattern.length);
            }
        }
    }

    // Replace task refs
    if (taskRefs && taskRefs.length > 0) {
        for (const taskRef of taskRefs) {
            const pattern = `#${taskRef.title}`;
            const idx = remaining.indexOf(pattern);
            if (idx !== -1) {
                if (idx > 0) {
                    parts.push({ type: 'text', value: remaining.slice(0, idx) });
                }
                parts.push({ type: 'task', value: taskRef.title, id: taskRef.task_id });
                remaining = remaining.slice(idx + pattern.length);
            }
        }
    }

    if (remaining) {
        parts.push({ type: 'text', value: remaining });
    }

    // If no special parts found, just return text
    if (parts.length === 0) {
        return <span className="whitespace-pre-wrap">{text}</span>;
    }

    return (
        <span className="whitespace-pre-wrap">
            {parts.map((part, i) => {
                if (part.type === 'mention') {
                    return (
                        <span key={i} className="font-medium text-primary">
                            @{part.value}
                        </span>
                    );
                }
                if (part.type === 'task') {
                    return (
                        <Badge key={i} variant="outline" className="mx-0.5 inline-flex h-5 gap-0.5 px-1.5 text-xs font-normal">
                            <Hash className="h-3 w-3" />
                            {part.value}
                        </Badge>
                    );
                }
                return <Fragment key={i}>{part.value}</Fragment>;
            })}
        </span>
    );
}

// --- Mention Popup ---

function MentionPopup({
    search,
    onSelect,
    visible,
    position,
}: {
    search: string;
    onSelect: (user: { id: number; name: string; email: string }) => void;
    visible: boolean;
    position: { bottom: number; left: number };
}) {
    const { data: users, isLoading } = useMentionUsers(search, visible);

    if (!visible) return null;

    return (
        <div
            className="absolute z-50 w-64 rounded-lg border border-border bg-popover shadow-lg"
            style={{ bottom: position.bottom, left: position.left }}
        >
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground">Mention a user</div>
            <ScrollArea className="max-h-48">
                {isLoading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">No users found</div>
                ) : (
                    <div className="p-1">
                        {users.map((user) => (
                            <button
                                key={user.id}
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onSelect({ id: user.id, name: user.name, email: user.email });
                                }}
                            >
                                <Avatar className="h-6 w-6">
                                    {user.avatar && <AvatarImage src={user.avatar} />}
                                    <AvatarFallback className="bg-primary/10 text-xs">{getInitials(user.name)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-medium">{user.name}</div>
                                    <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}

// --- Task Popup ---

function TaskPopup({
    search,
    tasks,
    onSelect,
    visible,
    position,
}: {
    search: string;
    tasks: Task[];
    onSelect: (task: { id: string | number; title: string }) => void;
    visible: boolean;
    position: { bottom: number; left: number };
}) {
    const filtered = useMemo(() => {
        if (!search) return tasks.slice(0, 10);
        const lower = search.toLowerCase();
        return tasks.filter((t) => t.title.toLowerCase().includes(lower)).slice(0, 10);
    }, [tasks, search]);

    if (!visible) return null;

    return (
        <div
            className="absolute z-50 w-72 rounded-lg border border-border bg-popover shadow-lg"
            style={{ bottom: position.bottom, left: position.left }}
        >
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground">Reference a task</div>
            <ScrollArea className="max-h-48">
                {filtered.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">No tasks found</div>
                ) : (
                    <div className="p-1">
                        {filtered.map((task) => (
                            <button
                                key={task.id}
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onSelect({ id: task.id, title: task.title });
                                }}
                            >
                                <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate">{task.title}</div>
                                    <div className="text-xs text-muted-foreground">{task.status?.label}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}

// --- Comment Item ---

function CommentItem({ activity }: { activity: LeadActivity }) {
    const user = getUserFromActivity(activity);
    const userName = user?.name ?? 'System';

    return (
        <div className="group flex gap-2.5">
            <Avatar className="mt-0.5 h-7 w-7 shrink-0">
                {user?.avatar && <AvatarImage src={user.avatar} />}
                <AvatarFallback className="bg-primary/10 text-xs">{getInitials(userName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{userName}</span>
                    <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true })}
                    </span>
                </div>
                <div className="mt-0.5 text-sm text-foreground/90">
                    {renderCommentText(activity.description ?? '', activity.metadata?.mentions, activity.metadata?.task_refs)}
                </div>
            </div>
        </div>
    );
}

// --- Comment Skeleton ---

function CommentSkeleton() {
    return (
        <div className="flex gap-2.5">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        </div>
    );
}

// --- Main Component ---

export function LeadExtendedComments({ lead }: { lead: Lead }) {
    const { auth } = usePage<{ auth: { user: LeadUser } }>().props;
    const [text, setText] = useState('');
    const [mentions, setMentions] = useState<Array<{ user_id: number; name: string }>>([]);
    const [taskRefs, setTaskRefs] = useState<Array<{ task_id: string; title: string }>>([]);

    // Popup state
    const [mentionPopupVisible, setMentionPopupVisible] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [taskPopupVisible, setTaskPopupVisible] = useState(false);
    const [taskSearch, setTaskSearch] = useState('');
    const [triggerIndex, setTriggerIndex] = useState<number | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const commentsEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const commentsQuery = useInfiniteLeadComments(lead.id);
    const createComment = useCreateComment(lead.id);

    const tasks = lead.tasks?.data ?? [];

    // Flatten comments from infinite query pages (reversed for oldest first)
    const comments = useMemo(() => {
        const pages = commentsQuery.data?.pages ?? [];
        const all = pages.flatMap((page) => page?.data ?? []);
        return [...all].reverse();
    }, [commentsQuery.data]);

    const totalComments = useMemo(() => {
        const firstPage = commentsQuery.data?.pages?.[0];
        return firstPage?.meta?.total ?? 0;
    }, [commentsQuery.data]);

    // Scroll to bottom on new comment
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container && comments.length > 0) {
            container.scrollTop = container.scrollHeight;
        }
    }, [comments.length]);

    // Auto-resize textarea with max height
    const maxTextareaHeight = 120;
    const autoResize = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        const newHeight = Math.min(el.scrollHeight, maxTextareaHeight);
        el.style.height = `${newHeight}px`;
        el.style.overflowY = el.scrollHeight > maxTextareaHeight ? 'auto' : 'hidden';
    }, []);

    useEffect(() => {
        autoResize();
    }, [text, autoResize]);

    // Handle text changes and detect @/# triggers
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart ?? value.length;
        setText(value);

        // Detect @ trigger
        const textBeforeCursor = value.slice(0, cursorPos);
        const atMatch = textBeforeCursor.match(/@(\w*)$/);
        if (atMatch) {
            setMentionSearch(atMatch[1]);
            setMentionPopupVisible(true);
            setTaskPopupVisible(false);
            setTriggerIndex(cursorPos - atMatch[0].length);
            return;
        }

        // Detect # trigger
        const hashMatch = textBeforeCursor.match(/#(\w*)$/);
        if (hashMatch) {
            setTaskSearch(hashMatch[1]);
            setTaskPopupVisible(true);
            setMentionPopupVisible(false);
            setTriggerIndex(cursorPos - hashMatch[0].length);
            return;
        }

        setMentionPopupVisible(false);
        setTaskPopupVisible(false);
        setTriggerIndex(null);
    };

    // Handle mention select
    const handleMentionSelect = (user: { id: number; name: string }) => {
        if (triggerIndex === null) return;
        const cursorPos = textareaRef.current?.selectionStart ?? text.length;
        const before = text.slice(0, triggerIndex);
        const after = text.slice(cursorPos);
        const newText = `${before}@${user.name} ${after}`;
        setText(newText);
        setMentions((prev) => [...prev, { user_id: user.id, name: user.name }]);
        setMentionPopupVisible(false);
        setTriggerIndex(null);

        // Restore focus and cursor
        requestAnimationFrame(() => {
            const el = textareaRef.current;
            if (el) {
                const newPos = triggerIndex + user.name.length + 2; // @name + space
                el.focus();
                el.setSelectionRange(newPos, newPos);
            }
        });
    };

    // Handle task select
    const handleTaskSelect = (task: { id: string | number; title: string }) => {
        if (triggerIndex === null) return;
        const cursorPos = textareaRef.current?.selectionStart ?? text.length;
        const before = text.slice(0, triggerIndex);
        const after = text.slice(cursorPos);
        const newText = `${before}#${task.title} ${after}`;
        setText(newText);
        setTaskRefs((prev) => [...prev, { task_id: String(task.id), title: task.title }]);
        setTaskPopupVisible(false);
        setTriggerIndex(null);

        requestAnimationFrame(() => {
            const el = textareaRef.current;
            if (el) {
                const newPos = triggerIndex + task.title.length + 2;
                el.focus();
                el.setSelectionRange(newPos, newPos);
            }
        });
    };

    // Submit comment
    const handleSubmit = () => {
        const trimmed = text.trim();
        if (!trimmed || createComment.isPending) return;

        const metadata: Record<string, unknown> = {};
        if (mentions.length > 0) metadata.mentions = mentions;
        if (taskRefs.length > 0) metadata.task_refs = taskRefs;

        createComment.mutate(
            {
                description: trimmed,
                metadata: Object.keys(metadata).length > 0 ? (metadata as { mentions?: Array<{ user_id: number; name: string }>; task_refs?: Array<{ task_id: string; title: string }> }) : undefined,
            },
            {
                onSuccess: () => {
                    setText('');
                    setMentions([]);
                    setTaskRefs([]);
                },
            },
        );
    };

    // Cmd/Ctrl+Enter to submit
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
        // Escape to close popups
        if (e.key === 'Escape') {
            setMentionPopupVisible(false);
            setTaskPopupVisible(false);
        }
    };

    const popupPosition = { bottom: 48, left: 0 };

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            {/* Scrollable Comments List */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 [-webkit-overflow-scrolling:touch]" ref={scrollContainerRef}>
                {commentsQuery.isLoading ? (
                    <div className="space-y-4 py-4">
                        <CommentSkeleton />
                        <CommentSkeleton />
                        <CommentSkeleton />
                    </div>
                ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <MessageSquare className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-muted-foreground">No comments yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">Start the conversation by adding a comment below</p>
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        {/* Load Older Comments */}
                        {commentsQuery.hasNextPage && (
                            <div className="flex justify-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1 text-xs text-muted-foreground"
                                    onClick={() => commentsQuery.fetchNextPage()}
                                    disabled={commentsQuery.isFetchingNextPage}
                                >
                                    {commentsQuery.isFetchingNextPage ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <ChevronUp className="h-3 w-3" />
                                    )}
                                    Load older comments
                                </Button>
                            </div>
                        )}

                        {comments.map((activity: LeadActivity) => (
                            <CommentItem key={activity.id} activity={activity} />
                        ))}
                        <div ref={commentsEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area — pinned to bottom */}
            <div className="relative shrink-0 border-t border-border px-4 pb-3 pt-3 sm:px-5">
                <MentionPopup
                    search={mentionSearch}
                    onSelect={handleMentionSelect}
                    visible={mentionPopupVisible}
                    position={popupPosition}
                />
                <TaskPopup
                    search={taskSearch}
                    tasks={tasks}
                    onSelect={handleTaskSelect}
                    visible={taskPopupVisible}
                    position={popupPosition}
                />

                <div className="flex items-start gap-2">
                    <Avatar className=" h-7 w-7 shrink-0">
                        {auth.user.avatar && <AvatarImage src={auth.user.avatar} />}
                        <AvatarFallback className="bg-primary/10 text-xs">{getInitials(auth.user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={handleTextChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Add a comment... Use @ to mention, # for tasks"
                            className={cn(
                                'w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm',
                                'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
                                'min-h-[36px]',
                            )}
                            rows={1}
                        />
                    </div>
                    <Button
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={handleSubmit}
                        disabled={!text.trim() || createComment.isPending}
                    >
                        {createComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>

            </div>
        </div>
    );
}
