import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import type { ActiveCall } from '@/hooks/useInboundCalls';
import { Building, Clock, Loader2, Mail, MapPin, Phone, Save, Tag, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface ExistingLeadCallDialogProps {
    isOpen: boolean;
    onClose: () => void;
    call: ActiveCall;
    onSaveNotes: (leadId: string, notes: string, duration?: number) => Promise<void>;
}

export function ExistingLeadCallDialog({ isOpen, onClose, call, onSaveNotes }: ExistingLeadCallDialogProps) {
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - call.startTime.getTime()) / 1000);
            setDuration(elapsed);
        }, 1000);

        return () => clearInterval(interval);
    }, [isOpen, call.startTime]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getInitials = (name: string | null | undefined) => {
        if (!name) {
            return '??'; // Default initials when name is not available
        }
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleSaveNotes = async () => {
        if (!call.lead || !notes.trim()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onSaveNotes(call.lead.id, notes, duration);
            setNotes('');
            onClose();
        } catch (error) {
            // Error handled by parent
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!call.lead) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5 text-primary" />
                        Call with {call.lead.name || call.caller}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(duration)}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Lead Information Card */}
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <div className="flex items-start gap-4">
                            <Avatar className="h-16 w-16 border-2 border-primary/20">
                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-lg font-semibold text-primary">
                                    {getInitials(call.lead?.name)}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 space-y-3">
                                {/* Name and Status */}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-semibold">{call.lead.name || call.lead.phone || 'Unknown'}</h3>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {call.lead.inquiry_status && <Badge variant="secondary">{call.lead.inquiry_status}</Badge>}
                                        {call.lead.priority && <Badge variant="outline">{call.lead.priority}</Badge>}
                                        {call.lead.lead_score && (
                                            <Badge variant="default">Score: {call.lead.lead_score}</Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Contact Info - Phone Hidden for CROs */}
                                <div className="grid gap-2 text-sm sm:grid-cols-2">
                                    {call.lead.email && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Mail className="h-4 w-4" />
                                            <span className="truncate">{call.lead.email}</span>
                                        </div>
                                    )}
                                    {call.lead.city && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <MapPin className="h-4 w-4" />
                                            <span>
                                                {call.lead.city}
                                                {call.lead.country && `, ${call.lead.country}`}
                                            </span>
                                        </div>
                                    )}
                                    {call.lead.service && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Building className="h-4 w-4" />
                                            <span>{call.lead.service.name}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Tags */}
                                {call.lead.tags && Array.isArray(call.lead.tags) && call.lead.tags.length > 0 && (
                                    <div className="flex items-start gap-2">
                                        <Tag className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                                        <div className="flex flex-wrap gap-2">
                                            {call.lead.tags.map((tag: any, index: number) => (
                                                <Badge key={index} variant="outline" className="text-xs">
                                                    {tag.label || tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Details */}
                                {call.lead.detail && (
                                    <div className="rounded-md bg-background p-3">
                                        <p className="text-xs font-medium text-muted-foreground">Details</p>
                                        <p className="mt-1 text-sm">{call.lead.detail}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Notes Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            <Label htmlFor="notes" className="text-base font-semibold">
                                Call Notes
                            </Label>
                        </div>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Take notes about this call... What was discussed? Next steps? Any commitments made?"
                            rows={8}
                            className="resize-none"
                            autoFocus
                        />
                        <p className="text-xs text-muted-foreground">
                            These notes will be saved as a call activity in the lead's timeline.
                        </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Call duration: {formatDuration(duration)}</span>
                        </div>
                        <div className="flex gap-3">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                                Close
                            </Button>
                            <Button onClick={handleSaveNotes} disabled={isSubmitting || !notes.trim()}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" />
                                Save Notes
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
