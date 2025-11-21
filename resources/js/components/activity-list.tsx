import { Activity } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';

type ActivityUser = {
    data?: {
        id: number;
        name: string;
        email: string;
    };
} | null;

type ActivityAttachment = {
    filepath: string;
    filename: string;
    uploaded_at: string;
    mime_type?: string;
    size?: number;
};

export type ActivityItem = {
    id: string;
    type: string;
    status: string;
    subject: string;
    description: string | null;
    user: ActivityUser;
    attachments?: ActivityAttachment[];
    created_at: string;
};

type ActivityListProps = {
    activities: ActivityItem[];
    title?: string;
    emptyMessage?: string;
    className?: string;
};

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatMimeType(mimeType: string): string {
    const parts = mimeType.split('/');
    return parts[parts.length - 1].toUpperCase();
}

function getActivityDescription(activity: ActivityItem): string {
    const typeDescriptions: Record<string, string> = {
        call: 'made a call',
        email: 'sent an email',
        meeting: 'scheduled a meeting',
        note: 'added a note',
        message: 'sent a message',
        task: 'created a task',
        follow_up: 'scheduled a follow-up',
        status_change: 'changed status',
        assignment_change: 'changed assignment',
    };

    return typeDescriptions[activity.type] || activity.type;
}

export function ActivityList({
    activities,
    title = 'Recent Activity',
    emptyMessage = 'No recent activity',
    className
}: ActivityListProps) {
    return (
        <div className={className}>
            <h3 className="ms-1 flex items-center gap-1.5 text-sm font-semibold mb-3.5">
                <Activity className="size-3.5 opacity-60" />
                {title}
            </h3>
            {activities.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-sm">
                    {emptyMessage}
                </div>
            ) : (
                <Card className="shadow-none">
                    <CardContent className="space-y-3 p-3.5">
                        <ul className="flex flex-col gap-2.5">
                            {activities.map((activity) => {
                                const userName = activity.user?.data?.name || 'System';
                                const initials = userName
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .toUpperCase() || '?';

                                return (
                                    <li key={activity.id} className="flex items-center gap-1.5 text-sm">
                                        <Avatar className="size-6">
                                            <AvatarImage src="" alt={userName} />
                                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex items-center gap-1 flex-1 min-w-0">
                                            <span className="font-medium truncate">
                                                {userName}
                                            </span>
                                            <span className="text-muted-foreground truncate">
                                                {activity.description || getActivityDescription(activity)}
                                            </span>
                                            {activity.subject && (
                                                <span className="font-medium truncate">
                                                    {activity.subject}
                                                </span>
                                            )}
                                            {activity.attachments && activity.attachments.length > 0 && (() => {
                                                const attachment = activity.attachments[0];
                                                const parts: string[] = [];

                                                if (attachment.mime_type) {
                                                    parts.push(formatMimeType(attachment.mime_type));
                                                }

                                                if (attachment.size !== undefined && attachment.size !== null) {
                                                    parts.push(formatFileSize(attachment.size));
                                                }

                                                return parts.length ? (
                                                    <span className="text-muted-foreground truncate">• {parts.join(' • ')}</span>
                                                ) : null;
                                            })()}
                                        </div>
                                        <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                                            {formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true })}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}