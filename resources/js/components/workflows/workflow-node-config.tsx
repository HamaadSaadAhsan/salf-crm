import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { type Workflow, type WorkflowStep } from '@/types/workflow';
import {
    X,
    KeyRound,
    RefreshCw,
    Webhook,
    AppWindow,
    Zap,
    Copy,
    Check,
    Loader2,
    Play,
    CheckCircle2,
    XCircle,
    Circle,
    Clock,
    ChevronDown,
    FileText,
    Plus,
    Trash2,
    ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface FacebookPage {
    id: string;
    name: string;
    category?: string;
}

interface FacebookTokenStatus {
    connected: boolean;
    has_token: boolean;
    is_expired: boolean;
    has_pages: boolean;
    connected_at: string | null;
    expires_at: string | null;
}

interface WorkflowNodeConfigProps {
    step: WorkflowStep;
    workflow: Workflow;
    onClose: () => void;
    onUpdate: (updates: Partial<WorkflowStep>) => void;
    onWorkflowUpdate?: (updates: Partial<Workflow>) => void;
}

const serviceConfig: Record<string, { icon: any; color: string; label: string; description: string; runLabel: string }> = {
    facebook_oauth: {
        icon: KeyRound,
        color: 'bg-[#1877F2]',
        label: 'Facebook OAuth',
        description: 'Connects to Facebook at the account level. You only need to authorize once — the token is automatically extended before expiry.',
        runLabel: 'Connect Facebook',
    },
    facebook_page_sync: {
        icon: RefreshCw,
        color: 'bg-[#1877F2]',
        label: 'Page Sync',
        description: 'Fetches all Facebook Pages accessible by the authenticated user and stores their page tokens for API access.',
        runLabel: 'Sync Pages',
    },
    facebook_webhook_sub: {
        icon: Webhook,
        color: 'bg-[#1877F2]',
        label: 'Webhook Subscription',
        description: 'Subscribes to Facebook webhooks for lead generation events on the selected page.',
        runLabel: 'Subscribe Webhooks',
    },
    facebook_app_sub: {
        icon: AppWindow,
        color: 'bg-[#1877F2]',
        label: 'App Subscription',
        description: 'Subscribes the Facebook App to page events (leadgen, feed) on the selected page.',
        runLabel: 'Subscribe App',
    },
    facebook_lead_ads: {
        icon: Zap,
        color: 'bg-[#1877F2]',
        label: 'New Lead Trigger',
        description: 'Listens for new leads from Facebook Lead Ads forms. Incoming leads are automatically processed by downstream actions.',
        runLabel: 'Test Trigger',
    },
    field_mapping: {
        icon: FileText,
        color: 'bg-violet-600',
        label: 'Field Mapping',
        description: 'Map incoming lead data fields to your CRM lead fields. Each mapping defines which source field maps to which target field.',
        runLabel: 'Save Mappings',
    },
};

type StepStatus = 'pending' | 'completed' | 'error';

function getStepStatus(step: WorkflowStep): StepStatus {
    const c = step.configuration || {};
    if (c.authorized || c.synced || c.subscribed || c.configured) {
        return 'completed';
    }
    if (step.service === 'field_mapping' && step.field_mappings && step.field_mappings.length > 0) {
        return 'completed';
    }
    if (c.error) {
        return 'error';
    }
    return 'pending';
}

const statusDisplay: Record<StepStatus, { icon: any; label: string; color: string }> = {
    pending: { icon: Clock, label: 'Pending — click Run below', color: 'text-blue-600 dark:text-blue-400' },
    completed: { icon: CheckCircle2, label: 'Completed', color: 'text-emerald-600 dark:text-emerald-400' },
    error: { icon: XCircle, label: 'Failed — click Run to retry', color: 'text-red-600 dark:text-red-400' },
};

// Steps that need page selection
const pageBasedServices = ['facebook_page_sync', 'facebook_webhook_sub', 'facebook_app_sub', 'facebook_lead_ads'];

// Common Facebook lead source fields
const facebookSourceFields = [
    { value: 'full_name', label: 'Full Name' },
    { value: 'first_name', label: 'First Name' },
    { value: 'last_name', label: 'Last Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone_number', label: 'Phone Number' },
    { value: 'city', label: 'City' },
    { value: 'state', label: 'State' },
    { value: 'country', label: 'Country' },
    { value: 'zip_code', label: 'Zip Code' },
    { value: 'street_address', label: 'Street Address' },
    { value: 'job_title', label: 'Job Title' },
    { value: 'company_name', label: 'Company Name' },
    { value: 'work_email', label: 'Work Email' },
    { value: 'work_phone_number', label: 'Work Phone' },
];

// CRM Lead target fields
const leadTargetFields = [
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'occupation', label: 'Occupation' },
    { value: 'address', label: 'Address' },
    { value: 'country', label: 'Country' },
    { value: 'city', label: 'City' },
    { value: 'detail', label: 'Detail / Notes' },
    { value: 'budget', label: 'Budget' },
    { value: 'tags', label: 'Tags' },
];

