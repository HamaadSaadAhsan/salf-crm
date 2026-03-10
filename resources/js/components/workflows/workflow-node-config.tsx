import { useState, useEffect, useRef, useCallback } from 'react';
import { useEcho } from '@laravel/echo-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { type Workflow, type WorkflowStep } from '@/types/workflow';
import {
    X,
    Zap,
    Copy,
    Check,
    Loader2,
    CheckCircle2,
    Circle,
    Clock,
    ChevronRight,
    FileText,
    Plus,
    Trash2,
    ArrowRight,
    FlaskConical,
    Facebook,
    AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import PageSelectionModal from './page-selection-modal';
import FormSelectionModal from './form-selection-modal';

interface TestLeadField {
    name: string;
    values: string[];
}

interface WorkflowNodeConfigProps {
    step: WorkflowStep;
    workflow: Workflow;
    onClose: () => void;
    onUpdate: (updates: Partial<WorkflowStep>) => void;
    onWorkflowUpdate?: (updates: Partial<Workflow>) => void;
    onFacebookConnected?: () => void;
}

const serviceConfig: Record<string, { icon: any; color: string; label: string; description: string }> = {
    facebook_lead_ads: {
        icon: Zap,
        color: 'bg-[#1877F2]',
        label: 'New Lead Trigger',
        description: 'Listens for new leads from Facebook Lead Ads forms. Select a page and form, then test to see actual lead data.',
    },
    field_mapping: {
        icon: FileText,
        color: 'bg-violet-600',
        label: 'Field Mapping',
        description: 'Map incoming lead data fields to your CRM lead fields. Test the trigger first to get real field names.',
    },
};

// CRM Lead target fields (static)
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

// Fallback source fields when no test data is available
const fallbackSourceFields = [
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
    onFacebookConnected,
}: WorkflowNodeConfigProps) {
    const [copied, setCopied] = useState(false);
    const [pageModalOpen, setPageModalOpen] = useState(false);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [testLeadFields, setTestLeadFields] = useState<TestLeadField[]>(
        step.configuration?.test_lead_fields || [],
    );
    const [testLeadData, setTestLeadData] = useState<Record<string, unknown> | null>(
        step.configuration?.test_lead_data || null,
    );
    const [testing, setTesting] = useState(false);
    const [mappings, setMappings] = useState<FieldMapping[]>(
        (step.field_mappings || []).map((m: any) => ({
            source_field: m.source_field || '',
            target_field: m.target_field || '',
            field_type: m.field_type || 'text',
        })),
    );

    // Facebook connection state (for lead trigger)
    const [facebookConnected, setFacebookConnected] = useState<boolean | null>(null);
    const [connectingFacebook, setConnectingFacebook] = useState(false);
    const [setupProgress, setSetupProgress] = useState<string | null>(null);
    const popupRef = useRef<Window | null>(null);
    const popupCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const config = serviceConfig[step.service] || {
        icon: Circle,
        color: 'bg-zinc-500',
        label: step.service,
        description: '',
    };
    const Icon = config.icon;

    const selectedPageId = step.configuration?.page_id || workflow.metadata?.selected_page_id;
    const selectedPageName = step.configuration?.page_name || workflow.metadata?.selected_page_name;
    const selectedFormId = step.configuration?.form_id;

    // Listen for Facebook auto-setup progress via Reverb
    type SetupProgressPayload = {
        workflow_id: number;
        status: 'running' | 'completed' | 'failed';
        message: string;
        data: { pages?: { id: string; name: string; category?: string }[] };
        timestamp: string;
    };

    useEcho<SetupProgressPayload>(
        `workflow.${workflow.id}`,
        '.facebook.setup.progress',
        useCallback((e: SetupProgressPayload) => {
            if (e.status === 'running') {
                setSetupProgress(e.message);
            } else if (e.status === 'completed') {
                setFacebookConnected(true);
                setSetupProgress(null);
                setConnectingFacebook(false);
                onFacebookConnected?.();
                toast.success(e.message);
            } else if (e.status === 'failed') {
                setSetupProgress(null);
                setConnectingFacebook(false);
                toast.error(e.message);
            }
        }, [workflow.id, onFacebookConnected]),
    );

    // Check Facebook connection on mount for lead trigger
    useEffect(() => {
        if (step.service === 'facebook_lead_ads') {
            checkFacebookConnection();
        }
    }, [step.service]);

    // Load dynamic source fields from workflow metadata (set by test trigger)
    useEffect(() => {
        if (step.service === 'field_mapping') {
            const saved = workflow.metadata?.test_lead_fields;
            if (saved && saved.length > 0) {
                setTestLeadFields(saved);
            }
        }
    }, [step.service, workflow.metadata?.test_lead_fields]);

    // Clean up popup check on unmount
    useEffect(() => {
        return () => {
            if (popupCheckRef.current) {
                clearInterval(popupCheckRef.current);
            }
        };
    }, []);

    const checkFacebookConnection = async () => {
        try {
            const res = await api.get('/workflows/facebook/token-status');
            setFacebookConnected(res.connected === true);
        } catch {
            setFacebookConnected(false);
        }
    };

    const handleConnectFacebook = async () => {
        setConnectingFacebook(true);
        setSetupProgress('Opening Facebook login...');

        try {
            // Open popup first (must be in direct click handler to avoid popup blocker)
            const popup = window.open('about:blank', 'facebook_oauth', 'width=600,height=700');
            popupRef.current = popup;

            const res = await api.post('/integrations/facebook/oauth/authorize', {});
            if (res.success && res.auth_url) {
                if (popup && !popup.closed) {
                    popup.location.href = res.auth_url;
                } else {
                    popupRef.current = window.open(res.auth_url, 'facebook_oauth', 'width=600,height=700');
                }

                setSetupProgress('Waiting for Facebook login...');

                // Watch for popup close, then dispatch auto-setup (job handles work, Reverb pushes progress)
                popupCheckRef.current = setInterval(async () => {
                    if (popupRef.current && popupRef.current.closed) {
                        if (popupCheckRef.current) {
                            clearInterval(popupCheckRef.current);
                            popupCheckRef.current = null;
                        }

                        // Check if token was actually saved
                        setSetupProgress('Checking connection...');
                        try {
                            const statusRes = await api.get('/workflows/facebook/token-status');
                            if (statusRes.connected) {
                                // Token saved — dispatch auto-setup job (returns immediately, Reverb handles updates)
                                setSetupProgress('Setting up pages & subscriptions...');
                                await api.post(`/workflows/${workflow.id}/auto-setup-facebook`, {});
                                // Progress updates will arrive via Reverb (useEcho above)
                            } else {
                                setSetupProgress(null);
                                setConnectingFacebook(false);
                                toast.error('Facebook login was not completed');
                            }
                        } catch {
                            setSetupProgress(null);
                            setConnectingFacebook(false);
                            toast.error('Failed to verify Facebook connection');
                        }
                    }
                }, 1000);
            } else {
                popup?.close();
                setSetupProgress(null);
                setConnectingFacebook(false);
                toast.error('Failed to get Facebook auth URL');
            }
        } catch (err: any) {
            setSetupProgress(null);
            setConnectingFacebook(false);
            const message = err?.response?.data?.message || err?.message || 'Failed to connect Facebook';
            toast.error(message);
        }
    };

    const handlePageSelected = (pageId: string, pageName: string) => {
        onUpdate({
            configuration: {
                ...step.configuration,
                page_id: pageId,
                page_name: pageName,
                form_id: undefined,
                form_name: undefined,
            },
        });

        onWorkflowUpdate?.({
            metadata: {
                ...workflow.metadata,
                selected_page_id: pageId,
                selected_page_name: pageName,
            },
        });
    };

    const handleFormSelected = (formId: string, formName: string, questions?: { key: string; label: string; type: string }[]) => {
        // Build source fields from form questions
        const formFields = (questions || []).map((q) => ({
            name: q.key,
            values: [],
        }));

        onUpdate({
            configuration: {
                ...step.configuration,
                form_id: formId,
                form_name: formName,
                form_fields: formFields,
            },
        });

        // Store form fields in workflow metadata so field mapping step can use them
        if (formFields.length > 0) {
            onWorkflowUpdate?.({
                metadata: {
                    ...workflow.metadata,
                    form_fields: formFields,
                },
            });
        }
    };

    const handleTestTrigger = async () => {
        const pageId = step.configuration?.page_id || selectedPageId;
        const formId = step.configuration?.form_id;

        if (!pageId || !formId) {
            toast.error('Select a page and form first');
            return;
        }

        setTesting(true);
        try {
            const res = await api.post(`/workflows/${workflow.id}/test-trigger`, {
                page_id: pageId,
                form_id: formId,
            });

            if (res.success && res.fields) {
                setTestLeadFields(res.fields);
                setTestLeadData(res.lead_data);

                // Store test fields in step config AND workflow metadata for field mapping step
                onUpdate({
                    configuration: {
                        ...step.configuration,
                        configured: true,
                        test_lead_id: res.lead_id,
                        test_lead_fields: res.fields,
                        test_lead_data: res.lead_data,
                    },
                });

                onWorkflowUpdate?.({
                    metadata: {
                        ...workflow.metadata,
                        test_lead_fields: res.fields,
                    },
                });

                toast.success('Test lead created — field data received');
            }
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to test trigger';
            toast.error(message);
        } finally {
            setTesting(false);
        }
    };

    const syncMappingsToServer = (updated: FieldMapping[]) => {
        // Only persist complete mappings to avoid validation errors
        const complete = updated.filter((m) => m.source_field && m.target_field);
        onUpdate({ field_mappings: complete });
    };

    const addMapping = () => {
        setMappings((prev) => [...prev, { source_field: '', target_field: '', field_type: 'text' }]);
    };

    const updateMapping = (index: number, updates: Partial<FieldMapping>) => {
        setMappings((prev) => {
            const updated = prev.map((m, i) => (i === index ? { ...m, ...updates } : m));
            syncMappingsToServer(updated);
            return updated;
        });
    };

    const removeMapping = (index: number) => {
        setMappings((prev) => {
            const updated = prev.filter((_, i) => i !== index);
            syncMappingsToServer(updated);
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

    // Build dynamic source fields: test lead data > form questions > fallback
    const formFields = workflow.metadata?.form_fields || step.configuration?.form_fields || [];
    const dynamicFields = testLeadFields.length > 0
        ? testLeadFields
        : formFields.length > 0
            ? formFields
            : [];

    const sourceFields = dynamicFields.length > 0
        ? dynamicFields.map((f: { name: string }) => ({
            value: f.name,
            label: f.name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        }))
        : fallbackSourceFields;

    const isLeadTrigger = step.service === 'facebook_lead_ads';
    const isFieldMapping = step.service === 'field_mapping';
    const isConfigured = isLeadTrigger
        ? !!(step.configuration?.page_id && step.configuration?.form_id)
        : isFieldMapping
            ? !!(step.field_mappings && step.field_mappings.length > 0)
            : false;

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
                        {isConfigured ? (
                            <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-xs text-emerald-600 dark:text-emerald-400">Configured</span>
                            </>
                        ) : (
                            <>
                                <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                <span className="text-xs text-blue-600 dark:text-blue-400">Needs configuration</span>
                            </>
                        )}
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

                {/* ===== LEAD TRIGGER CONFIG ===== */}
                {isLeadTrigger && (
                    <>
                        {/* Facebook connection check */}
                        {facebookConnected === null ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Checking Facebook connection...
                            </div>
                        ) : !facebookConnected ? (
                            /* Not connected — show connect button */
                            <div className="space-y-3">
                                <div className="rounded-lg border border-amber-200 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                            Facebook not connected
                                        </span>
                                    </div>
                                    <p className="text-xs text-amber-600/80 dark:text-amber-400/70 leading-relaxed">
                                        Connect your Facebook account to access Lead Ads. This is a one-time setup —
                                        pages will be synced and subscriptions activated automatically.
                                    </p>
                                </div>

                                <Button
                                    onClick={handleConnectFacebook}
                                    disabled={connectingFacebook}
                                    className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
                                    size="sm"
                                >
                                    {connectingFacebook ? (
                                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    ) : (
                                        <Facebook className="w-3.5 h-3.5 mr-1.5" />
                                    )}
                                    {setupProgress || 'Connect Facebook'}
                                </Button>
                            </div>
                        ) : (
                            /* Connected — show page/form selection + test */
                            <>
                                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg px-3 py-2">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Facebook connected
                                </div>

                                {/* Page selector trigger */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Facebook Page
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setPageModalOpen(true)}
                                        className={cn(
                                            'w-full flex items-center gap-3 rounded-lg border border-border bg-background',
                                            'px-3 py-2.5 text-left transition-colors hover:bg-muted/50',
                                        )}
                                    >
                                        <Facebook className={cn(
                                            'w-4 h-4 flex-shrink-0',
                                            selectedPageName ? 'text-[#1877F2]' : 'text-muted-foreground',
                                        )} />
                                        <span className={cn(
                                            'flex-1 text-sm truncate',
                                            selectedPageName ? 'text-foreground font-medium' : 'text-muted-foreground',
                                        )}>
                                            {selectedPageName || 'Select a page...'}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    </button>
                                </div>

                                {/* Form selector trigger */}
                                {selectedPageId && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Lead Form
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setFormModalOpen(true)}
                                            className={cn(
                                                'w-full flex items-center gap-3 rounded-lg border border-border bg-background',
                                                'px-3 py-2.5 text-left transition-colors hover:bg-muted/50',
                                            )}
                                        >
                                            <FileText className={cn(
                                                'w-4 h-4 flex-shrink-0',
                                                step.configuration?.form_name ? 'text-violet-600' : 'text-muted-foreground',
                                            )} />
                                            <span className={cn(
                                                'flex-1 text-sm truncate',
                                                step.configuration?.form_name ? 'text-foreground font-medium' : 'text-muted-foreground',
                                            )}>
                                                {step.configuration?.form_name || 'Select a form...'}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        </button>
                                    </div>
                                )}

                                {/* Test Trigger */}
                                {selectedFormId && (
                                    <div className="space-y-3">
                                        <Button
                                            onClick={handleTestTrigger}
                                            disabled={testing}
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                        >
                                            {testing ? (
                                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                            ) : (
                                                <FlaskConical className="w-3.5 h-3.5 mr-1.5" />
                                            )}
                                            {testing ? 'Sending test lead...' : 'Test Trigger'}
                                        </Button>

                                        {/* Test lead response */}
                                        {testLeadFields.length > 0 && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    Test Lead Response
                                                </label>
                                                <div className="rounded-lg border border-border bg-muted/30 p-2 space-y-1 max-h-48 overflow-y-auto">
                                                    {testLeadFields.map((field) => (
                                                        <div
                                                            key={field.name}
                                                            className="flex items-center justify-between text-xs py-1 px-2 rounded bg-background/50"
                                                        >
                                                            <span className="font-medium text-foreground">{field.name}</span>
                                                            <span className="text-muted-foreground truncate ml-2 max-w-[150px]">
                                                                {field.values.join(', ') || '(empty)'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                                                    These fields are now available for mapping in the Field Mapping step.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Webhook URL */}
                                {workflow.webhook_url && (
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
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* ===== FIELD MAPPING CONFIG ===== */}
                {isFieldMapping && (
                    <div className="space-y-3">
                        {/* Dynamic fields indicator */}
                        {dynamicFields.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg px-3 py-2">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Using {dynamicFields.length} fields from {testLeadFields.length > 0 ? 'test lead' : 'lead form'}
                            </div>
                        )}

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
                                    {testLeadFields.length === 0
                                        ? 'Test the trigger first to get real field names, or add mappings manually.'
                                        : 'Click Add to map source fields to lead fields.'}
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
                                                {sourceFields.map((f) => (
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

            {/* Page & Form selection modals */}
            <PageSelectionModal
                open={pageModalOpen}
                onClose={() => setPageModalOpen(false)}
                onSelect={handlePageSelected}
                selectedPageId={selectedPageId}
                workflowId={workflow.id}
            />
            {selectedPageId && (
                <FormSelectionModal
                    open={formModalOpen}
                    onClose={() => setFormModalOpen(false)}
                    onSelect={handleFormSelected}
                    selectedFormId={selectedFormId}
                    pageId={selectedPageId}
                    workflowId={workflow.id}
                />
            )}
        </div>
    );
}
