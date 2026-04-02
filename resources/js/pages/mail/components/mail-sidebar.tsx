import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
    Inbox,
    Send,
    FileText,
    Star,
    Trash2,
    Plus,
    PenSquare,
    Archive,
    Clock,
    AlertTriangle,
    LifeBuoy,
    Settings,
    MessageSquare,
} from 'lucide-react';
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
    userName: string;
    userEmail: string;
}

const FOLDERS: { id: MailFolder; label: string; icon: typeof Inbox }[] = [
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'drafts', label: 'Draft', icon: FileText },
    { id: 'sent', label: 'Sent', icon: Send },
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

const LABEL_ICONS: Record<string, typeof Archive> = {
    archive: Archive,
    snoozed: Clock,
    spam: AlertTriangle,
    trash: Trash2,
    starred: Star,
};

function getUserInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

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

export function MailSidebar({
    activeFolder,
    onFolderChange,
    activeLabel,
    onLabelSelect,
    labels,
    counts,
    onCompose,
    onCreateLabel,
    userName,
    userEmail,
}: MailSidebarProps) {
    const userInitials = getUserInitials(userName);

    const getFolderCount = (folder: MailFolder): number | undefined => {
        if (folder === 'inbox' && counts.inbox > 0) return counts.inbox;
        if (folder === 'drafts' && counts.drafts > 0) return counts.drafts;
        if (folder === 'starred' && counts.starred > 0) return counts.starred;
        return undefined;
    };

    return (
        <div className="hidden w-[220px] shrink-0 flex-col border-r border-border/60 bg-background lg:flex">
            {/* User profile */}
            <div className="flex items-center gap-2.5 px-4 pt-4 pb-1">
                <Avatar className="size-9 shrink-0">
                    <AvatarFallback
                        className={cn(
                            'text-xs font-semibold text-white',
                            getAvatarColor(userName),
                        )}
                    >
                        {userInitials}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                        {userName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {userEmail}
                    </p>
                </div>
            </div>

            {/* New Mail button */}
            <div className="px-4 pt-3 pb-4">
                <Button
                    onClick={onCompose}
                    variant="primary"
                    className="w-full gap-2 rounded-full"
                >
                    <PenSquare className="size-4" />
                    New Mail
                </Button>
            </div>

            <ScrollArea className="flex-1">
                {/* MAIL section */}
                <div className="px-4 pb-1">
                    <span className="text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground/50">
                        Mail
                    </span>
                </div>

                {/* Folder nav */}
                <nav className="flex flex-col gap-0.5 px-2 pb-3">
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
                                    'flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors',
                                    isActive
                                        ? 'bg-primary font-medium text-primary-foreground'
                                        : 'text-foreground/70 hover:bg-muted',
                                )}
                            >
                                <folder.icon className="size-4 shrink-0" />
                                <span className="flex-1 text-left">{folder.label}</span>
                                {count !== undefined && (
                                    <span className="text-xs font-medium">{count}</span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* LABELS section */}
                <div className="flex items-center justify-between px-4 pb-1">
                    <span className="text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground/50">
                        Labels
                    </span>
                    <button
                        onClick={onCreateLabel}
                        className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground/70"
                    >
                        <Plus className="size-3.5" />
                    </button>
                </div>

                {/* Starred folder (in labels section) */}
                <nav className="flex flex-col gap-0.5 px-2 pb-3">
                    <button
                        onClick={() => {
                            onFolderChange('starred');
                            onLabelSelect(null);
                        }}
                        className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors',
                            activeFolder === 'starred' && !activeLabel
                                ? 'bg-primary font-medium text-primary-foreground'
                                : 'text-foreground/70 hover:bg-muted',
                        )}
                    >
                        <Star className="size-4 shrink-0" />
                        <span className="flex-1 text-left">Starred</span>
                        {(counts.starred ?? 0) > 0 && (
                            <span className="text-xs font-medium">{counts.starred}</span>
                        )}
                    </button>

                    <button
                        onClick={() => {
                            onFolderChange('trash');
                            onLabelSelect(null);
                        }}
                        className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors',
                            activeFolder === 'trash' && !activeLabel
                                ? 'bg-primary font-medium text-primary-foreground'
                                : 'text-foreground/70 hover:bg-muted',
                        )}
                    >
                        <Trash2 className="size-4 shrink-0" />
                        <span className="flex-1 text-left">Trash</span>
                    </button>

                    {/* Custom labels */}
                    {labels.map((label) => {
                        const LabelIcon = LABEL_ICONS[label.name.toLowerCase()];
                        return (
                            <button
                                key={label.id}
                                onClick={() =>
                                    onLabelSelect(activeLabel === label.id ? null : label.id)
                                }
                                className={cn(
                                    'flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors',
                                    activeLabel === label.id
                                        ? 'bg-primary font-medium text-primary-foreground'
                                        : 'text-foreground/70 hover:bg-muted',
                                )}
                            >
                                {LabelIcon ? (
                                    <LabelIcon className="size-4 shrink-0" />
                                ) : (
                                    <span
                                        className={cn(
                                            'size-2.5 shrink-0 rounded-full',
                                            LABEL_COLORS[label.color] || 'bg-gray-400',
                                        )}
                                    />
                                )}
                                <span className="flex-1 text-left">{label.name}</span>
                                {(label.message_labels_count ?? 0) > 0 && (
                                    <span className="text-xs font-medium">
                                        {label.message_labels_count}
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    {labels.length === 0 && (
                        <p className="px-3 py-1 text-xs text-muted-foreground/40">
                            No labels yet
                        </p>
                    )}
                </nav>
            </ScrollArea>

            {/* Bottom links */}
            <Separator />
            <div className="flex flex-col gap-0.5 px-2 py-2">
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-foreground/50 transition-colors hover:bg-muted hover:text-foreground/70">
                    <LifeBuoy className="size-4 shrink-0" />
                    <span>Support</span>
                </button>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-foreground/50 transition-colors hover:bg-muted hover:text-foreground/70">
                    <Settings className="size-4 shrink-0" />
                    <span>Settings</span>
                </button>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-foreground/50 transition-colors hover:bg-muted hover:text-foreground/70">
                    <MessageSquare className="size-4 shrink-0" />
                    <span>Feedback</span>
                </button>
            </div>
        </div>
    );
}
