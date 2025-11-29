import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ActiveCall } from '@/hooks/useInboundCalls';
import { useServices } from '@/lib/useServices';
import type { Service } from '@/types/lead';
import { Clock, Loader2, User } from 'lucide-react';
import React, { useState } from 'react';

interface NewLeadCallDialogProps {
    isOpen: boolean;
    onClose: () => void;
    call: ActiveCall;
    onUpdateLead: (leadId: string, data: {
        name?: string;
        email?: string;
        city?: string;
        service_id?: number;
        detail?: string;
        budget?: any;
    }, callNotes: string, duration: number) => Promise<void>;
}

export function NewLeadCallDialog({ isOpen, onClose, call, onUpdateLead }: NewLeadCallDialogProps) {
    console.log('NewLeadCallDialog render:', { isOpen, call, hasLead: !!call.lead });

    const { services, loading: servicesLoading } = useServices();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [duration, setDuration] = useState(0);

    // Initialize form data with existing lead data if available
    const getInitialFormData = React.useCallback(() => {
        if (call.lead) {
            return {
                name: call.lead.name || '',
                phone: call.lead.phone || call.caller,
                email: call.lead.email || '',
                city: call.lead.city || '',
                service_id: call.lead.service?.id,
                detail: call.lead.detail || '',
                budget: call.lead.budget?.amount || '',
            };
        }
        return {
            name: '',
            phone: call.caller,
            email: '',
            city: '',
            service_id: undefined as number | undefined,
            detail: '',
            budget: '',
        };
    }, [call.lead, call.caller]);

    const [formData, setFormData] = useState(getInitialFormData);
    const [callNotes, setCallNotes] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Reset form data when uniqueid changes (new call)
    const previousUniqueid = React.useRef(call.uniqueid);
    React.useEffect(() => {
        if (previousUniqueid.current !== call.uniqueid) {
            previousUniqueid.current = call.uniqueid;
            setFormData(getInitialFormData());
            setCallNotes('');
            setErrors({});
        }
    }, [call.uniqueid, getInitialFormData]);

    // Track call duration
    React.useEffect(() => {
        if (!isOpen) {
            return;
        }

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - call.startTime.getTime()) / 1000);
            setDuration(elapsed);
        }, 1000);

        return () => clearInterval(interval);
    }, [isOpen, call.startTime]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        try {
            if (!call.lead) {
                setErrors({ general: 'No lead data available' });
                setIsSubmitting(false);
                return;
            }

            // Validate that notes are provided
            if (!callNotes.trim()) {
                setErrors({ callNotes: 'Please add notes about this call' });
                setIsSubmitting(false);
                return;
            }

            // Update lead with the modified data and call notes
            await onUpdateLead(
                call.lead.id,
                {
                    name: formData.name,
                    email: formData.email || undefined,
                    city: formData.city || undefined,
                    service_id: formData.service_id,
                    detail: formData.detail || undefined,
                    budget: formData.budget ? { amount: formData.budget } : undefined,
                },
                callNotes,
                duration
            );
            onClose();
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Don't render if no lead data
    if (!call.lead) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Call with {call.lead.name || 'Lead'}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(duration)}</span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Lead Information Fields */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Update Lead Information</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter lead name"
                                    className={errors.name ? 'border-destructive' : ''}
                                />
                                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@example.com"
                                    className={errors.email ? 'border-destructive' : ''}
                                />
                                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                            </div>

                            {/* City */}
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="City"
                                />
                            </div>

                            {/* Service */}
                            <div className="space-y-2">
                                <Label htmlFor="service">Service</Label>
                                <Select
                                    value={formData.service_id?.toString()}
                                    onValueChange={(value) => setFormData({ ...formData, service_id: parseInt(value) })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a service" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {servicesLoading ? (
                                            <SelectItem value="loading" disabled>
                                                Loading services...
                                            </SelectItem>
                                        ) : services.length === 0 ? (
                                            <SelectItem value="empty" disabled>
                                                No services available
                                            </SelectItem>
                                        ) : (
                                            services.map((service: Service) => (
                                                <SelectItem key={service.id} value={service.id.toString()}>
                                                    {service.name}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Budget */}
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="budget">Budget</Label>
                                <Input
                                    id="budget"
                                    value={formData.budget}
                                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                    placeholder="Enter budget amount"
                                />
                            </div>

                            {/* Lead Details/Notes */}
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="detail">Lead Details</Label>
                                <Textarea
                                    id="detail"
                                    value={formData.detail}
                                    onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
                                    placeholder="Add details about the lead's requirements..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Call Notes Section - Separate from lead details */}
                    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                        <h3 className="text-sm font-semibold">Call Notes <span className="text-destructive">*</span></h3>

                        <div className="space-y-2">
                            <Label htmlFor="callNotes">Notes about this call</Label>
                            <Textarea
                                id="callNotes"
                                value={callNotes}
                                onChange={(e) => setCallNotes(e.target.value)}
                                placeholder="Take notes about this call... What was discussed? Next steps? Any commitments made?"
                                rows={6}
                                className={errors.callNotes ? 'border-destructive' : ''}
                                autoFocus
                            />
                            {errors.callNotes && <p className="text-xs text-destructive">{errors.callNotes}</p>}
                            <p className="text-xs text-muted-foreground">
                                These notes will be saved as a call activity in the lead's timeline.
                            </p>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Close
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !callNotes.trim()}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save & Update Lead
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
