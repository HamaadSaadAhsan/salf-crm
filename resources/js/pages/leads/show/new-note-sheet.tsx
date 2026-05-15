import * as React from 'react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import axios from '@/lib/http';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { store } from '@/actions/App/Http/Controllers/Api/LeadActivityController';
import { useQueryClient } from '@tanstack/react-query';

interface NewNoteSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadId: string;
    onSuccess?: () => void;
}

export function NewNoteSheet({ open, onOpenChange, leadId, onSuccess }: NewNoteSheetProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const queryClient = useQueryClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!description.trim()) {
            toast.error('Please enter note content');
            return;
        }

        setIsSubmitting(true);

        try {
            await axios.post(store.url(), {
                lead_id: leadId,
                type: 'note',
                subject: subject.trim() || 'Note',
                description: description.trim(),
            });

            toast.success('Note created successfully');

            // Reset form
            setSubject('');
            setDescription('');

            // Invalidate queries to refresh data
            await queryClient.invalidateQueries({ queryKey: ['lead-notes', leadId] });
            await queryClient.invalidateQueries({ queryKey: ['lead-activities', 'latest', leadId] });
            await queryClient.invalidateQueries({ queryKey: ['lead-activities', 'comments', leadId] });

            onSuccess?.();
        } catch (error: any) {
            console.error('Failed to create note:', error);
            toast.error(error?.response?.data?.message || 'Failed to create note');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setSubject('');
            setDescription('');
        }
        onOpenChange(open);
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Create Note</SheetTitle>
                    <SheetDescription>
                        Add a new note to this lead. Notes help track important information and discussions.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject (optional)</Label>
                        <Input
                            id="subject"
                            placeholder="Enter a subject for this note"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">
                            Note Content <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="description"
                            placeholder="Enter your note here..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isSubmitting}
                            rows={6}
                            className="resize-none"
                        />
                    </div>

                    <SheetFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Note'
                            )}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
