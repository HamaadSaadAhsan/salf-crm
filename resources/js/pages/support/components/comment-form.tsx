import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send } from 'lucide-react';
import { useRef, type FormEvent } from 'react';

interface CommentFormProps {
    ticketId: number;
}

export function CommentForm({ ticketId }: CommentFormProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<{
        body: string;
        attachments: File[];
    }>({
        body: '',
        attachments: [],
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        form.post(`/support/${ticketId}/comments`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
        });
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (files) {
            form.setData('attachments', Array.from(files));
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
                placeholder="Write a comment..."
                value={form.data.body}
                onChange={(e) => form.setData('body', e.target.value)}
                rows={3}
                className="resize-none"
            />
            {form.errors.body && <p className="text-sm text-destructive">{form.errors.body}</p>}

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Paperclip className="size-4" />
                        Attach Files
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    {form.data.attachments.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                            {form.data.attachments.length} file(s) selected
                        </span>
                    )}
                </div>
                {form.errors.attachments && <p className="text-sm text-destructive">{form.errors.attachments}</p>}

                <Button type="submit" size="sm" disabled={form.processing || !form.data.body.trim()}>
                    <Send className="size-4" />
                    Send
                </Button>
            </div>
        </form>
    );
}
