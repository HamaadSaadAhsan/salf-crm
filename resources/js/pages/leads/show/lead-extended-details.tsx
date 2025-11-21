import { Separator } from '@/components/ui/separator';
import { Mail, Phone, Calendar, Tag, User, Link2, Tags, Briefcase } from 'lucide-react';
import { InlineEdit } from '@/components/inline-edit';
import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import TagInput from '@/components/tag-input';
import axios from 'axios';
import { formatDate } from '@/lib/helpers';
import { Badge } from '@/components/ui/badge';

type TagValue = string | { label: string; value: string; color?: string };

type Lead = {
    id: number | string;
    name: string;
    email: string | null;
    phone: string | null;
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

export function LeadExtendedDetails({ lead }: { lead: Lead }) {
    const [model, setModel] = useState<Lead>(lead);
    const [tags, setTags] = useState<TagValue[]>(lead.tags ?? []);
    const [sources, setSources] = useState<Array<{ value: string; label: string }>>([]);
    const [services, setServices] = useState<Array<{ value: string; label: string }>>([]);

    useEffect(() => {
        // Fetch lead sources
        axios.get('/sources').then(response => {
            if (response.data?.data) {
                setSources(response.data.data.map((source: any) => ({
                    value: String(source.id),
                    label: source.name
                })));
            }
        }).catch(console.error);

        // Fetch services
        axios.get('/services').then(response => {
            if (response.data?.data) {
                setServices(response.data.data.map((service: any) => ({
                    value: String(service.id),
                    label: service.name
                })));
            }
        }).catch(console.error);
    }, []);

    const save = async (patch: Partial<Lead>) => {
        const payload = {
            name: patch.name ?? model.name,
            email: patch.email ?? model.email,
            inquiry_status: patch.inquiry_status ?? model.inquiry_status
        };

        await router.put(`/leads/${model.id}`, payload, {
            preserveScroll: true,
            preserveState: true,
            only: ['lead'],
            onSuccess: () => {
                setModel(prev => ({ ...prev, ...patch }));
            },
        });
    };

    const saveService = async (serviceId: string) => {
        await router.put(`/leads/${model.id}`, {
            service_id: serviceId ? Number(serviceId) : null,
        }, {
            preserveScroll: true,
            preserveState: true,
            only: ['lead'],
            onSuccess: (page: any) => {
                if (page.props.lead) {
                    setModel(page.props.lead);
                }
            },
        });
    };

    const saveSource = async (sourceId: string) => {
        await router.put(`/leads/${model.id}`, {
            lead_source_id: sourceId ? Number(sourceId) : null,
        }, {
            preserveScroll: true,
            preserveState: true,
            only: ['lead'],
            onSuccess: (page: any) => {
                if (page.props.lead) {
                    setModel(page.props.lead);
                }
            },
        });
    };

    const saveTags = async (newTags: TagValue[]) => {
        await router.put(`/leads/${model.id}`, {
            name: model.name,
            email: model.email,
            phone: model.phone,
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
                    {/*<div className="flex items-start gap-2 text-sm">*/}
                    {/*    <Phone className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />*/}
                    {/*    <div className="flex flex-col">*/}
                    {/*        <span className="text-muted-foreground text-xs">*/}
                    {/*            Phone*/}
                    {/*        </span>*/}
                    {/*        <InlineEdit value={model.phone ?? ''} placeholder="Add phone" readonly onSave={(v) => save({ phone: v || null })} />*/}
                    {/*    </div>*/}
                    {/*</div>*/}
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
