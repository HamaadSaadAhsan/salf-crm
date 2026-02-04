import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import type { ActiveCall } from '@/hooks/useInboundCalls';
import { useCountryOptions, useCityOptions } from '@/hooks/useLocation';
import { cn } from '@/lib/utils';
import { useServices } from '@/lib/useServices';
import type { Service } from '@/types/lead';
import { AlertCircle, Check, ChevronsUpDown, Clock, Loader2, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import React, { useState } from 'react';

interface NewLeadCallDialogProps {
    isOpen: boolean;
    onClose: () => void;
    call: ActiveCall;
    onUpdateLead: (
        leadId: string,
        data: {
            name?: string;
            email?: string;
            city?: string;
            country?: string;
            service_id?: number;
            detail?: string;
            budget?: {
                amount: number;
            };
        },
        callNotes: string,
        duration: number,
        callInfo?: { uniqueid: string; caller: string }
    ) => Promise<void>;
    onCreateLead: (
        data: {
            name: string;
            phone: string;
            email?: string;
            city?: string;
            country?: string;
            service_id?: number;
            detail?: string;
            budget?: {
                amount: number;
            };
        },
        callNotes: string,
        duration: number,
        sessionId: string,
        callInfo?: { uniqueid: string; caller: string }
    ) => Promise<void>;
}

export function NewLeadCallDialog({ isOpen, onClose, call, onUpdateLead, onCreateLead }: NewLeadCallDialogProps) {
    const isNewLead = !call.lead;
    const { services, loading: servicesLoading } = useServices();

    // Determine call direction - check both new and legacy fields
    const isOutboundCall = call.direction === 'outbound' || call.call_direction === 'outbound';
    const callDirectionLabel = isOutboundCall ? 'Outbound Call' : 'Incoming Call';
    const { options: countryOptions, isLoading: isLoadingCountries } = useCountryOptions();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [duration, setDuration] = useState(0);
    const [countryOpen, setCountryOpen] = useState(false);
    const [cityOpen, setCityOpen] = useState(false);
    const [serviceOpen, setServiceOpen] = useState(false);

    // Initialize form data with existing lead data if available
    const getInitialFormData = React.useCallback(() => {
        if (call.lead) {
            return {
                name: call.lead.name || '',
                phone: call.lead.phone || call.caller,
                email: call.lead.email || '',
                city: call.lead.city || '',
                country: call.lead.country || '',
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
            country: '',
            service_id: undefined as number | undefined,
            detail: '',
            budget: '',
        };
    }, [call.lead, call.caller]);

    const [formData, setFormData] = useState(getInitialFormData);
    const [callNotes, setCallNotes] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const { options: cityOptions, isLoading: isLoadingCities } = useCityOptions(formData.country || null);

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
            // Validate that notes are provided
            if (!callNotes.trim()) {
                setErrors({ callNotes: 'Please add notes about this call' });
                setIsSubmitting(false);
                return;
            }

            // Pass call info to ensure it works even if activeCall is cleared
            const callInfo = { uniqueid: call.uniqueid, caller: call.caller };

            if (isNewLead) {
                // Validate required fields for new lead
                if (!formData.name?.trim()) {
                    setErrors({ name: 'Name is required for new leads' });
                    setIsSubmitting(false);
                    return;
                }

                // Create new lead
                await onCreateLead(
                    {
                        name: formData.name,
                        phone: formData.phone,
                        email: formData.email || undefined,
                        city: formData.city || undefined,
                        country: formData.country || undefined,
                        service_id: formData.service_id,
                        detail: formData.detail || undefined,
                        budget: formData.budget && Number(formData.budget) > 0 ? {
                            amount: Number(formData.budget),
                            currency: 'USD',
                        } : undefined,
                    },
                    callNotes,
                    duration,
                    call.sessionId,
                    callInfo
                );
            } else {
                // Update existing lead
                await onUpdateLead(
                    call.lead!.id,
                    {
                        name: formData.name,
                        email: formData.email || undefined,
                        city: formData.city || undefined,
                        country: formData.country || undefined,
                        service_id: formData.service_id,
                        detail: formData.detail || undefined,
                        budget: formData.budget && Number(formData.budget) > 0 ? {
                            amount: Number(formData.budget),
                            currency: call.lead?.budget?.currency || 'USD',
                        } : (call.lead?.budget && (formData.budget === '' || formData.budget === '0') ? null : undefined),
                    },
                    callNotes,
                    duration,
                    callInfo
                );
            }
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

    // Prevent closing dialog on outside click or escape key during active call
    const handleInteractOutside = (e: Event) => {
        e.preventDefault();
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => { /* Prevent closing via onOpenChange */ }}>
            <DialogContent
                className="max-w-2xl max-h-[90vh] overflow-y-auto"
                onInteractOutside={handleInteractOutside}
                onEscapeKeyDown={handleInteractOutside}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isOutboundCall ? (
                            <PhoneOutgoing className="h-5 w-5 text-blue-600" />
                        ) : (
                            <PhoneIncoming className="h-5 w-5 text-green-600" />
                        )}
                        {call.lead?.name
                            ? `${callDirectionLabel} - ${call.lead.name}`
                            : `${callDirectionLabel}`}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(duration)}</span>
                        {isNewLead && !isOutboundCall && (
                            <span className="ml-2 text-amber-600">• New caller - please create lead</span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {/* Coverage Call Notice */}
                {call.isCoverageCall && call.lead?.assigned_to && (
                    <Alert variant="primary" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800 dark:text-amber-400">Coverage Call</AlertTitle>
                        <AlertDescription className="text-amber-700 dark:text-amber-300">
                            You are handling a call for <span className="font-semibold">{call.lead.assigned_to.name}</span>'s lead.
                            A follow-up task has been automatically created for them.
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Lead Information Fields */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">
                            {isNewLead
                                ? 'Create New Lead'
                                : isOutboundCall
                                    ? 'Lead Information'
                                    : 'Update Lead Information'}
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Name {isNewLead && <span className="text-destructive">*</span>}
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter lead name"
                                    className={errors.name ? 'border-destructive' : ''}
                                    autoFocus={isNewLead}
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

                            {/* Country */}
                            <div className="space-y-2">
                                <Label>Country</Label>
                                <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={countryOpen}
                                            className="w-full justify-between font-normal"
                                            disabled={isLoadingCountries}
                                        >
                                            {isLoadingCountries
                                                ? 'Loading...'
                                                : formData.country
                                                    ? countryOptions.find((c) => c.value === formData.country)?.label || formData.country
                                                    : 'Select country'}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search country..." />
                                            <CommandList>
                                                <CommandEmpty>No country found.</CommandEmpty>
                                                <CommandGroup>
                                                    {countryOptions.map((option) => (
                                                        <CommandItem
                                                            key={option.value}
                                                            value={option.label}
                                                            onSelect={() => {
                                                                const newCountry = option.value === formData.country ? '' : option.value;
                                                                setFormData({ ...formData, country: newCountry, city: newCountry !== formData.country ? '' : formData.city });
                                                                setCountryOpen(false);
                                                            }}
                                                        >
                                                            <Check className={cn('mr-2 h-4 w-4', formData.country === option.value ? 'opacity-100' : 'opacity-0')} />
                                                            {option.label}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* City */}
                            <div className="space-y-2">
                                <Label>City</Label>
                                <Popover open={cityOpen} onOpenChange={setCityOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={cityOpen}
                                            className="w-full justify-between font-normal"
                                            disabled={!formData.country || isLoadingCities}
                                        >
                                            {!formData.country
                                                ? 'Select country first'
                                                : isLoadingCities
                                                    ? 'Loading...'
                                                    : formData.city
                                                        ? cityOptions.find((c) => c.value === formData.city)?.label || formData.city
                                                        : 'Select city'}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search city..." />
                                            <CommandList>
                                                <CommandEmpty>No city found.</CommandEmpty>
                                                <CommandGroup>
                                                    {cityOptions.map((option) => (
                                                        <CommandItem
                                                            key={option.value}
                                                            value={option.label}
                                                            onSelect={() => {
                                                                setFormData({ ...formData, city: option.value === formData.city ? '' : option.value });
                                                                setCityOpen(false);
                                                            }}
                                                        >
                                                            <Check className={cn('mr-2 h-4 w-4', formData.city === option.value ? 'opacity-100' : 'opacity-0')} />
                                                            {option.label}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Service (Program) */}
                            <div className="space-y-2">
                                <Label>Program</Label>
                                <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={serviceOpen}
                                            className="w-full justify-between font-normal"
                                            disabled={servicesLoading}
                                        >
                                            {servicesLoading
                                                ? 'Loading...'
                                                : formData.service_id
                                                    ? services.find((s: Service) => s.id === formData.service_id)?.name || 'Select program'
                                                    : 'Select program'}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search program..." />
                                            <CommandList>
                                                <CommandEmpty>No program found.</CommandEmpty>
                                                <CommandGroup>
                                                    {services.map((service: Service) => (
                                                        <CommandItem
                                                            key={service.id}
                                                            value={service.name}
                                                            onSelect={() => {
                                                                setFormData({ ...formData, service_id: service.id === formData.service_id ? undefined : service.id });
                                                                setServiceOpen(false);
                                                            }}
                                                        >
                                                            <Check className={cn('mr-2 h-4 w-4', formData.service_id === service.id ? 'opacity-100' : 'opacity-0')} />
                                                            {service.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
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
                        <Button type="submit" disabled={isSubmitting || !callNotes.trim() || (isNewLead && !formData.name?.trim())}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isNewLead ? 'Create Lead & Save' : isOutboundCall ? 'Save Call Notes' : 'Save & Update Lead'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
