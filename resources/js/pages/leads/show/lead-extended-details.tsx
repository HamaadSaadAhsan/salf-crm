import { Separator } from '@/components/ui/separator';
import { Mail, Calendar, Tag, User, Link2, Tags, Briefcase } from 'lucide-react';
import { InlineEdit } from '@/components/inline-edit';
import { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import TagInput from '@/components/tag-input';
import axios from 'axios';
import { formatDate } from '@/lib/helpers';
import { Badge } from '@/components/ui/badge';
import { useEcho } from '@laravel/echo-react';

type TagValue = string | { label: string; value: string; color?: string };

type Lead = {
    id: number | string;
    name: string;
    email: string | null;
    status: string;
    inquiry_status: string;
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

export function LeadExtendedDetails({ lead, onLeadUpdated }: { lead: Lead; onLeadUpdated?: () => void }) {
    const [model, setModel] = useState<Lead>(lead);
    const [tags, setTags] = useState<TagValue[]>(lead.tags ?? []);
    const [sources, setSources] = useState<Array<{ value: string; label: string }>>([]);
    const [services, setServices] = useState<Array<{ value: string; label: string }>>([]);

    // Sync local state when lead prop changes (e.g., after Inertia reload)
    useEffect(() => {
        setModel(lead);
        setTags(lead.tags ?? []);
    }, [lead]);

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

    const statusOptions = [
        { value: 'new', label: 'New' },
        { value: 'contacted', label: 'Contacted' },
        { value: 'qualified', label: 'Qualified' },
        { value: 'assigned_to_advisor', label: 'Assigned to Advisor' },
        { value: 'lost', label: 'Lost' },
        { value: 'converted', label: 'Converted' },
    ];

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <h3 className="text-sm font-semibold">Lead Information</h3>
                <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                        <Mail className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs">
                                Email
                            </span>
                            <InlineEdit value={model.email ?? ''} placeholder="Add email" readonly onSave={(v) => save({ email: v || null })} />
                        </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                        <Tag className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs">
                                Status
                            </span>
                            <InlineEdit type="select" options={statusOptions} value={model.inquiry_status} onSave={(v) => save({ inquiry_status: v })} />
                        </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                        <Briefcase className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs">
                                Service
                            </span>
                            {services.length > 0 ? (
                                <InlineEdit
                                    type="select"
                                    options={services}
                                    value={model.service?.data?.id ? String(model.service.data.id) : ''}
                                    placeholder="Select service"
                                    onSave={saveService}
                                />
                            ) : (
                                <span className="text-sm">
                                    {model.service?.data?.name || '—'}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                        <Link2 className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs">
                                Source
                            </span>
                            {sources.length > 0 ? (
                                <InlineEdit
                                    type="select"
                                    options={sources}
                                    value={model.source?.data?.id ? String(model.source.data.id) : ''}
                                    placeholder="Select source"
                                    onSave={saveSource}
                                />
                            ) : (
                                <span className="text-sm">
                                    {model.source?.data?.name || '—'}
                                </span>
                            )}
                        </div>
                    </div>
                    {model.assigned_to?.data && (
                        <div className="flex items-start gap-2 text-sm">
                            <User className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                            <div className="flex flex-col gap-1.5">
                                <span className="text-muted-foreground text-xs">
                                    Assigned To
                                </span>
                                <div className="flex flex-col gap-1">
                                    <span className="font-medium">{model.assigned_to.data.name}</span>
                                    {model.assigned_to.data.roles && model.assigned_to.data.roles.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {model.assigned_to.data.roles.map((role) => (
                                                <Badge
                                                    key={role.id}
                                                    variant="secondary"
                                                    className="text-xs capitalize"
                                                >
                                                    {role.name.replace(/-/g, ' ')}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {model.owner && (
                        <div className="flex items-start gap-2 text-sm">
                            <User className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-muted-foreground text-xs">
                                    Owner
                                </span>
                                <span>{model.owner.name}</span>
                            </div>
                        </div>
                    )}
                    <div className="flex items-start gap-2 text-sm">
                        <Calendar className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs">
                                Created
                            </span>
                            <InlineEdit
                                value={model.created_at || ''}
                                placeholder="—"
                                readonly
                                format={(dateStr) => {
                                    if (!dateStr) return '—';
                                    try {
                                        const d = new Date(dateStr);
                                        if (isNaN(d.getTime())) {
                                            // Try alternative parsing
                                            const altDate = new Date(dateStr.replace(' ', 'T'));
                                            return isNaN(altDate.getTime()) ? dateStr : formatDate(altDate);
                                        }
                                        return formatDate(d);
                                    } catch {
                                        return dateStr;
                                    }
                                }}
                                onSave={() => {}}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            <div className="space-y-3">
                <div className="flex items-start gap-2">
                    <Tags className="text-muted-foreground mt-5 h-4 w-4 shrink-0" />
                    <div className="flex-1">
                        <TagInput
                            label=""
                            value={tags}
                            onChange={saveTags}
                            placeholder="Add tags (press Enter or comma)"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
