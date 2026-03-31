import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Inbox, Send, FileText, Star, Trash2, Plus, PenSquare } from 'lucide-react';
import { type MailFolder, type MailLabel, type MailCounts } from '../types';

interface MailSidebarProps {
    activeFolder: MailFolder;
    onFolderChange: (folder: MailFolder) => void;
    activeLabel: number | null;
    onLabelSelect: (labelId: number | null) => void;
    labels: MailLabel[];
    counts: MailCounts;
    onCompose: () => void;
    onCreateLabel: () => void;
}

const FOLDERS: { id: MailFolder; label: string; icon: typeof Inbox }[] = [
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'sent', label: 'Sent', icon: Send },
    { id: 'drafts', label: 'Drafts', icon: FileText },
    { id: 'starred', label: 'Starred', icon: Star },
    { id: 'trash', label: 'Trash', icon: Trash2 },
];

const LABEL_COLORS: Record<string, string> = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    gray: 'bg-gray-400',
};

export function MailSidebar({
    activeFolder,
    onFolderChange,
    activeLabel,
    onLabelSelect,
    labels,
    counts,
    onCompose,
    onCreateLabel,
}: MailSidebarProps) {
    const getFolderCount = (folder: MailFolder): number | undefined => {
        if (folder === 'inbox' && counts.inbox > 0) return counts.inbox;
        if (folder === 'drafts' && counts.drafts > 0) return counts.drafts;
        if (folder === 'starred' && counts.starred > 0) return counts.starred;
        return undefined;
    };

    return (
        <div className="hidden w-[256px] shrink-0 flex-col bg-background lg:flex">
            {/* Compose */}
            <div className="px-4 pb-2 pt-3">
                <Button
                    onClick={onCompose}
                    variant="outline"
                    className="h-14 w-36 justify-start gap-3 rounded-2xl border-border/60 bg-background px-5 text-sm font-medium shadow-md hover:shadow-lg hover:bg-muted"
                >
                    <PenSquare className="size-[1.125rem] text-foreground/70" />
                    Compose
                </Button>
            </div>

            <ScrollArea className="flex-1">
                {/* Folders */}
                <nav className="flex flex-col py-2">
                    {FOLDERS.map((folder) => {
                        const count = getFolderCount(folder.id);
                        const isActive = activeFolder === folder.id && !activeLabel;

                        return (
                            <button
                                key={folder.id}
                                onClick={() => {
                                    onFolderChange(folder.id);
                                    onLabelSelect(null);
                                }}
                                className={cn(
                                    'flex w-full items-center justify-between rounded-r-full py-1 pl-6 pr-4 text-sm transition-colors',
                                    'min-h-[2rem]',
                                    isActive
                                        ? 'bg-primary/15 font-semibold text-primary dark:bg-primary/20'
                                        : 'text-foreground/75 hover:bg-muted',
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <folder.icon className="size-[1.0625rem] shrink-0" />
                                    <span>{folder.label}</span>
                                </div>
                                {count !== undefined && (
                                    <span className="ml-auto text-xs font-semibold">{count}</span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Labels */}
                {(labels.length > 0 || true) && (
                    <div className="mt-2 pb-4">
                        <div className="flex items-center justify-between px-6 py-1">
                            <span className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                Labels
                            </span>
                            <button
                                onClick={onCreateLabel}
                                className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground/70"
                            >
                                <Plus className="size-3.5" />
                            </button>
                        </div>
                        <div className="mt-1 flex flex-col">
                            {labels.map((label) => (
                                <button
                                    key={label.id}
                                    onClick={() => onLabelSelect(activeLabel === label.id ? null : label.id)}
                                    className={cn(
                                        'flex w-full items-center justify-between rounded-r-full py-1 pl-6 pr-4 text-sm transition-colors min-h-[2rem]',
                                        activeLabel === label.id
                                            ? 'bg-primary/15 font-semibold text-primary dark:bg-primary/20'
                                            : 'text-foreground/75 hover:bg-muted',
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className={cn('size-2.5 shrink-0 rounded-full', LABEL_COLORS[label.color] || 'bg-gray-400')} />
                                        <span>{label.name}</span>
                                    </div>
                                    {(label.message_labels_count ?? 0) > 0 && (
                                        <span className="ml-auto text-xs text-muted-foreground/60">
                                            {label.message_labels_count}
                                        </span>
                                    )}
                                </button>
                            ))}
                            {labels.length === 0 && (
                                <p className="px-6 py-1 text-[0.75rem] text-muted-foreground/40">No labels yet</p>
                            )}
                        </div>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
