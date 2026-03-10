import { useState, useCallback, useMemo, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { ReactFlowProvider } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWorkflowEdit } from '@/hooks/useWorkflowEdit';
import WorkflowCanvas from '@/components/workflows/workflow-canvas';
import WorkflowNodePanel from '@/components/workflows/workflow-node-panel';
import WorkflowNodeConfig from '@/components/workflows/workflow-node-config';
import { type Workflow, type WorkflowStep, type NodeExecutionState } from '@/types/workflow';
import { api } from '@/lib/api';
import {
    ArrowLeft,
    Save,
    Loader2,
    Play,
    Pause,
    AlertCircle,
    X,
    AlertTriangle,
    Pencil,
} from 'lucide-react';

interface WorkflowEditPageProps {
    workflow: Workflow;
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    draft: { label: 'Draft', color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300', dot: 'bg-zinc-400' },
    active: { label: 'Active', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
    paused: { label: 'Paused', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400', dot: 'bg-amber-500' },
    inactive: { label: 'Inactive', color: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400', dot: 'bg-red-500' },
};

export default function WorkflowEditPage({ workflow: initialWorkflow }: WorkflowEditPageProps) {
    const {
        workflow,
        loading,
        saving,
        error,
        hasUnsavedChanges,
        lastSavedAt,
        updateWorkflow,
        saveWorkflow,
        publishWorkflow,
        setError,
    } = useWorkflowEdit(initialWorkflow.id, initialWorkflow);

    const [showNodePanel, setShowNodePanel] = useState(false);
    const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
    const [showConfig, setShowConfig] = useState(false);
    const [executionStates, setExecutionStates] = useState<NodeExecutionState[]>([]);
    const [facebookConnected, setFacebookConnected] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState(workflow?.name || '');

    // Keep name in sync when workflow loads/changes externally
    useEffect(() => {
        if (workflow?.name && !editingName) {
            setNameValue(workflow.name);
        }
    }, [workflow?.name]);

    // Check Facebook connection status on mount
    useEffect(() => {
        api.get('/workflows/facebook/token-status')
            .then((res: any) => setFacebookConnected(res.connected === true))
            .catch(() => setFacebookConnected(false));
    }, []);

    // Listen for live workflow execution updates via Reverb
    type StepExecutedPayload = {
        workflow_id: number;
        execution_id: number;
        node_id: string;
        status: 'running' | 'success' | 'failed' | 'completed';
        step_data: Record<string, unknown>;
        timestamp: string;
    };

    useEcho<StepExecutedPayload>(
        `workflow.${initialWorkflow.id}`,
        '.workflow.step.executed',
        (e) => {
            if (e.node_id === 'execution') {
                if (e.status === 'completed' || e.status === 'failed') {
                    setTimeout(() => setExecutionStates([]), 2000);
                }
                return;
            }

            setExecutionStates((prev) => {
                const existing = prev.filter((s) => s.nodeId !== e.node_id);
                return [...existing, { nodeId: e.node_id, status: e.status, startedAt: Date.now() }];
            });
        },
    );

    const status = statusConfig[workflow?.status || 'draft'];

    // Sync selected step with workflow steps after save (IDs may change from temp to real)
    useEffect(() => {
        if (selectedStep && workflow) {
            const exactMatch = workflow.steps.find((s) => s.id === selectedStep.id);
            if (exactMatch) {
                setSelectedStep(exactMatch);
                return;
            }

            const fallbackMatch = workflow.steps.find(
                (s) => s.service === selectedStep.service && s.order === selectedStep.order,
            );
            if (fallbackMatch) {
                setSelectedStep(fallbackMatch);
                return;
            }

            setShowConfig(false);
            setSelectedStep(null);
        }
    }, [workflow?.steps]);

    const handleNodeClick = useCallback((stepId: number, step: WorkflowStep) => {
        setSelectedStep(step);
        setShowConfig(true);
        setShowNodePanel(false);
    }, []);

    const handleAddNode = useCallback(() => {
        setShowNodePanel(true);
        setShowConfig(false);
        setSelectedStep(null);
    }, []);

    const handleAddSingleNode = useCallback(
        (step: Omit<WorkflowStep, 'id' | 'created_at' | 'updated_at'>) => {
            if (!workflow) return;

            const ts = new Date().toISOString();
            const nextOrder = workflow.steps.length;
            const tempId = -(nextOrder + 1);

            const newStep: WorkflowStep = {
                ...step,
                id: tempId,
                order: nextOrder,
                created_at: ts,
                updated_at: ts,
            };

            updateWorkflow({
                steps: [...workflow.steps, newStep],
            });
        },
        [workflow, updateWorkflow],
    );

    // Validate trigger→action pairing
    const workflowWarnings = useMemo(() => {
        if (!workflow || workflow.steps.length === 0) return [];

        const warnings: string[] = [];
        const sorted = [...workflow.steps].sort((a, b) => a.order - b.order);

        const triggers = sorted.filter((s) => s.step_type === 'trigger');
        const actions = sorted.filter((s) => s.step_type === 'action');

        for (const trigger of triggers) {
            const hasActionAfter = actions.some((a) => a.order > trigger.order);
            if (!hasActionAfter) {
                const label = trigger.service === 'facebook_lead_ads' ? 'New Lead Trigger' : trigger.service;
                warnings.push(`"${label}" has no action after it — add a Field Mapping or other action`);
            }
        }

        if (actions.length > 0 && triggers.length === 0) {
            warnings.push('Actions exist without a trigger — add a trigger like New Lead Trigger');
        }

        return warnings;
    }, [workflow]);

    const handleSave = useCallback(async () => {
        if (!workflow) return;
        await saveWorkflow();
    }, [workflow, saveWorkflow]);

    const handlePublish = useCallback(async () => {
        if (!workflow) return;
        if (workflowWarnings.length > 0) {
            setError(`Cannot publish: ${workflowWarnings[0]}`);
            return;
        }
        await publishWorkflow();
    }, [workflow, publishWorkflow, workflowWarnings, setError]);

    if (loading || !workflow) {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <ReactFlowProvider>
            <div className="h-screen flex flex-col bg-background">
                <Head title={`Edit: ${workflow.name}`} />

                {/* Top bar */}
                <header className="flex-shrink-0 h-12 border-b border-border bg-card flex items-center justify-between px-3 z-50">
                    <div className="flex items-center gap-2">
                        <Link href="/workflows">
                            <Button variant="ghost" size="sm" className="h-8 px-2">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>

                        <span className="text-muted-foreground">/</span>

                        {editingName ? (
                            <input
                                autoFocus
                                value={nameValue}
                                onChange={(e) => setNameValue(e.target.value)}
                                onBlur={() => {
                                    const trimmed = nameValue.trim();
                                    if (trimmed && trimmed !== workflow.name) {
                                        updateWorkflow({ name: trimmed });
                                    } else {
                                        setNameValue(workflow.name);
                                    }
                                    setEditingName(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        (e.target as HTMLInputElement).blur();
                                    }
                                    if (e.key === 'Escape') {
                                        setNameValue(workflow.name);
                                        setEditingName(false);
                                    }
                                }}
                                className={cn(
                                    'text-sm font-medium text-foreground bg-transparent',
                                    'border-b border-primary outline-none',
                                    'max-w-[200px] px-0.5',
                                )}
                            />
                        ) : (
                            <button
                                type="button"
                                onClick={() => setEditingName(true)}
                                className="group flex items-center gap-1.5 hover:bg-muted/50 rounded px-1.5 py-0.5 -mx-1.5 transition-colors"
                            >
                                <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                                    {workflow.name}
                                </span>
                                <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        )}

                        <Badge
                            variant="secondary"
                            className={cn('text-[10px] h-5 px-1.5 gap-1', status.color)}
                        >
                            <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                            {status.label}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs mr-2">
                            {saving ? (
                                <span className="text-muted-foreground flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Saving...
                                </span>
                            ) : hasUnsavedChanges ? (
                                <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>
                            ) : lastSavedAt ? (
                                <span className="text-emerald-600 dark:text-emerald-400">Saved</span>
                            ) : null}
                        </span>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={handleSave}
                            disabled={saving || !hasUnsavedChanges}
                        >
                            <Save className="w-3.5 h-3.5 mr-1.5" />
                            Save
                        </Button>

                        {workflow.status === 'draft' ? (
                            <Button
                                size="sm"
                                className="h-8"
                                onClick={handlePublish}
                            >
                                <Play className="w-3.5 h-3.5 mr-1.5" />
                                Publish
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() =>
                                    updateWorkflow({
                                        status: workflow.status === 'active' ? 'paused' : 'active',
                                    })
                                }
                            >
                                {workflow.status === 'active' ? (
                                    <Pause className="w-3.5 h-3.5 mr-1.5" />
                                ) : (
                                    <Play className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                {workflow.status === 'active' ? 'Pause' : 'Resume'}
                            </Button>
                        )}
                    </div>
                </header>

                {/* Error banner */}
                {error && (
                    <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-destructive/10 border-b border-destructive/20 text-destructive text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError(null)}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Workflow warnings */}
                {workflowWarnings.length > 0 && (
                    <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-400 text-sm">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">{workflowWarnings[0]}</span>
                    </div>
                )}

                {/* Main canvas area */}
                <div className="flex-1 relative overflow-hidden">
                    <WorkflowCanvas
                        workflow={workflow}
                        executionStates={executionStates}
                        facebookConnected={facebookConnected}
                        onWorkflowUpdate={updateWorkflow}
                        onNodeClick={handleNodeClick}
                        onAddNode={handleAddNode}
                    />

                    {/* Node panel (slide in from left) */}
                    {showNodePanel && (
                        <WorkflowNodePanel
                            onClose={() => setShowNodePanel(false)}
                            onAddNode={handleAddSingleNode}
                            workflow={workflow}
                        />
                    )}

                    {/* Node config (slide in from right) */}
                    {showConfig && selectedStep && (
                        <WorkflowNodeConfig
                            step={selectedStep}
                            workflow={workflow}
                            onClose={() => {
                                setShowConfig(false);
                                setSelectedStep(null);
                            }}
                            onUpdate={(updates) => {
                                const updatedSteps = workflow.steps.map((s) =>
                                    s.id === selectedStep.id ? { ...s, ...updates } : s,
                                );
                                updateWorkflow({ steps: updatedSteps });
                                setSelectedStep({ ...selectedStep, ...updates });
                            }}
                            onWorkflowUpdate={updateWorkflow}
                            onFacebookConnected={() => setFacebookConnected(true)}
                        />
                    )}
                </div>
            </div>
        </ReactFlowProvider>
    );
}
