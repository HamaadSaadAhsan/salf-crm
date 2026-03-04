import { FileText, Image } from 'lucide-react';
import type { TicketAttachment } from '@/types/ticket';

function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1048576) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / 1048576).toFixed(1)} MB`;
}

function isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
}

export function AttachmentGallery({ attachments }: { attachments: TicketAttachment[] }) {
    if (!attachments.length) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-3">
            {attachments.map((attachment) => (
                <a
                    key={attachment.id}
                    href={`/storage/${attachment.file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                    {isImage(attachment.mime_type) ? (
                        <Image className="size-4 text-muted-foreground" />
                    ) : (
                        <FileText className="size-4 text-muted-foreground" />
                    )}
                    <span className="max-w-[200px] truncate">{attachment.file_name}</span>
                    <span className="text-xs text-muted-foreground">({formatFileSize(attachment.file_size)})</span>
                </a>
            ))}
        </div>
    );
}
