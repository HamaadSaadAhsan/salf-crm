import { updateAdvisorStage, update as updateLead } from '@/actions/App/Http/Controllers/Leads/LeadController';
import { InlineEdit } from '@/components/inline-edit';
import { ResponsiveSelect } from '@/components/responsive-select';
import TagInput from '@/components/tag-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCityOptions, useCountryOptions } from '@/hooks/useLocation';
import { formatDate } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import type { CustomFields, Lead, LeadStatus } from '@/types/lead';
import { router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import axios from 'axios';
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
    Activity,
    ArrowRight,
    Briefcase,
    Calendar,
    Check,
    ChevronRight,
    ChevronsUpDown,
    Clock,
    DollarSign,
    FileText,
    Flag,
    Globe,
    Link2,
    Mail,
    MapPin,
    Plus,
    RotateCcw,
    Tag,
    Tags,
    User,
    X,
    XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type TagValue = string | { label: string; value: string; color?: string };

type Status = {
    id: number;
    name: string;
    color: string;
    order: number;
};

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

// Statuses where city/country should not be editable
const QUALIFIED_STATUSES: LeadStatus[] = ['qualified', 'proposal', 'converted', 'won'];

// CountrySelect component
function CountrySelect({
    value,
    options,
    isLoading,
    onSelect,
}: {
    value: string;
    options: Array<{ value: string; label: string }>;
    isLoading: boolean;
    onSelect: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const selectedLabel = options.find((o) => o.value === value)?.label || '';

    return (
        <ResponsiveSelect
            open={open}
            onOpenChange={setOpen}
            title="Select Country"
            trigger={
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto min-h-[24px] justify-start px-0 py-0 text-sm font-normal hover:bg-transparent"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <span className="text-muted-foreground">Loading...</span>
                    ) : value ? (
                        selectedLabel || value
                    ) : (
                        <span className="text-muted-foreground">Select country</span>
                    )}
                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            }
        >
            <Command>
                <CommandInput placeholder="Search country..." />
                <CommandList>
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup>
                        {options.map((option) => (
                            <CommandItem
                                key={option.value}
                                value={option.label}
                                onSelect={() => {
                                    onSelect(option.value);
                                    setOpen(false);
                                }}
                            >
                                <Check className={cn('mr-2 h-4 w-4', value === option.value ? 'opacity-100' : 'opacity-0')} />
                                {option.label}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </ResponsiveSelect>
    );
}

// CitySelect component
function CitySelect({
    value,
    options,
    isLoading,
    disabled,
    onSelect,
}: {
    value: string;
    options: Array<{ value: string; label: string }>;
    isLoading: boolean;
    disabled?: boolean;
    onSelect: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const selectedLabel = options.find((o) => o.value === value)?.label || '';

    if (disabled) {
        return <span className="text-sm text-muted-foreground">Select country first</span>;
    }

    return (
        <ResponsiveSelect
            open={open}
            onOpenChange={setOpen}
            title="Select City"
            trigger={
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto min-h-[24px] justify-start px-0 py-0 text-sm font-normal hover:bg-transparent"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <span className="text-muted-foreground">Loading...</span>
                    ) : value ? (
                        selectedLabel || value
                    ) : (
                        <span className="text-muted-foreground">Select city</span>
                    )}
                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            }
        >
            <Command>
                <CommandInput placeholder="Search city..." />
                <CommandList>
                    <CommandEmpty>No city found.</CommandEmpty>
                    <CommandGroup>
                        {options.map((option) => (
                            <CommandItem
                                key={option.value}
                                value={option.label}
                                onSelect={() => {
                                    onSelect(option.value);
                                    setOpen(false);
                                }}
                            >
                                <Check className={cn('mr-2 h-4 w-4', value === option.value ? 'opacity-100' : 'opacity-0')} />
                                {option.label}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </ResponsiveSelect>
    );
}

// Statuses allowed when lead is assigned to an advisor
const ADVISOR_ALLOWED_STATUSES = ['requalify', 'won', 'lost'];

// Advisor stage transition map
const ADVISOR_STAGE_TRANSITIONS: Record<string, { next: string; label: string } | null> = {
    new: { next: 'contacted', label: 'Mark Contacted' },
    contacted: { next: 'meeting', label: 'Set Meeting' },
    meeting: { next: 'contract_signed', label: 'Contract Signed' },
    contract_signed: { next: 'initial_payment', label: 'Initial Payment' },
    initial_payment: { next: 'won', label: 'Mark Won' },
};

const ADVISOR_STAGE_LABELS: Record<string, string> = {
    new: 'New',
    contacted: 'Contacted',
    meeting: 'Meeting',
    contract_signed: 'Contract Signed',
    initial_payment: 'Initial Payment',
    won: 'Won',
    lost: 'Lost',
};

function AdvisorStageProgression({ lead, onStageUpdated }: { lead: Lead; onStageUpdated: () => void }) {
    const { auth } = usePage<SharedData>().props;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showLostDialog, setShowLostDialog] = useState(false);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [showRequalifyDialog, setShowRequalifyDialog] = useState(false);
    const [lostReason, setLostReason] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [requalifyReason, setRequalifyReason] = useState('');

    const currentStage = lead.advisor_stage ?? 'new';
    const isTerminal = currentStage === 'won' || currentStage === 'lost';
    const transition = ADVISOR_STAGE_TRANSITIONS[currentStage];

    // Only assigned advisor or admin can progress
    const isAdmin = auth.user.roles?.some((r) => ['super-admin', 'admin', 'manager', 'team-lead'].includes(r.name));
    const isAssignedAdvisor = auth.user.id === lead.assigned_to?.data?.id;
    const canProgress = isAdmin || isAssignedAdvisor;

    const submitStageChange = async (stage: string, extra: Record<string, unknown> = {}) => {
        setIsSubmitting(true);
        try {
            await axios.put(updateAdvisorStage.url(lead.id), { stage, ...extra });
            toast.success(`Stage updated to ${ADVISOR_STAGE_LABELS[stage] ?? stage}`);
            onStageUpdated();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to update stage';
            if (axios.isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNextStage = () => {
        if (!transition) return;

        if (transition.next === 'initial_payment') {
            setShowPaymentDialog(true);
            return;
        }

        submitStageChange(transition.next);
    };

    const handleMarkLost = () => {
        setShowLostDialog(true);
    };

    const handleRequalify = () => {
        setShowRequalifyDialog(true);
    };

    const confirmRequalify = async () => {
        if (!requalifyReason.trim()) return;
        setIsSubmitting(true);
        try {
            await axios.put(updateLead.url(lead.id), {
                inquiry_status: 'requalify',
                requalify_reason: requalifyReason,
            });
            toast.success('Lead sent back for requalification');
            onStageUpdated();
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Failed to requalify lead');
            }
        } finally {
            setIsSubmitting(false);
            setShowRequalifyDialog(false);
            setRequalifyReason('');
        }
    };

    const confirmLost = () => {
        if (!lostReason.trim()) return;
        submitStageChange('lost', { reason: lostReason });
        setShowLostDialog(false);
        setLostReason('');
    };

    const confirmPayment = () => {
        if (!paymentAmount || Number(paymentAmount) < 0) return;
        submitStageChange('initial_payment', { initial_payment_amount: Number(paymentAmount) });
        setShowPaymentDialog(false);
        setPaymentAmount('');
    };

    return (
        <>
            <div className="flex items-start gap-2 text-sm">
                <Flag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">Advisor Stage</span>
                    <Badge variant={isTerminal ? (currentStage === 'won' ? 'primary' : 'destructive') : 'secondary'} className="w-fit">
                        {ADVISOR_STAGE_LABELS[currentStage] ?? currentStage}
                    </Badge>
                    {canProgress && !isTerminal && transition && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleNextStage} disabled={isSubmitting}>
                                <ArrowRight className="h-3 w-3" />
                                {transition.label}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={handleRequalify} disabled={isSubmitting}>
                                <RotateCcw className="h-3 w-3" />
                                Requalify
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                                onClick={handleMarkLost}
                                disabled={isSubmitting}
                            >
                                <XCircle className="h-3 w-3" />
                                Lost
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Lost Reason Dialog */}
            <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Mark Lead as Lost</DialogTitle>
                        <DialogDescription>Please provide a reason for marking this lead as lost.</DialogDescription>
                    </DialogHeader>
                    <Textarea placeholder="Enter reason..." value={lostReason} onChange={(e) => setLostReason(e.target.value)} rows={3} />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowLostDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmLost} disabled={!lostReason.trim() || isSubmitting}>
                            Confirm Lost
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Initial Payment Dialog */}
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Initial Payment</DialogTitle>
                        <DialogDescription>Enter the initial payment amount received from the client.</DialogDescription>
                    </DialogHeader>
                    <Input type="number" placeholder="Amount" min={0} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmPayment} disabled={!paymentAmount || Number(paymentAmount) < 0 || isSubmitting}>
                            Confirm Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Requalify Reason Dialog */}
            <Dialog open={showRequalifyDialog} onOpenChange={setShowRequalifyDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Requalify Lead</DialogTitle>
                        <DialogDescription>Please provide a reason for sending this lead back for requalification.</DialogDescription>
                    </DialogHeader>
                    <Textarea placeholder="Enter reason..." value={requalifyReason} onChange={(e) => setRequalifyReason(e.target.value)} rows={3} />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRequalifyDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmRequalify} disabled={!requalifyReason.trim() || isSubmitting}>
                            Confirm Requalify
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export function LeadExtendedDetails({ lead, onLeadUpdated }: { lead: Lead; onLeadUpdated?: () => void }) {
    const [model, setModel] = useState<Lead>(lead);
    const [tags, setTags] = useState<TagValue[]>(lead.tags ?? []);
    const [sources, setSources] = useState<Array<{ value: string; label: string }>>([]);
    const [services, setServices] = useState<Array<{ value: string; label: string }>>([]);
    const [statuses, setStatuses] = useState<Array<{ value: string; label: string; color: string }>>([]);
    const [users, setUsers] = useState<Array<{ value: string; label: string }>>([]);
    const [isLeadInfoOpen, setIsLeadInfoOpen] = useState(true);
    const [isAdditionalOpen, setIsAdditionalOpen] = useState(false);
    const [newCustomFieldKey, setNewCustomFieldKey] = useState('');

    // Status reason dialog state (for lost/requalify via InlineEdit)
    const [statusReasonDialogOpen, setStatusReasonDialogOpen] = useState(false);
    const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null);
    const [statusReason, setStatusReason] = useState('');
    const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

    // Location hooks for countries and cities
    const { options: countryOptions, isLoading: isLoadingCountries } = useCountryOptions();
    const { options: cityOptions, isLoading: isLoadingCities } = useCityOptions(model.country || null);

    // Check if lead is qualified (city/country should not be editable)
    const isQualified = useMemo(() => {
        return model.inquiry_status ? QUALIFIED_STATUSES.includes(model.inquiry_status) : false;
    }, [model.inquiry_status]);

    // Check if lead is assigned to an advisor (CROs cannot edit details)
    const isAssignedToAdvisor = model.inquiry_status === 'assigned_to_advisor';

    // Check user roles
    const { auth } = usePage<SharedData>().props;
    const currentUserRoles = auth.user.roles?.map((r) => r.name) ?? [];
    const isAdmin = currentUserRoles.some((r) => ['super-admin', 'admin', 'manager', 'team-lead'].includes(r));
    const isCRO = !isAdmin && currentUserRoles.some((r) => ['support-agent', 'senior-support-agent'].includes(r));
    const isAdvisor = !isAdmin && currentUserRoles.some((r) => ['sales-rep', 'senior-sales-rep'].includes(r));
    const isProcessing = currentUserRoles.includes('processing');

    // CROs cannot edit lead details when assigned to advisor; processing users are always read-only
    const isReadOnly = isProcessing || (isCRO && isAssignedToAdvisor);

    // Check if current user can change assignments (admin roles only)
    const canChangeAssignment = currentUserRoles.some((r) => ['super-admin', 'admin', 'manager', 'team-lead'].includes(r));

    // Sync local state when lead prop changes (e.g., after Inertia reload)
    useEffect(() => {
        setModel(lead);
        setTags(lead.tags ?? []);
    }, [lead]);

    useEffect(() => {
        if (isAdditionalOpen) {
            setIsLeadInfoOpen(false);
        }
    }, [isAdditionalOpen]);

    useEffect(() => {
        if (isLeadInfoOpen) {
            setIsAdditionalOpen(false);
        }
    }, [isLeadInfoOpen]);

    // Reload lead data from server
    const reloadLead = useCallback(() => {
        router.reload({
            only: ['lead'],
            onSuccess: () => {
                onLeadUpdated?.();
            },
        });
    }, [onLeadUpdated]);

    // Listen for lead qualified events on this specific lead
    useEcho(`lead.${lead.id}`, '.lead.qualified', () => {
        console.log('Lead qualified event received for lead:', lead.id);
        reloadLead();
    });

    // Listen for lead assigned events on this specific lead
    useEcho(`lead.${lead.id}`, '.lead.assigned', () => {
        console.log('Lead assigned event received for lead:', lead.id);
        reloadLead();
    });

    // Listen for generic lead updated events
    useEcho(`lead.${lead.id}`, '.lead.updated', () => {
        console.log('Lead updated event received for lead:', lead.id);
        reloadLead();
    });

    useEffect(() => {
        // Fetch lead sources
        axios
            .get('/sources')
            .then((response) => {
                if (response.data?.data) {
                    setSources(
                        response.data.data.map((source: { id: number; name: string }) => ({
                            value: String(source.id),
                            label: source.name,
                        })),
                    );
                }
            })
            .catch(console.error);

        // Fetch services
        axios
            .get('/services')
            .then((response) => {
                if (response.data?.data) {
                    setServices(
                        response.data.data.map((service: { id: number; name: string }) => ({
                            value: String(service.id),
                            label: service.name,
                        })),
                    );
                }
            })
            .catch(console.error);

        // Fetch statuses from database
        // Note: 'assigned_to_advisor' is not in this list - it's automatically set by the system
        axios
            .get('/statuses')
            .then((response) => {
                if (response.data?.data) {
                    setStatuses(
                        response.data.data.map((status: Status) => ({
                            value: status.name,
                            label: status.name.charAt(0).toUpperCase() + status.name.slice(1).replace(/_/g, ' '),
                            color: status.color,
                        })),
                    );
                }
            })
            .catch(console.error);

        // Fetch users for assignment (only if user can change assignments)
        if (canChangeAssignment) {
            axios
                .get('/api/users', { params: { per_page: 100 } })
                .then((response) => {
                    if (response.data?.data) {
                        setUsers(
                            response.data.data.map((user: { id: number; name: string; email: string }) => ({
                                value: String(user.id),
                                label: user.name,
                            })),
                        );
                    }
                })
                .catch(console.error);
        }
    }, [canChangeAssignment]);

    const save = (patch: Partial<Lead>) => {
        const payload = {
            name: patch.name ?? model.name,
            email: patch.email ?? model.email,
            inquiry_status: patch.inquiry_status ?? model.inquiry_status,
        };

        // When qualifying or requalifying, the current user loses access to this lead
        // (lead gets reassigned to advisor/CRO), so redirect to /leads
        const losesAccess = patch.inquiry_status === 'qualified' || patch.inquiry_status === 'requalify';

        router.put(`/leads/${model.id}`, payload, {
            preserveScroll: !losesAccess,
            preserveState: !losesAccess,
            only: losesAccess ? undefined : ['lead'],
            onSuccess: (page) => {
                if (losesAccess) {
                    router.visit('/leads');
                    return;
                }
                const leadData = (page.props as { lead?: Lead }).lead;
                if (leadData) {
                    setModel(leadData);
                } else {
                    setModel((prev) => ({ ...prev, ...patch }));
                }
            },
        });
    };

    const handleStatusChange = (newStatus: string) => {
        if (newStatus === 'lost' || newStatus === 'requalify') {
            setPendingStatusChange(newStatus);
            setStatusReason('');
            setStatusReasonDialogOpen(true);
            return;
        }
        save({ inquiry_status: newStatus as LeadStatus });
    };

    const confirmStatusChange = async () => {
        if (!pendingStatusChange || !statusReason.trim()) return;
        setIsSubmittingStatus(true);
        try {
            const payload: Record<string, string> = { inquiry_status: pendingStatusChange };
            if (pendingStatusChange === 'lost') {
                payload.loss_reason = statusReason.trim();
            } else if (pendingStatusChange === 'requalify') {
                payload.requalify_reason = statusReason.trim();
            }
            await axios.put(updateLead.url(model.id), payload);
            toast.success(pendingStatusChange === 'lost' ? 'Lead marked as lost' : 'Lead sent back for requalification');

            // Requalify reassigns lead to CRO, so current user loses access
            if (pendingStatusChange === 'requalify') {
                router.visit('/leads');
                return;
            }

            reloadLead();
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Failed to update status');
            }
        } finally {
            setIsSubmittingStatus(false);
            setStatusReasonDialogOpen(false);
            setPendingStatusChange(null);
            setStatusReason('');
        }
    };

    const saveService = (serviceId: string) => {
        router.put(
            `/leads/${model.id}`,
            {
                service_id: serviceId ? Number(serviceId) : null,
            },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['lead'],
                onSuccess: (page) => {
                    const leadData = (page.props as { lead?: Lead }).lead;
                    if (leadData) {
                        setModel(leadData);
                    }
                },
            },
        );
    };

    const saveSource = (sourceId: string) => {
        router.put(
            `/leads/${model.id}`,
            {
                lead_source_id: sourceId ? Number(sourceId) : null,
            },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['lead'],
                onSuccess: (page) => {
                    const leadData = (page.props as { lead?: Lead }).lead;
                    if (leadData) {
                        setModel(leadData);
                    }
                },
            },
        );
    };

    const saveAssignedTo = (userId: string) => {
        router.put(
            `/leads/${model.id}`,
            {
                assigned_to: userId ? Number(userId) : null,
            },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['lead'],
                onSuccess: (page) => {
                    const leadData = (page.props as { lead?: Lead }).lead;
                    if (leadData) {
                        setModel(leadData);
                    }
                },
            },
        );
    };

    const saveTags = (newTags: TagValue[]) => {
        router.put(
            `/leads/${model.id}`,
            {
                name: model.name,
                email: model.email,
                inquiry_status: model.inquiry_status,
                tags: newTags,
            },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['lead'],
                onSuccess: () => {
                    setTags(newTags);
                },
            },
        );
    };

    // Helper to format date
    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return formatDate(d);
        } catch {
            return dateStr;
        }
    };

    // Helper to format relative time (e.g., "2 hours ago")
    const formatRelativeTime = (dateStr: string | null) => {
        if (!dateStr) return '—';
        try {
            return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
        } catch {
            return dateStr;
        }
    };

    // Save additional details
    const saveField = (field: string, value: string | null) => {
        router.put(
            `/leads/${model.id}`,
            {
                [field]: value,
            },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['lead'],
                onSuccess: (page) => {
                    const leadData = (page.props as { lead?: Lead }).lead;
                    if (leadData) {
                        setModel(leadData);
                    }
                },
            },
        );
    };

    // Save custom field - preserves original type (array, number, etc.)
    const saveCustomField = (key: string, value: string | null) => {
        const originalValue = model.custom_fields?.[key];

        let parsedValue: string | number | string[] | number[] | null = value;

        if (value) {
            // If original was an array, try to parse back to array
            if (Array.isArray(originalValue)) {
                const items = value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                // If original array contained numbers, convert back to numbers
                if (originalValue.length > 0 && typeof originalValue[0] === 'number') {
                    parsedValue = items.map((s) => Number(s)).filter((n) => !isNaN(n));
                } else {
                    parsedValue = items;
                }
            }
            // If original was a number, try to parse back to number
            else if (typeof originalValue === 'number') {
                const num = Number(value);
                parsedValue = isNaN(num) ? value : num;
            }
        }

        const updatedCustomFields: CustomFields = {
            ...(model.custom_fields || {}),
            [key]: parsedValue || null,
        };
        // Remove null values
        if (!value) {
            delete updatedCustomFields[key];
        }
        router.put(
            `/leads/${model.id}`,
            {
                custom_fields: updatedCustomFields as Record<string, string | number | boolean | string[] | number[] | null>,
            },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['lead'],
                onSuccess: (page) => {
                    const leadData = (page.props as { lead?: Lead }).lead;
                    if (leadData) {
                        setModel(leadData);
                    }
                },
            },
        );
    };

    // Add new custom field
    const addCustomField = () => {
        if (!newCustomFieldKey.trim()) return;
        const key = newCustomFieldKey.trim().toLowerCase().replace(/\s+/g, '_');
        saveCustomField(key, '');
        setNewCustomFieldKey('');
    };

    // Remove custom field
    const removeCustomField = (key: string) => {
        const updatedCustomFields: CustomFields = { ...(model.custom_fields || {}) };
        delete updatedCustomFields[key];
        router.put(
            `/leads/${model.id}`,
            {
                custom_fields: updatedCustomFields as Record<string, string | number | boolean | string[] | number[] | null>,
            },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['lead'],
                onSuccess: (page) => {
                    const leadData = (page.props as { lead?: Lead }).lead;
                    if (leadData) {
                        setModel(leadData);
                    }
                },
            },
        );
    };

    // CRO-specific statuses
    const CRO_NEW_STATUSES = ['new', 'contacted', 'qualified', 'nurturing', 'lost'];
    const CRO_REQUALIFY_STATUSES = ['requalify', 'contacted', 'qualified', 'nurturing', 'lost'];

    // Get status options - filter based on role and current state
    const getStatusOptions = () => {
        let filtered = statuses.filter((s) => s.value !== 'assigned_to_advisor');

        if (isCRO) {
            if (isAssignedToAdvisor) {
                // CRO can requalify, mark won, or lost when lead is with advisor
                filtered = filtered.filter((s) => ADVISOR_ALLOWED_STATUSES.includes(s.value));
            } else if (model.inquiry_status === 'requalify') {
                // Requalified leads skip 'new' — CRO re-processes from requalify onward
                filtered = filtered.filter((s) => CRO_REQUALIFY_STATUSES.includes(s.value));
            } else {
                filtered = filtered.filter((s) => CRO_NEW_STATUSES.includes(s.value));
            }
        } else if (isAdvisor && isAssignedToAdvisor) {
            // Advisors use stage progression, not status dropdown
            filtered = [];
        }

        return filtered;
    };

    return (
        <>
            <div className="space-y-2">
                {/* Lead Information Section - Collapsible */}
                <Collapsible open={isLeadInfoOpen} onOpenChange={setIsLeadInfoOpen}>
                    <CollapsibleTrigger asChild>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-semibold -ms-1.5 ps-1.5 text-sm hover:bg-accent [&:not(:hover)[data-state=open]]:bg-transparent"
                        >
                            <ChevronRight className={cn('h-4 w-4 transition-transform', isLeadInfoOpen && 'rotate-90')} />
                            Lead Information
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                        <div className="space-y-2">
                            {/* Email */}
                            <div className="flex items-start gap-2 text-sm">
                                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Email</span>
                                    <InlineEdit value={model.email ?? ''} placeholder="—" readonly onSave={() => {}} />
                                </div>
                            </div>

                            {/* Status */}
                            <div className="flex items-start gap-2 text-sm">
                                <Tag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Status</span>
                                    {isAssignedToAdvisor && isAdvisor ? (
                                        <span className="text-sm capitalize">Assigned to Advisor</span>
                                    ) : statuses.length > 0 && getStatusOptions().length > 0 ? (
                                        <InlineEdit
                                            type="select"
                                            options={getStatusOptions()}
                                            value={model.inquiry_status}
                                            format={(v) => v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ')}
                                            onSave={(v) => handleStatusChange(v)}
                                        />
                                    ) : (
                                        <span className="text-sm capitalize">{model.inquiry_status?.replace(/_/g, ' ') ?? '-'}</span>
                                    )}
                                </div>
                            </div>

                            {/* Service */}
                            <div className="flex items-start gap-2 text-sm">
                                <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Service</span>
                                    {isReadOnly ? (
                                        <span className="text-sm">{model.service?.data?.name || '—'}</span>
                                    ) : services.length > 0 ? (
                                        <InlineEdit
                                            type="select"
                                            options={services}
                                            value={model.service?.data?.id ? String(model.service.data.id) : ''}
                                            placeholder="Select service"
                                            onSave={saveService}
                                        />
                                    ) : (
                                        <span className="text-sm">{model.service?.data?.name || '—'}</span>
                                    )}
                                </div>
                            </div>

                            {/* Source */}
                            <div className="flex items-start gap-2 text-sm">
                                <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Source</span>
                                    {isReadOnly ? (
                                        <span className="text-sm">{model.source?.data?.name || '—'}</span>
                                    ) : sources.length > 0 ? (
                                        <InlineEdit
                                            type="select"
                                            options={sources}
                                            value={model.source?.data?.id ? String(model.source.data.id) : ''}
                                            placeholder="Select source"
                                            onSave={saveSource}
                                        />
                                    ) : (
                                        <span className="text-sm">{model.source?.data?.name || '—'}</span>
                                    )}
                                </div>
                            </div>

                            {/* Budget */}
                            <div className="flex items-start gap-2 text-sm">
                                <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Budget</span>
                                    <span className="text-sm font-medium">{model.formatted_budget || '—'}</span>
                                </div>
                            </div>

                            {/* Advisor Stage (when assigned to advisor) */}
                            {isAssignedToAdvisor && <AdvisorStageProgression lead={model} onStageUpdated={reloadLead} />}

                            {/* Priority */}
                            <div className="flex items-start gap-2 text-sm">
                                <Flag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Priority</span>
                                    {isReadOnly ? (
                                        <span className="text-sm capitalize">{model.priority || '—'}</span>
                                    ) : (
                                        <InlineEdit
                                            type="select"
                                            options={[
                                                { value: 'high', label: 'High' },
                                                { value: 'medium', label: 'Medium' },
                                                { value: 'low', label: 'Low' },
                                            ]}
                                            value={model.priority ?? ''}
                                            placeholder="Set priority"
                                            onSave={(v) => saveField('priority', v || null)}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Country */}
                            <div className="flex items-start gap-2 text-sm">
                                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Country</span>
                                    {isQualified || isReadOnly ? (
                                        <span className="text-sm">
                                            {countryOptions.find((c) => c.value === model.country)?.label || model.country || '—'}
                                        </span>
                                    ) : (
                                        <CountrySelect
                                            value={model.country ?? ''}
                                            options={countryOptions}
                                            isLoading={isLoadingCountries}
                                            onSelect={(v) => {
                                                // Clear city when country changes
                                                if (v !== model.country) {
                                                    saveField('city', null);
                                                }
                                                saveField('country', v || null);
                                            }}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* City */}
                            <div className="flex items-start gap-2 text-sm">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">City</span>
                                    {isQualified || isReadOnly ? (
                                        <span className="text-sm">{model.city || '—'}</span>
                                    ) : (
                                        <CitySelect
                                            value={model.city ?? ''}
                                            options={cityOptions}
                                            isLoading={isLoadingCities}
                                            disabled={!model.country}
                                            onSelect={(v) => saveField('city', v || null)}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Assigned To */}
                            <div className="flex items-start gap-2 text-sm">
                                <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs text-muted-foreground">Assigned To</span>
                                    {canChangeAssignment && users.length > 0 ? (
                                        <div className="flex flex-col gap-1">
                                            <InlineEdit
                                                type="select"
                                                options={[{ value: '', label: 'Unassigned' }, ...users]}
                                                value={model.assigned_to?.data?.id ? String(model.assigned_to.data.id) : ''}
                                                placeholder="Select user"
                                                onSave={saveAssignedTo}
                                            />
                                            {model.assigned_to?.data?.roles && model.assigned_to.data.roles.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {model.assigned_to.data.roles.map((role) => (
                                                        <Badge key={role.id} variant="secondary" className="text-xs capitalize">
                                                            {role.name.replace(/-/g, ' ')}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : model.assigned_to?.data ? (
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium">{model.assigned_to.data.name}</span>
                                            {model.assigned_to.data.roles && model.assigned_to.data.roles.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {model.assigned_to.data.roles.map((role) => (
                                                        <Badge key={role.id} variant="secondary" className="text-xs capitalize">
                                                            {role.name.replace(/-/g, ' ')}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">Unassigned</span>
                                    )}
                                </div>
                            </div>

                            {/* Qualified By */}
                            {(model.qualified_by?.data || isAssignedToAdvisor) && (
                                <div className="flex items-start gap-2 text-sm">
                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">Qualified By</span>
                                        {model.qualified_by?.data ? (
                                            <>
                                                <span className="font-medium">{model.qualified_by.data.name}</span>
                                                {model.qualified_at && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(parseISO(model.qualified_at), { addSuffix: true })}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground">Not recorded</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Owner */}
                            {model.owner && (
                                <div className="flex items-start gap-2 text-sm">
                                    <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">Owner</span>
                                        <span>{model.owner.name}</span>
                                    </div>
                                </div>
                            )}

                            {/* Created */}
                            <div className="flex items-start gap-2 text-sm">
                                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Created</span>
                                    <span className="text-sm">{formatDateTime(model.created_at)}</span>
                                </div>
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                {/* Additional Details - Collapsible */}
                <Collapsible open={isAdditionalOpen} onOpenChange={setIsAdditionalOpen}>
                    <CollapsibleTrigger asChild>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-semibold -ms-1.5 ps-1.5 text-sm hover:bg-accent [&:not(:hover)[data-state=open]]:bg-transparent"
                        >
                            <ChevronRight className={cn('h-4 w-4 transition-transform', isAdditionalOpen && 'rotate-90')} />
                            Additional Details
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                        <div className="space-y-2">
                            {/* Occupation */}
                            <div className="flex items-start gap-2 text-sm">
                                <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Occupation</span>
                                    <InlineEdit
                                        value={model.occupation ?? ''}
                                        placeholder="Add occupation"
                                        onSave={(v) => saveField('occupation', v || null)}
                                    />
                                </div>
                            </div>

                            {/* Inquiry Type */}
                            <div className="flex items-start gap-2 text-sm">
                                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Inquiry Type</span>
                                    <InlineEdit
                                        value={model.inquiry_type ?? ''}
                                        placeholder="Add inquiry type"
                                        onSave={(v) => saveField('inquiry_type', v || null)}
                                    />
                                </div>
                            </div>

                            {/* Next Follow-up */}
                            {model.next_follow_up_at && (
                                <div className="flex items-start gap-2 text-sm">
                                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">Next Follow-up</span>
                                        <span className="text-sm">{formatDateTime(model.next_follow_up_at)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Last Activity */}
                            {model.last_activity_at && (
                                <div className="flex items-start gap-2 text-sm">
                                    <Activity className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">Last Activity</span>
                                        <span className="text-sm">{formatRelativeTime(model.last_activity_at)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Custom Fields - Editable */}
                            <div className="pt-2">
                                <span className="text-xs font-medium text-muted-foreground">Custom Fields</span>
                                <div className="mt-2 space-y-2">
                                    {model.custom_fields &&
                                        Object.entries(model.custom_fields).map(([key, value]) => {
                                            if (value === null || value === undefined) return null;
                                            const stringValue = Array.isArray(value) ? value.join(', ') : String(value);
                                            return (
                                                <div key={key} className="group flex items-center-safe gap-2 text-sm">
                                                    <span className="min-w-20 pt-0.5 text-xs text-muted-foreground capitalize">
                                                        {key.replace(/_/g, ' ')}
                                                    </span>
                                                    <InlineEdit
                                                        value={stringValue}
                                                        placeholder={`Add ${key.replace(/_/g, ' ')}`}
                                                        onSave={(v) => saveCustomField(key, v || null)}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="inverse"
                                                        onClick={() => removeCustomField(key)}
                                                        className="-mt-0.5 p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                                                        title={`Remove ${key.replace(/_/g, ' ')}`}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            );
                                        })}

                                    {/* Add new custom field */}
                                    <div className="flex items-center gap-2 pt-1">
                                        <input
                                            type="text"
                                            value={newCustomFieldKey}
                                            onChange={(e) => setNewCustomFieldKey(e.target.value)}
                                            placeholder="New field name"
                                            className="w-32 rounded border border-input bg-background px-2 py-1 text-xs"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    addCustomField();
                                                }
                                            }}
                                        />
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 px-2"
                                            onClick={addCustomField}
                                            disabled={!newCustomFieldKey.trim()}
                                        >
                                            <Plus className="mr-1 h-3 w-3" />
                                            Add
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                {/* Tags Section */}
                <div className="space-y-3">
                    <div className="flex items-start gap-2">
                        <Tags className="mt-5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1">
                            <TagInput label="" value={tags} onChange={saveTags} placeholder="Add tags (press Enter or comma)" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Reason Dialog (for lost/requalify via InlineEdit) */}
            <Dialog open={statusReasonDialogOpen} onOpenChange={setStatusReasonDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {pendingStatusChange === 'lost' ? 'Mark Lead as Lost' : 'Requalify Lead'}
                        </DialogTitle>
                        <DialogDescription>
                            {pendingStatusChange === 'lost'
                                ? 'Please provide a reason for marking this lead as lost.'
                                : 'Please provide a reason for sending this lead back for requalification.'}
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Enter reason..."
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        rows={3}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStatusReasonDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant={pendingStatusChange === 'lost' ? 'destructive' : 'primary'}
                            onClick={confirmStatusChange}
                            disabled={!statusReason.trim() || isSubmittingStatus}
                        >
                            {pendingStatusChange === 'lost' ? 'Confirm Lost' : 'Confirm Requalify'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
