import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import type { SelectOption } from '@/types/ticket';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Paperclip } from 'lucide-react';
import { useRef, type FormEvent } from 'react';

interface CreateTicketProps {
    typeOptions: SelectOption[];
    priorityOptions: SelectOption[];
    isSuperAdmin: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Support', href: '/support' },
    { title: 'New Ticket', href: '/support/create' },
];

export default function CreateTicket({ typeOptions, priorityOptions, isSuperAdmin }: CreateTicketProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<{
        type: string;
        priority: string;
        subject: string;
        description: string;
        attachments: File[];
    }>({
        type: 'bug_report',
        priority: 'medium',
        subject: '',
        description: '',
        attachments: [],
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        form.post('/support', { forceFormData: true });
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (files) {
            form.setData('attachments', Array.from(files));
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New Support Ticket" />

            <div className="flex items-center gap-3 border-b px-6 py-4">
                <Link href="/support">
                    <Button variant="outline" size="sm" mode="icon">
                        <ArrowLeft className="size-4" />
                    </Button>
                </Link>
                <h1 className="text-lg font-semibold">Create New Ticket</h1>
            </div>

            <div className="mx-auto w-full max-w-2xl px-6 py-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className={isSuperAdmin ? 'grid grid-cols-2 gap-4' : ''}>
                        <div className="space-y-2">
                            <Label htmlFor="type">Type</Label>
                            <Select
                                value={form.data.type}
                                onValueChange={(value) => form.setData('type', value)}
                            >
                                <SelectTrigger id="type">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {typeOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.errors.type && <p className="text-sm text-destructive">{form.errors.type}</p>}
                        </div>

                        {isSuperAdmin && (
                            <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={form.data.priority}
                                    onValueChange={(value) => form.setData('priority', value)}
                                >
                                    <SelectTrigger id="priority">
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {priorityOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.errors.priority && <p className="text-sm text-destructive">{form.errors.priority}</p>}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                            id="subject"
                            value={form.data.subject}
                            onChange={(e) => form.setData('subject', e.target.value)}
                            placeholder="Brief summary of the issue"
                        />
                        {form.errors.subject && <p className="text-sm text-destructive">{form.errors.subject}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            placeholder="Describe the issue or feature request in detail..."
                            rows={8}
                            className="resize-none"
                        />
                        {form.errors.description && <p className="text-sm text-destructive">{form.errors.description}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Attachments</Label>
                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Paperclip className="size-4" />
                                Choose Files
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
                        <p className="text-xs text-muted-foreground">
                            Max 5 files. Supported: JPG, PNG, GIF, WebP, PDF. Max size: 10MB each.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Link href="/support">
                            <Button type="button" variant="outline">Cancel</Button>
                        </Link>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Creating...' : 'Create Ticket'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
