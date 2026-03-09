import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ReactFlow,
    type Node,
    type Edge,
    addEdge,
    type OnConnect,
    useNodesState,
    useEdgesState,
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    Panel,
    useReactFlow,
    type NodeChange,
    type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getAutoLayout } from '@/lib/workflow-layout';
import { cn } from '@/lib/utils';
import { type Workflow, type WorkflowStep, type NodeExecutionState } from '@/types/workflow';

// Node components
import FacebookOAuthNode from './nodes/facebook-oauth-node';
import FacebookPageSyncNode from './nodes/facebook-page-sync-node';
import FacebookWebhookSubNode from './nodes/facebook-webhook-sub-node';
import FacebookAppSubNode from './nodes/facebook-app-sub-node';
import FacebookLeadTriggerNode from './nodes/facebook-lead-trigger-node';

// Edge components
import AnimatedEdge from './edges/animated-edge';

// Icons
import {
    AlignVerticalSpaceAround,
    ZoomIn,
    ZoomOut,
    Maximize,
    Plus,
    Sparkles,
} from 'lucide-react';

const nodeTypes = {
    facebook_oauth: FacebookOAuthNode,
    facebook_page_sync: FacebookPageSyncNode,
    facebook_webhook_sub: FacebookWebhookSubNode,
    facebook_app_sub: FacebookAppSubNode,
    facebook_lead_ads: FacebookLeadTriggerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

interface WorkflowCanvasProps {
    workflow: Workflow;
    executionStates?: NodeExecutionState[];
    onWorkflowUpdate: (updates: Partial<Workflow>) => void;
    onNodeClick?: (stepId: number, step: WorkflowStep) => void;
    onAddNode?: () => void;
}

export default function WorkflowCanvas({
    workflow,
    executionStates = [],
    onWorkflowUpdate,
    onNodeClick,
    onAddNode,
}: WorkflowCanvasProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simStates, setSimStates] = useState<NodeExecutionState[]>([]);

    const activeExecutionStates = executionStates.length > 0 ? executionStates : simStates;

    // Map workflow steps to React Flow nodes and edges
    const buildGraph = useCallback(() => {
        const sortedSteps = [...workflow.steps].sort((a, b) => a.order - b.order);
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        sortedSteps.forEach((step) => {
            const execState = activeExecutionStates.find((s) => s.nodeId === `step-${step.id}`);
            const isExecuting = execState?.status === 'running';
            const executionStatus = execState?.status ?? 'idle';

            const nodeType = getNodeType(step);
            const { label, sublabel } = getNodeLabels(step);

            newNodes.push({
                id: `step-${step.id}`,
                type: nodeType,
                position: { x: 0, y: 0 }, // Will be auto-laid out
                data: {
                    stepId: step.id,
                    step,
                    label,
                    sublabel,
                    isConfigured: isStepConfigured(step),
                    isExecuting,
                    executionStatus,
                    enabled: step.enabled,
                    onConfigure: () => onNodeClick?.(step.id, step),
                    onDelete: () => handleDeleteStep(step.id),
                },
            });
        });

        // Create edges between sequential steps
        for (let i = 0; i < sortedSteps.length - 1; i++) {
            const current = sortedSteps[i];
            const next = sortedSteps[i + 1];
            const execState = activeExecutionStates.find((s) => s.nodeId === `step-${current.id}`);
            const isExecuting = execState?.status === 'running';
            const executionStatus = execState?.status ?? 'idle';

            newEdges.push({
                id: `edge-${current.id}-${next.id}`,
                source: `step-${current.id}`,
                target: `step-${next.id}`,
                type: 'animated',
                data: {
                    isExecuting,
                    executionStatus,
                },
            });
        }

        // Apply auto-layout
        const laid = getAutoLayout(newNodes, newEdges, 'TB');

        // If canvas_data has saved positions, use those instead
        if (workflow.canvas_data?.nodes) {
            const savedPositions = new Map(
                workflow.canvas_data.nodes.map((n) => [n.id, { x: n.x, y: n.y }]),
            );
            laid.nodes = laid.nodes.map((node) => {
                const saved = savedPositions.get(node.id);
                return saved ? { ...node, position: saved } : node;
            });
        }

        return laid;
    }, [workflow.steps, workflow.canvas_data, activeExecutionStates, onNodeClick]);

    // Rebuild graph when workflow changes
    useEffect(() => {
        const { nodes: newNodes, edges: newEdges } = buildGraph();
        setNodes(newNodes);
        setEdges(newEdges);
    }, [buildGraph, setNodes, setEdges]);

    // Save node positions on drag end
    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            onNodesChange(changes);

            // Persist position changes
            const positionChanges = changes.filter(
                (c) => c.type === 'position' && c.dragging === false && c.position,
            );
            if (positionChanges.length > 0) {
                const currentPositions = nodes.map((n) => ({
                    id: n.id,
                    x: n.position.x,
                    y: n.position.y,
                }));
                onWorkflowUpdate({
                    canvas_data: {
                        ...workflow.canvas_data,
                        nodes: currentPositions,
                    },
                });
            }
        },
        [onNodesChange, nodes, workflow.canvas_data, onWorkflowUpdate],
    );

    const onConnect: OnConnect = useCallback(
        (connection) => {
            setEdges((eds) => addEdge({ ...connection, type: 'animated' }, eds));
        },
        [setEdges],
    );

    // Auto-align handler
    const handleAutoAlign = useCallback(() => {
        const { nodes: layouted, edges: layoutedEdges } = getAutoLayout(nodes, edges, 'TB');
        setNodes(layouted);
        setEdges(layoutedEdges);

        const positions = layouted.map((n) => ({
            id: n.id,
            x: n.position.x,
            y: n.position.y,
        }));
        onWorkflowUpdate({
            canvas_data: { ...workflow.canvas_data, nodes: positions },
        });
    }, [nodes, edges, setNodes, setEdges, onWorkflowUpdate, workflow.canvas_data]);

    // Simulate execution animation (demo)
    const handleSimulate = useCallback(() => {
        if (isSimulating) return;
        setIsSimulating(true);

        const sortedSteps = [...workflow.steps].sort((a, b) => a.order - b.order);
        let stepIndex = 0;

        const runNext = () => {
            if (stepIndex >= sortedSteps.length) {
                setTimeout(() => {
                    setSimStates([]);
                    setIsSimulating(false);
                }, 1500);
                return;
            }

            const step = sortedSteps[stepIndex];
            const nodeId = `step-${step.id}`;

            // Set current node to running
            setSimStates((prev) => [
                ...prev.map((s) =>
                    s.status === 'running' ? { ...s, status: 'success' as const } : s,
                ),
                { nodeId, status: 'running', startedAt: Date.now() },
            ]);

            stepIndex++;
            setTimeout(runNext, 1200);
        };

        runNext();
    }, [workflow.steps, isSimulating]);

    const handleDeleteStep = useCallback(
        (stepId: number) => {
            const updatedSteps = workflow.steps
                .filter((s) => s.id !== stepId)
                .map((s, i) => ({ ...s, order: i }));
            onWorkflowUpdate({ steps: updatedSteps });
        },
        [workflow.steps, onWorkflowUpdate],
    );

    return (
        <div className="relative w-full h-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodeClick={(_, node) => {
                    const step = workflow.steps.find((s) => s.id === node.data.stepId);
                    if (step) onNodeClick?.(step.id, step);
                }}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                minZoom={0.25}
                maxZoom={2}
                defaultEdgeOptions={{ type: 'animated' }}
                proOptions={{ hideAttribution: true }}
                className="bg-background"
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    className="!bg-background"
                    color="var(--muted-foreground)"
                    style={{ opacity: 0.2 }}
                />
                <Controls
                    showInteractive={false}
                    className="!border-border !rounded-lg !shadow-none"
                />
                <MiniMap
                    className="!bg-card !border-border !rounded-lg"
                    nodeStrokeWidth={3}
                    pannable
                    zoomable
                />

                {/* Top-right toolbar */}
                <Panel position="top-right" className="flex gap-2">
                    <button
                        onClick={handleAutoAlign}
                        className={cn(
                            'flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg',
                            'bg-card border border-border text-foreground',
                            'hover:bg-accent transition-colors',
                        )}
                        title="Auto-align nodes"
                    >
                        <AlignVerticalSpaceAround className="w-3.5 h-3.5" />
                        Auto-align
                    </button>
                    <button
                        onClick={handleSimulate}
                        disabled={isSimulating || workflow.steps.length === 0}
                        className={cn(
                            'flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg',
                            'bg-card border border-border text-foreground',
                            'hover:bg-accent transition-colors',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            isSimulating && 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400',
                        )}
                        title="Simulate execution"
                    >
                        <Sparkles className={cn('w-3.5 h-3.5', isSimulating && 'animate-spin')} />
                        {isSimulating ? 'Running...' : 'Simulate'}
                    </button>
                    {onAddNode && (
                        <button
                            onClick={onAddNode}
                            className={cn(
                                'flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg',
                                'bg-primary text-primary-foreground',
                                'hover:bg-primary/90 transition-colors',
                            )}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Node
                        </button>
                    )}
                </Panel>

                {/* Bottom-center info */}
                <Panel position="bottom-center">
                    <div className={cn(
                        'flex items-center gap-4 px-3 py-2 text-xs rounded-lg',
                        'bg-card/80 backdrop-blur-sm border border-border text-muted-foreground',
                    )}>
                        <span>{workflow.steps.length} nodes</span>
                        <span className="w-px h-3 bg-border" />
                        <span className="capitalize">{workflow.status}</span>
                        {workflow.webhook_url && (
                            <>
                                <span className="w-px h-3 bg-border" />
                                <span className="text-emerald-600 dark:text-emerald-400">Webhook active</span>
                            </>
                        )}
                    </div>
                </Panel>
            </ReactFlow>

            {/* Empty state */}
            {workflow.steps.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="text-center pointer-events-auto">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                            <Plus className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-1">
                            Start building your workflow
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Add a trigger to get started
                        </p>
                        {onAddNode && (
                            <button
                                onClick={onAddNode}
                                className={cn(
                                    'px-4 py-2 text-sm font-medium rounded-lg',
                                    'bg-primary text-primary-foreground',
                                    'hover:bg-primary/90 transition-colors',
                                )}
                            >
                                Add Facebook Trigger
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper functions
function getNodeType(step: WorkflowStep): string {
    const typeMap: Record<string, string> = {
        facebook_oauth: 'facebook_oauth',
        facebook_page_sync: 'facebook_page_sync',
        facebook_webhook_sub: 'facebook_webhook_sub',
        facebook_app_sub: 'facebook_app_sub',
        facebook_lead_ads: 'facebook_lead_ads',
    };
    return typeMap[step.service] || 'facebook_lead_ads';
}

function getNodeLabels(step: WorkflowStep): { label: string; sublabel: string } {
    const labels: Record<string, { label: string; sublabel: string }> = {
        facebook_oauth: { label: 'Facebook OAuth', sublabel: 'Authenticate & authorize' },
        facebook_page_sync: { label: 'Page Sync', sublabel: 'Sync Facebook pages' },
        facebook_webhook_sub: { label: 'Webhook Subscription', sublabel: 'Subscribe to webhooks' },
        facebook_app_sub: { label: 'App Subscription', sublabel: 'Subscribe app to page events' },
        facebook_lead_ads: {
            label: 'New Lead',
            sublabel: step.configuration?.page_name
                ? `Page: ${step.configuration.page_name}`
                : 'Facebook Lead Ads trigger',
        },
    };
    return labels[step.service] || { label: step.service, sublabel: step.operation };
}

function isStepConfigured(step: WorkflowStep): boolean {
    switch (step.service) {
        case 'facebook_lead_ads':
            return !!(step.configuration?.page_id && step.configuration?.form_id);
        case 'facebook_oauth':
            return !!(step.configuration?.authorized);
        case 'facebook_page_sync':
            return !!(step.configuration?.synced);
        case 'facebook_webhook_sub':
            return !!(step.configuration?.subscribed);
        case 'facebook_app_sub':
            return !!(step.configuration?.subscribed);
        default:
            return false;
    }
}
