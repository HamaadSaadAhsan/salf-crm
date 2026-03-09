import { useState, useCallback } from 'react';
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
import WorkflowGuide from '@/components/workflows/workflow-guide';
import { type Workflow, type WorkflowStep, type NodeExecutionState } from '@/types/workflow';
import {
    ArrowLeft,
    Save,
    Loader2,
    Play,
    Pause,
    AlertCircle,
    X,
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
        updateWorkflow,
        saveWorkflow,
        publishWorkflow,
        setError,
    } = useWorkflowEdit(initialWorkflow.id, initialWorkflow);

    const [showNodePanel, setShowNodePanel] = useState(false);
    const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
    const [showConfig, setShowConfig] = useState(false);
    const [guideDismissed, setGuideDismissed] = useState(false);
    const [executionStates, setExecutionStates] = useState<NodeExecutionState[]>([]);

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
                    // Clear execution states after a delay to show final status
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

    // Show guide for new empty workflows
    const isNewEmptyWorkflow =
        workflow &&
        workflow.steps.length === 0 &&
        workflow.metadata?.is_new &&
        !guideDismissed;

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

    const addFacebookSteps = useCallback(() => {
        if (!workflow) return;

        const ts = () => new Date().toISOString();

        const newSteps: WorkflowStep[] = [
            {
                id: -1,
                step_type: 'trigger',
                service: 'facebook_oauth',
                operation: 'authorize',
                order: 0,
                configuration: {},
                enabled: true,
                field_mappings: [],
                created_at: ts(),
                updated_at: ts(),
            },
            {
                id: -2,
                step_type: 'action',
                service: 'facebook_page_sync',
                operation: 'sync_pages',
                order: 1,
                configuration: {},
                enabled: true,
                field_mappings: [],
                created_at: ts(),
                updated_at: ts(),
            },
            {
                id: -3,
                step_type: 'action',
                service: 'facebook_webhook_sub',
                operation: 'subscribe',
                order: 2,
                configuration: {},
                enabled: true,
                field_mappings: [],
                created_at: ts(),
                updated_at: ts(),
            },
            {
                id: -4,
                step_type: 'action',
                service: 'facebook_app_sub',
                operation: 'subscribe_app',
                order: 3,
                configuration: {},
                enabled: true,
                field_mappings: [],
                created_at: ts(),
                updated_at: ts(),
            },
        ];

        updateWorkflow({
            steps: [...workflow.steps, ...newSteps],
            metadata: { ...workflow.metadata, is_new: false },
        });
    }, [workflow, updateWorkflow]);

    const handleGuideTemplate = useCallback(
        (templateId: string) => {
            if (templateId === 'facebook_lead_gen') {
                addFacebookSteps();
            }
            setGuideDismissed(true);
        },
        [addFacebookSteps],
    );

    const handleGuideSkip = useCallback(() => {
        setGuideDismissed(true);
        if (workflow) {
            updateWorkflow({ metadata: { ...workflow.metadata, is_new: false } });
        }
    }, [workflow, updateWorkflow]);

    const handleAddFacebookWorkflow = useCallback(() => {
        addFacebookSteps();
        setShowNodePanel(false);
    }, [addFacebookSteps]);

    const handleSave = useCallback(async () => {
        if (!workflow) return;
        await saveWorkflow();
    }, [workflow, saveWorkflow]);

    const handlePublish = useCallback(async () => {
        if (!workflow) return;
        await publishWorkflow();
    }, [workflow, publishWorkflow]);

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
                    {/* Left section */}
                    <div className="flex items-center gap-2">
                        <Link href="/workflows">
                            <Button variant="ghost" size="sm" className="h-8 px-2">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>

                        <span className="text-muted-foreground">/</span>

                        <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                            {workflow.name}
                        </span>

                        <Badge
                            variant="secondary"
                            className={cn('text-[10px] h-5 px-1.5 gap-1', status.color)}
                        >
                            <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                            {status.label}
                        </Badge>
                    </div>

                    {/* Right section */}
                    <div className="flex items-center gap-2">
                        {hasUnsavedChanges && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 mr-2">
                                Unsaved changes
                            </span>
                        )}

                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={handleSave}
                            disabled={saving || !hasUnsavedChanges}
                        >
                            {saving ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                                <Save className="w-3.5 h-3.5 mr-1.5" />
                            )}
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

                {/* Main canvas area */}
                <div className="flex-1 relative overflow-hidden">
                    <WorkflowCanvas
                        workflow={workflow}
                        executionStates={executionStates}
                        onWorkflowUpdate={updateWorkflow}
                        onNodeClick={handleNodeClick}
                        onAddNode={handleAddNode}
                    />

                    {/* Guided onboarding for new workflows */}
                    {isNewEmptyWorkflow && (
                        <WorkflowGuide
                            onSkip={handleGuideSkip}
                            onSelectTemplate={handleGuideTemplate}
                        />
                    )}

                    {/* Node panel (slide in from left) */}
                    {showNodePanel && (
                        <WorkflowNodePanel
                            onClose={() => setShowNodePanel(false)}
                            onAddFacebookWorkflow={handleAddFacebookWorkflow}
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
                        />
                    )}
                </div>
            </div>
        </ReactFlowProvider>
    );
}
