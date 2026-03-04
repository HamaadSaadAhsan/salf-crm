import { Badge } from '@/components/ui/badge';
import type { TicketComment } from '@/types/ticket';
import { AttachmentGallery } from './attachment-gallery';
import { formatDistanceToNow } from 'date-fns';

export function CommentThread({ comments }: { comments: TicketComment[] }) {
    if (!comments.length) {
        return (
            <div className="py-8 text-center text-sm text-muted-foreground">
                No comments yet. Be the first to comment.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {comments.map((comment) => (
                <div key={comment.id} className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-sm font-medium">{comment.user?.name ?? 'Deleted User'}</span>
                        {comment.is_admin_reply && (
                            <Badge variant="info" appearance="light" size="xs">
                                Admin
                            </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                    </div>
                    <div className="whitespace-pre-wrap text-sm">{comment.body}</div>
                    {comment.attachments && comment.attachments.length > 0 && (
                        <div className="mt-3">
                            <AttachmentGallery attachments={comment.attachments} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
