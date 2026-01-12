import { Separator } from '@/components/ui/separator';
import { Mail, Calendar, Tag, User, Link2, Tags, Briefcase, MapPin, DollarSign, Flag, FileText, Clock, Activity, Plus, X } from 'lucide-react';
import { InlineEdit } from '@/components/inline-edit';
import { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import TagInput from '@/components/tag-input';
import axios from 'axios';
import { formatDate } from '@/lib/helpers';
import { Badge } from '@/components/ui/badge';
import { useEcho } from '@laravel/echo-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type TagValue = string | { label: string; value: string; color?: string };

type Budget = {
    currency: string;
    amount: number;
    type: string;
    timeframe?: string;
};

type CustomFields = {
    family_size?: number;
    children_ages?: number[];
    current_citizenships?: string[];
    investment_experience?: string;
    urgency?: string;
    preferred_regions?: string[];
    language_spoken?: string;
    travel_frequency?: string;
    [key: string]: unknown;
};

type Lead = {
    id: number | string;
    name: string;
    email: string | null;
    phone: string | null;
    occupation: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    status: string;
    inquiry_status: string;
    priority: string | null;
    inquiry_type: string | null;
    lead_score: number | null;
    budget: Budget | null;
    formatted_budget: string | null;
    detail: string | null;
    custom_fields: CustomFields | null;
    next_follow_up_at: string | null;
    last_activity_at: string | null;
    source?: {
        data: {
            id: number;
            name: string;
            slug: string;
        };
    } | null;
    service?: {
        data: {
            id: number;
            name: string;
        };
    } | null;
    tags?: TagValue[];
    assigned_to?: {
        data: {
            id: number;
            name: string;
            email: string;
            roles?: Array<{
                id: number;
                name: string;
                guard_name: string;
            }>;
        };
    } | null;
    owner: {
        id: number;
        name: string;
        email: string;
    } | null;
    created_at: string;
};

type Status = {
    id: number;
    name: string;
    color: string;
    order: number;
};

export function LeadExtendedDetails({ lead, onLeadUpdated }: { lead: Lead; onLeadUpdated?: () => void }) {
    const [model, setModel] = useState<Lead>(lead);
    const [tags, setTags] = useState<TagValue[]>(lead.tags ?? []);
    const [sources, setSources] = useState<Array<{ value: string; label: string }>>([]);
    const [services, setServices] = useState<Array<{ value: string; label: string }>>([]);
    const [statuses, setStatuses] = useState<Array<{ value: string; label: string; color: string }>>([]);
    const [isLeadInfoOpen, setIsLeadInfoOpen] = useState(true);
    const [isAdditionalOpen, setIsAdditionalOpen] = useState(false);
    const [newCustomFieldKey, setNewCustomFieldKey] = useState('');

    // Sync local state when lead prop changes (e.g., after Inertia reload)
    useEffect(() => {
        setModel(lead);
        setTags(lead.tags ?? []);
    }, [lead]);

    useEffect(() => {
        if(isAdditionalOpen){
            setIsLeadInfoOpen(false);
        }
    }, [isAdditionalOpen]);

    useEffect(() => {
        if(isLeadInfoOpen){
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
        axios.get('/sources').then(response => {
            if (response.data?.data) {
                setSources(response.data.data.map((source: { id: number; name: string }) => ({
                    value: String(source.id),
                    label: source.name
                })));
            }
        }).catch(console.error);

        // Fetch services
        axios.get('/services').then(response => {
            if (response.data?.data) {
                setServices(response.data.data.map((service: { id: number; name: string }) => ({
                    value: String(service.id),
                    label: service.name
                })));
            }
        }).catch(console.error);

        // Fetch statuses from database
        // Note: 'assigned_to_advisor' is not in this list - it's automatically set by the system
        axios.get('/statuses').then(response => {
            if (response.data?.data) {
                setStatuses(response.data.data.map((status: Status) => ({
                    value: status.name,
                    label: status.name.charAt(0).toUpperCase() + status.name.slice(1).replace(/_/g, ' '),
                    color: status.color
                })));
            }
        }).catch(console.error);
    }, []);

    const save = (patch: Partial<Lead>) => {
        const payload = {
            name: patch.name ?? model.name,
            email: patch.email ?? model.email,
            inquiry_status: patch.inquiry_status ?? model.inquiry_status
        };

        router.put(`/leads/${model.id}`, payload, {
            preserveScroll: true,
            preserveState: true,
            only: ['lead'],
            onSuccess: () => {
                setModel(prev => ({ ...prev, ...patch }));
            },
        });
    };

    const saveService = (serviceId: string) => {
        router.put(`/leads/${model.id}`, {
            service_id: serviceId ? Number(serviceId) : null,
        }, {
            preserveScroll: true,
            preserveState: true,
            only: ['lead'],
            onSuccess: (page) => {
                const leadData = (page.props as { lead?: Lead }).lead;
                if (leadData) {
                    setModel(leadData);
                }
            },
        });
    };

    const saveSource = (sourceId: string) => {
        router.put(`/leads/${model.id}`, {
            lead_source_id: sourceId ? Number(sourceId) : null,
        }, {
            preserveScroll: true,
            preserveState: true,
            only: ['lead'],
            onSuccess: (page) => {
                const leadData = (page.props as { lead?: Lead }).lead;
                if (leadData) {
                    setModel(leadData);
                }
            },
        });
    };

    const saveTags = (newTags: TagValue[]) => {
        router.put(`/leads/${model.id}`, {
            name: model.name,
            email: model.email,
            inquiry_status: model.inquiry_status,
            tags: newTags,
        }, {
            preserveScroll: true,
            preserveState: true,
            only: ['lead'],
            onSuccess: () => {
                setTags(newTags);
            },
        });
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

    // Save additional details
    const saveField = (field: string, value: string | null) => {
        router.put(`/leads/${model.id}`, {
            [field]: value,
        }, {
            preserveScroll: true,
            preserveState: true,
            only: ['lead'],
            onSuccess: (page) => {
                const leadData = (page.props as { lead?: Lead }).lead;
                if (leadData) {
                    setModel(leadData);
                }
            },
        });
    };

    // Save custom field - preserves original type (array, number, etc.)
    const saveCustomField = (key: string, value: string | null) => {
        const originalValue = model.custom_fields?.[key];

        let parsedValue: unknown = value;

        if (value) {
            // If original was an array, try to parse back to array
            if (Array.isArray(originalValue)) {
                const items = value.split(',').map(s => s.trim()).filter(Boolean);
                // If original array contained numbers, convert back to numbers
                if (originalValue.length > 0 && typeof originalValue[0] === 'number') {
                    parsedValue = items.map(s => {
                        const num = Number(s);
                        return isNaN(num) ? s : num;
                    });
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

        const updatedCustomFields = {
            ...(model.custom_fields || {}),
            [key]: parsedValue || null,
        };
        // Remove null values
        if (!value) {
            delete updatedCustomFields[key];
        }
        router.put(`/leads/${model.id}`, {
            custom_fields: updatedCustomFields,
        }, {
            preserveScroll: true,
            preserveState: true,
            only: ['lead'],
            onSuccess: (page) => {
                const leadData = (page.props as { lead?: Lead }).lead;
                if (leadData) {
                    setModel(leadData);
                }
            },
        });
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
        const updatedCustomFields = { ...(model.custom_fields || {}) };
        delete updatedCustomFields[key];
        router.put(`/leads/${model.id}`, {
            custom_fields: updatedCustomFields,
        }, {
            preserveScroll: true,
            preserveState: true,
            only: ['lead'],
            onSuccess: (page) => {
                const leadData = (page.props as { lead?: Lead }).lead;
                if (leadData) {
                    setModel(leadData);
                }
            },
        });
    };

    // Get status options - includes current status if it's system-managed (so it displays correctly)
    const getStatusOptions = () => {
        // If current status is 'assigned_to_advisor', add it to options for display
        // but note: 'assigned_to_advisor' is NOT in the database statuses table,
        // so users can change FROM it but can't change back TO it
        if (model.inquiry_status === 'assigned_to_advisor') {
            return [
                { value: 'assigned_to_advisor', label: 'Assigned to Advisor', color: '' },
                ...statuses
            ];
        }
        return statuses;
    };

    return (
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
                                {statuses.length > 0 || model.inquiry_status === 'assigned_to_advisor' ? (
                                    <InlineEdit
                                        type="select"
                                        options={getStatusOptions()}
                                        value={model.inquiry_status}
                                        onSave={(v) => save({ inquiry_status: v })}
                                    />
                                ) : (
                                    <span className="text-sm capitalize">{model.inquiry_status.replace(/_/g, ' ')}</span>
                                )}
                            </div>
                        </div>

                        {/* Service */}
                        <div className="flex items-start gap-2 text-sm">
                            <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Service</span>
                                {services.length > 0 ? (
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
                                {sources.length > 0 ? (
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

                        {/* Priority */}
                        <div className="flex items-start gap-2 text-sm">
                            <Flag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Priority</span>
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
                            </div>
                        </div>

                        {/* City */}
                        <div className="flex items-start gap-2 text-sm">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">City</span>
                                <InlineEdit value={model.city ?? ''} placeholder="Add city" onSave={(v) => saveField('city', v || null)} />
                            </div>
                        </div>

                        {/* Country */}
                        <div className="flex items-start gap-2 text-sm">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Country</span>
                                <InlineEdit value={model.country ?? ''} placeholder="Add country" onSave={(v) => saveField('country', v || null)} />
                            </div>
                        </div>

                        {/* Assigned To */}
                        {model.assigned_to?.data && (
                            <div className="flex items-start gap-2 text-sm">
                                <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs text-muted-foreground">Assigned To</span>
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
                                    <span className="text-sm">{formatDateTime(model.last_activity_at)}</span>
                                </div>
                            </div>
                        )}

                        {/* Detail/Notes */}
                        <div className="flex items-start gap-2 text-sm">
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="flex flex-1 flex-col">
                                <span className="text-xs text-muted-foreground">Notes</span>
                                <InlineEdit value={model.detail ?? ''} placeholder="Add notes" onSave={(v) => saveField('detail', v || null)} />
                            </div>
                        </div>

                        {/* Custom Fields - Editable */}
                        <div className="pt-2">
                            <span className="text-xs font-medium text-muted-foreground">Custom Fields</span>
                            <div className="mt-2 space-y-2">
                                {model.custom_fields &&
                                    Object.entries(model.custom_fields).map(([key, value]) => {
                                        if (value === null || value === undefined) return null;
                                        const stringValue = Array.isArray(value) ? value.join(', ') : String(value);
                                        return (
                                            <div key={key} className="group flex gap-2 text-sm items-center-safe">
                                                <span className="min-w-[80px] pt-0.5 text-xs text-muted-foreground capitalize">
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
    );
}
