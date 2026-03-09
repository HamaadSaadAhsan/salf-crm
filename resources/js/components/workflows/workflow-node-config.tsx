import { useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

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
        description: 'Opens a popup to authenticate with Facebook. Grants permissions for lead retrieval, page management, and ad insights.',
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
        description: 'Subscribes to Facebook webhooks for lead generation events using the auto-generated webhook URL. No manual configuration needed.',
        runLabel: 'Subscribe Webhooks',
    },
    facebook_app_sub: {
        icon: AppWindow,
        color: 'bg-[#1877F2]',
        label: 'App Subscription',
        description: 'Subscribes the Facebook App to page events (leadgen, feed, messaging). Enables real-time notifications for your selected pages.',
        runLabel: 'Subscribe App',
    },
    facebook_lead_ads: {
        icon: Zap,
        color: 'bg-[#1877F2]',
        label: 'New Lead Trigger',
        description: 'Listens for new leads from Facebook Lead Ads forms. Incoming leads are automatically processed by downstream actions.',
        runLabel: 'Test Trigger',
    },
};

type StepStatus = 'pending' | 'completed' | 'error';

function getStepStatus(step: WorkflowStep): StepStatus {
    const c = step.configuration || {};
    if (c.authorized || c.synced || c.subscribed) {
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
                    // Open popup in click context to avoid browser blocker
                    const popup = window.open('about:blank', 'facebook_oauth', 'width=600,height=700');
                    try {
                        const res = await api.post('/integrations/facebook/oauth/authorize');
                        if (res.data.success && res.data.auth_url) {
                            if (popup && !popup.closed) {
                                popup.location.href = res.data.auth_url;
                            } else {
                                window.open(res.data.auth_url, 'facebook_oauth', 'width=600,height=700');
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
                    const res = await api.post(`/workflows/${workflow.id}/sync-pages`);
                    if (res.data.success !== false) {
                        clearError({ synced: true, synced_at: new Date().toISOString() });
                    }
                    break;
                }
                case 'facebook_webhook_sub': {
                    const res = await api.post(`/workflows/${workflow.id}/subscribe-webhook`);
                    if (res.data.success !== false) {
                        clearError({ subscribed: true, subscribed_at: new Date().toISOString() });
                    }
                    break;
                }
                case 'facebook_app_sub': {
                    const res = await api.post(`/workflows/${workflow.id}/subscribe-app`);
                    if (res.data.success !== false) {
                        clearError({ subscribed: true, subscribed_at: new Date().toISOString() });
                    }
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

                {/* OAuth permissions */}
                {step.service === 'facebook_oauth' && (
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Requested Permissions
                        </label>
                        <div className="flex flex-wrap gap-1.5">
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
                    disabled={running}
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
                                : config.runLabel}
                </Button>
            </div>
        </div>
    );
}
