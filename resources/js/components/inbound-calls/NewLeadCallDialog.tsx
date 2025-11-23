import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ActiveCall } from '@/hooks/useInboundCalls';
import { useServices } from '@/lib/useServices';
import type { Service } from '@/types/lead';
import { Loader2, Phone, User } from 'lucide-react';
import React, { useState } from 'react';

interface NewLeadCallDialogProps {
    isOpen: boolean;
    onClose: () => void;
    call: ActiveCall;
    onSubmit: (data: {
        name: string;
        phone: string;
        email?: string;
        city?: string;
        service_id?: number;
        detail?: string;
        budget?: any;
    }) => Promise<void>;
}

export function NewLeadCallDialog({ isOpen, onClose, call, onSubmit }: NewLeadCallDialogProps) {
    console.log('NewLeadCallDialog render:', { isOpen, call });

    const { services, loading: servicesLoading } = useServices();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: call.caller,
        email: '',
        city: '',
        service_id: undefined as number | undefined,
        detail: '',
        budget: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    React.useEffect(() => {
        console.log('NewLeadCallDialog: isOpen changed to', isOpen);
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        // Basic validation
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }
        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone is required';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setIsSubmitting(false);
            return;
        }

        try {
            await onSubmit({
                name: formData.name,
                phone: formData.phone,
                email: formData.email || undefined,
                city: formData.city || undefined,
                service_id: formData.service_id,
                detail: formData.detail || undefined,
                budget: formData.budget ? { amount: formData.budget } : undefined,
            });
            onClose();
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Create New Lead from Call
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span className="font-mono">{call.caller}</span>
                        <span className="text-muted-foreground">→ Extension {call.exten}</span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">
                                Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Enter lead name"
                                className={errors.name ? 'border-destructive' : ''}
                            />
                            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <Label htmlFor="phone">
                                Phone <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="Phone number"
                                className={errors.phone ? 'border-destructive' : ''}
                            />
                            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
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
                        <div className="space-y-2 md:col-span-2">
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
                    </div>

                    {/* Additional Details Section */}
                    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                        <h3 className="text-sm font-semibold">Additional Details</h3>

                        {/* Budget */}
                        <div className="space-y-2">
                            <Label htmlFor="budget">Budget</Label>
                            <Input
                                id="budget"
                                value={formData.budget}
                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                placeholder="Enter budget amount"
                            />
                        </div>

                        {/* Details/Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="detail">Notes</Label>
                            <Textarea
                                id="detail"
                                value={formData.detail}
                                onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
                                placeholder="Add any additional notes about this lead..."
                                rows={4}
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Lead
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