interface FieldMapping {
    source_field: string;
    target_field: string;
    field_type: string;
}

export default function WorkflowNodeConfig({
    step,
    workflow,
    onClose,
    onUpdate,
    onWorkflowUpdate,
}: WorkflowNodeConfigProps) {
    const [running, setRunning] = useState(false);
    const [runResult, setRunResult] = useState<'success' | 'error' | null>(null);
    const [copied, setCopied] = useState(false);
    const [pages, setPages] = useState<FacebookPage[]>([]);
    const [loadingPages, setLoadingPages] = useState(false);
    const [tokenStatus, setTokenStatus] = useState<FacebookTokenStatus | null>(null);
    const [loadingToken, setLoadingToken] = useState(false);
    const [mappings, setMappings] = useState<FieldMapping[]>(
        (step.field_mappings || []).map((m: any) => ({
            source_field: m.source_field || '',
            target_field: m.target_field || '',
            field_type: m.field_type || 'text',
        })),
    );

    const config = serviceConfig[step.service] || {
        icon: Circle,
        color: 'bg-zinc-500',
        label: step.service,
        description: '',
        runLabel: 'Run',
    };
    const Icon = config.icon;
    const stepStatus = getStepStatus(step);
    const statusInfo = statusDisplay[stepStatus];
    const StatusIcon = statusInfo.icon;

    const selectedPageId = step.configuration?.page_id || workflow.metadata?.selected_page_id;
    const selectedPageName = step.configuration?.page_name || workflow.metadata?.selected_page_name;

    // Check Facebook token status when opening OAuth step
    useEffect(() => {
        if (step.service === 'facebook_oauth') {
            checkTokenStatus();
        }
    }, [step.service]);

    // Load pages when opening a page-based step
    useEffect(() => {
        if (pageBasedServices.includes(step.service)) {
            loadPages();
        }
    }, [step.service]);

    const checkTokenStatus = async () => {
        setLoadingToken(true);
        try {
            const res = await api.get('/workflows/facebook/token-status');
            setTokenStatus(res);

            // Auto-mark OAuth step as completed if user already has a valid token
            if (res.connected && !step.configuration?.authorized) {
                onUpdate({
                    configuration: {
                        ...step.configuration,
                        authorized: true,
                        auto_detected: true,
                        connected_at: res.connected_at,
                    },
                });
                toast.success('Facebook already connected — token detected');
            }
        } catch {
            // Can't check token status — user will need to OAuth manually
        } finally {
            setLoadingToken(false);
        }
    };

    const loadPages = async () => {
        setLoadingPages(true);
        try {
            const res = await api.get(`/workflows/${workflow.id}/pages`);
            if (res.pages) {
                setPages(res.pages);
            }
        } catch {
            // Pages not synced yet — that's OK
        } finally {
            setLoadingPages(false);
        }
    };

    const handlePageSelect = (pageId: string) => {
        const page = pages.find((p) => p.id === pageId);
        if (!page) return;

        onUpdate({
            configuration: {
                ...step.configuration,
                page_id: page.id,
                page_name: page.name,
            },
        });

        // Also store in workflow metadata so other steps can use it
        onWorkflowUpdate?.({
            metadata: {
                ...workflow.metadata,
                selected_page_id: page.id,
                selected_page_name: page.name,
            },
        });
    };

    const addMapping = () => {
        setMappings((prev) => [...prev, { source_field: '', target_field: '', field_type: 'text' }]);
    };

    const updateMapping = (index: number, updates: Partial<FieldMapping>) => {
        setMappings((prev) => {
            const updated = prev.map((m, i) => (i === index ? { ...m, ...updates } : m));
            // Persist to step
            onUpdate({ field_mappings: updated });
            return updated;
        });
    };

    const removeMapping = (index: number) => {
        setMappings((prev) => {
            const updated = prev.filter((_, i) => i !== index);
            onUpdate({ field_mappings: updated });
            return updated;
        });
    };

    const handleCopyWebhookUrl = () => {
        if (workflow.webhook_url) {
            navigator.clipboard.writeText(workflow.webhook_url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Webhook URL copied');
        }
    };

    const clearError = (extra: Record<string, unknown> = {}) => {
        const { error, ...rest } = step.configuration || {};
        onUpdate({ configuration: { ...rest, ...extra } });
    };

    const handleRunStep = async () => {
        setRunning(true);
        setRunResult(null);

        try {
            switch (step.service) {
                case 'facebook_oauth': {
                    const popup = window.open('about:blank', 'facebook_oauth', 'width=600,height=700');
                    try {
                        const res = await api.post('/integrations/facebook/oauth/authorize', {});
                        if (res.success && res.auth_url) {
                            if (popup && !popup.closed) {
                                popup.location.href = res.auth_url;
                            } else {
                                window.open(res.auth_url, 'facebook_oauth', 'width=600,height=700');
                            }
                            clearError({ authorized: true });
                        } else {
                            popup?.close();
                        }
                    } catch (oauthErr) {
                        popup?.close();
                        throw oauthErr;
                    }
                    break;
                }
                case 'facebook_page_sync': {
                    const res = await api.post(`/workflows/${workflow.id}/sync-pages`, {});
                    if (res.success !== false) {
                        clearError({ synced: true, synced_at: new Date().toISOString() });
                        if (res.pages) {
                            setPages(res.pages);
                        }
                    }
                    break;
                }
                case 'facebook_webhook_sub': {
                    const pageId = step.configuration?.page_id || selectedPageId;
                    if (!pageId) {
                        toast.error('Please select a page first');
                        setRunning(false);
                        return;
                    }
                    const res = await api.post(`/workflows/${workflow.id}/subscribe-webhook`, { page_id: pageId });
                    if (res.success !== false) {
                        clearError({ subscribed: true, subscribed_at: new Date().toISOString(), page_id: pageId });
                    }
                    break;
                }
                case 'facebook_app_sub': {
                    const pageId = step.configuration?.page_id || selectedPageId;
                    if (!pageId) {
                        toast.error('Please select a page first');
                        setRunning(false);
                        return;
                    }
                    const res = await api.post(`/workflows/${workflow.id}/subscribe-app`, { page_id: pageId });
                    if (res.success !== false) {
                        clearError({ subscribed: true, subscribed_at: new Date().toISOString(), page_id: pageId });
                    }
                    break;
                }
                case 'facebook_lead_ads': {
                    // Lead trigger doesn't need a "run" — it's event-driven
                    // Just mark as configured if page is selected
                    const pageId = step.configuration?.page_id || selectedPageId;
                    if (!pageId) {
                        toast.error('Please select a page first');
                        setRunning(false);
                        return;
                    }
                    clearError({ page_id: pageId, configured: true });
                    break;
                }
                case 'field_mapping': {
                    // Validate that at least one complete mapping exists
                    const completeMappings = mappings.filter((m) => m.source_field && m.target_field);
                    if (completeMappings.length === 0) {
                        toast.error('Add at least one complete field mapping');
                        setRunning(false);
                        return;
                    }
                    onUpdate({ field_mappings: completeMappings });
                    clearError({ configured: true, mapping_count: completeMappings.length });
                    break;
                }
            }
            setRunResult('success');
            toast.success(`${config.label} completed`);
        } catch (err: any) {
            console.error(`[Workflow] ${step.service} failed:`, err);
            setRunResult('error');
            onUpdate({
                configuration: { ...step.configuration, error: true },
            });
            const message = err?.response?.data?.message || err?.message || `Failed to run ${config.label}`;
            toast.error(message);
        } finally {
            setRunning(false);
        }
    };

    const needsPageSelection = pageBasedServices.includes(step.service);
    const canRun = step.service === 'field_mapping' || !needsPageSelection || selectedPageId || step.service === 'facebook_page_sync';

    return (
        <div
            className={cn(
                'absolute top-0 right-0 h-full w-96 z-40',
                'bg-card border-l border-border',
                'animate-in slide-in-from-right-full duration-200',
                'flex flex-col',
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.color)}>
                    <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <StatusIcon className={cn('w-3 h-3', statusInfo.color)} />
                        <span className={cn('text-xs', statusInfo.color)}>{statusInfo.label}</span>
                    </div>
                </div>
                <button onClick={onClose} className="p-1 rounded-md hover:bg-accent transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Description */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        What this does
                    </label>
                    <p className="text-sm text-foreground leading-relaxed">
                        {config.description}
                    </p>
                </div>

                {/* Page selector for page-based steps */}
                {needsPageSelection && (
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Facebook Page
                        </label>
                        {loadingPages ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Loading pages...
                            </div>
                        ) : pages.length > 0 ? (
                            <div className="relative">
                                <select
                                    value={selectedPageId || ''}
                                    onChange={(e) => handlePageSelect(e.target.value)}
                                    className={cn(
                                        'w-full appearance-none rounded-lg border border-border bg-background',
                                        'px-3 py-2 pr-8 text-sm text-foreground',
                                        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                                    )}
                                >
                                    <option value="">Select a page...</option>
                                    {pages.map((page) => (
                                        <option key={page.id} value={page.id}>
                                            {page.name} {page.category ? `(${page.category})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                            </div>
                        ) : step.service !== 'facebook_page_sync' ? (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                No pages found. Run Page Sync first.
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Click Run below to fetch your pages.
                            </p>
                        )}
                        {selectedPageName && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                Selected: {selectedPageName}
                            </div>
                        )}
                    </div>
                )}

                {/* Completed timestamp */}
                {step.configuration?.synced_at && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Last run: {new Date(step.configuration.synced_at).toLocaleString()}
                    </div>
                )}
                {step.configuration?.subscribed_at && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Subscribed: {new Date(step.configuration.subscribed_at).toLocaleString()}
                    </div>
                )}

                {/* Webhook URL (show for webhook-related nodes) */}
                {(step.service === 'facebook_webhook_sub' || step.service === 'facebook_lead_ads') &&
                    workflow.webhook_url && (
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Webhook URL
                            </label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs font-mono text-foreground break-all">
                                    {workflow.webhook_url}
                                </div>
                                <button
                                    onClick={handleCopyWebhookUrl}
                                    className="p-2 rounded-lg hover:bg-accent transition-colors flex-shrink-0"
                                >
                                    {copied ? (
                                        <Check className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                        <Copy className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Auto-generated — no manual setup needed.
                            </p>
                        </div>
                    )}

                {/* Facebook account connection status */}
                {step.service === 'facebook_oauth' && (
                    <div className="space-y-3">
                        {loadingToken ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Checking connection status...
                            </div>
                        ) : tokenStatus?.connected ? (
                            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/30 bg-emerald-50 dark:bg-emerald-950/20 p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                        Facebook Connected
                                    </span>
                                </div>
                                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70">
                                    Your account is already connected. Token is managed at the account level and auto-extended before expiry.
                                </p>
                                {tokenStatus.expires_at && (
                                    <p className="text-[11px] text-muted-foreground">
                                        Token expires: {new Date(tokenStatus.expires_at).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        ) : tokenStatus?.is_expired ? (
                            <div className="rounded-lg border border-amber-200 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                        Token Expired
                                    </span>
                                </div>
                                <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
                                    Your Facebook token has expired. Click Connect below to re-authenticate.
                                </p>
                            </div>
                        ) : null}

                        <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Requested Permissions
                            </label>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {[
                                    'leads_retrieval',
                                    'pages_show_list',
                                    'pages_read_engagement',
                                    'pages_manage_ads',
                                    'pages_manage_metadata',
                                ].map((scope) => (
                                    <span
                                        key={scope}
                                        className="text-[10px] px-2 py-1 bg-muted rounded-full text-muted-foreground"
                                    >
                                        {scope}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Field Mapping UI */}
                {step.service === 'field_mapping' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Field Mappings
                            </label>
                            <button
                                onClick={addMapping}
                                className={cn(
                                    'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md',
                                    'text-primary hover:bg-primary/10 transition-colors',
                                )}
                            >
                                <Plus className="w-3 h-3" />
                                Add
                            </button>
                        </div>

                        {mappings.length === 0 ? (
                            <div className="text-center py-6 border border-dashed border-border rounded-lg">
                                <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground">
                                    No mappings yet. Click Add to map source fields to lead fields.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {mappings.map((mapping, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <select
                                                value={mapping.source_field}
                                                onChange={(e) => updateMapping(index, { source_field: e.target.value })}
                                                className={cn(
                                                    'w-full appearance-none rounded-md border border-border bg-background',
                                                    'px-2 py-1.5 text-xs text-foreground',
                                                    'focus:outline-none focus:ring-1 focus:ring-primary/20',
                                                )}
                                            >
                                                <option value="">Source field...</option>
                                                {facebookSourceFields.map((f) => (
                                                    <option key={f.value} value={f.value}>
                                                        {f.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />

                                        <div className="flex-1 min-w-0">
                                            <select
                                                value={mapping.target_field}
                                                onChange={(e) => updateMapping(index, { target_field: e.target.value })}
                                                className={cn(
                                                    'w-full appearance-none rounded-md border border-border bg-background',
                                                    'px-2 py-1.5 text-xs text-foreground',
                                                    'focus:outline-none focus:ring-1 focus:ring-primary/20',
                                                )}
                                            >
                                                <option value="">Lead field...</option>
                                                {leadTargetFields.map((f) => (
                                                    <option key={f.value} value={f.value}>
                                                        {f.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <button
                                            onClick={() => removeMapping(index)}
                                            className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Map Facebook Lead Ads fields to your CRM lead fields. Unmapped fields will be stored in custom_fields.
                        </p>
                    </div>
                )}

                {/* Enabled toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                    <label className="text-sm text-foreground">Enabled</label>
                    <button
                        onClick={() => onUpdate({ enabled: !step.enabled })}
                        className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            step.enabled ? 'bg-primary' : 'bg-muted',
                        )}
                    >
                        <span
                            className={cn(
                                'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                                step.enabled ? 'translate-x-4' : 'translate-x-1',
                            )}
                        />
                    </button>
                </div>
            </div>

            {/* Footer actions */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-border">
                <Button
                    onClick={handleRunStep}
                    disabled={running || (!canRun)}
                    className={cn(
                        'w-full',
                        runResult === 'success' && 'bg-emerald-600 hover:bg-emerald-700',
                    )}
                    size="sm"
                >
                    {running ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : runResult === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    ) : runResult === 'error' ? (
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    ) : (
                        <Play className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {running
                        ? 'Running...'
                        : runResult === 'success'
                            ? 'Completed'
                            : runResult === 'error'
                                ? 'Retry'
                                : (step.service === 'facebook_oauth' && tokenStatus?.connected)
                                    ? 'Reconnect Facebook'
                                    : config.runLabel}
                </Button>
            </div>
        </div>
    );
}
