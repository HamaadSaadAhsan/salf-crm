import { cn } from '@/lib/utils';
import {
    X,
    Zap,
    Facebook,
    FileText,
    AlertCircle,
    CheckCircle2,
} from 'lucide-react';
import { type Workflow, type WorkflowStep } from '@/types/workflow';

interface WorkflowNodePanelProps {
    onClose: () => void;
    onAddFacebookWorkflow: () => void;
    onAddNode: (step: Omit<WorkflowStep, 'id' | 'created_at' | 'updated_at'>) => void;
    workflow: Workflow;
}

interface NodeDef {
    id: string;
    name: string;
    description: string;
    icon: any;
    color: string;
    isTemplate?: boolean;
    disabled?: boolean;
    disabledReason?: string;
    stepType: 'trigger' | 'action';
    operation: string;
}

// The required Facebook flow services that must all be completed
const facebookFlowServices = ['facebook_oauth', 'facebook_page_sync', 'facebook_webhook_sub', 'facebook_app_sub'];

function isFacebookFlowComplete(workflow: Workflow): boolean {
    return facebookFlowServices.every((service) => {
        const step = workflow.steps.find((s) => s.service === service);
        if (!step) return false;
        const c = step.configuration || {};
        return !!(c.authorized || c.synced || c.subscribed);
    });
}

function hasFacebookFlowSteps(workflow: Workflow): boolean {
    return facebookFlowServices.every((service) =>
        workflow.steps.some((s) => s.service === service),
    );
}

export default function WorkflowNodePanel({
    onClose,
    onAddFacebookWorkflow,
    onAddNode,
    workflow,
}: WorkflowNodePanelProps) {
    const flowComplete = isFacebookFlowComplete(workflow);
    const flowExists = hasFacebookFlowSteps(workflow);

    const triggerNodes: NodeDef[] = [
        {
            id: 'facebook_full_workflow',
            name: 'Facebook Full Setup',
            description: 'OAuth + Page Sync + Webhook + App Sub',
            icon: Facebook,
            color: 'bg-[#1877F2]',
            isTemplate: true,
            disabled: flowExists,
            disabledReason: flowExists ? 'Facebook flow already added' : undefined,
            stepType: 'trigger',
            operation: 'full_setup',
        },
        {
            id: 'facebook_lead_ads',
            name: 'New Lead Trigger',
            description: flowComplete
                ? 'Trigger on new lead from Lead Ads'
                : 'Requires completed Facebook Full Setup',
            icon: Zap,
            color: 'bg-[#1877F2]',
            disabled: !flowComplete,
            disabledReason: !flowComplete ? 'Complete the Facebook Full Setup flow first' : undefined,
            stepType: 'trigger',
            operation: 'new_lead',
        },
    ];

    const actionNodes: NodeDef[] = [
        {
            id: 'field_mapping',
            name: 'Field Mapping',
            description: 'Map incoming fields to lead fields',
            icon: FileText,
            color: 'bg-violet-600',
            stepType: 'action',
            operation: 'map_fields',
        },
    ];

    const handleNodeClick = (node: NodeDef) => {
        if (node.disabled) return;

        if (node.isTemplate) {
            onAddFacebookWorkflow();
            onClose();
            return;
        }

        onAddNode({
            step_type: node.stepType,
            service: node.id,
            operation: node.operation,
            order: 0,
            configuration: {},
            enabled: true,
            field_mappings: [],
        });
        onClose();
    };

    const renderNodeButton = (node: NodeDef) => (
        <button
            key={node.id}
            onClick={() => handleNodeClick(node)}
            disabled={node.disabled}
            className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                'transition-colors text-left',
                node.disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-accent',
                node.isTemplate && !node.disabled && 'ring-1 ring-[#1877F2]/20 bg-[#1877F2]/5 dark:bg-[#1877F2]/10',
            )}
        >
            <div
                className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                    node.color,
                )}
            >
                <node.icon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{node.name}</div>
                <div className="text-xs text-muted-foreground truncate">{node.description}</div>
                {node.disabled && node.disabledReason && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        {node.disabledReason}
                    </div>
                )}
            </div>
            {node.isTemplate && !node.disabled && (
                <span className="text-[10px] font-medium text-[#1877F2] bg-[#1877F2]/10 px-1.5 py-0.5 rounded">
                    Template
                </span>
            )}
            {node.isTemplate && node.disabled && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            )}
        </button>
    );

    return (
        <div
            className={cn(
                'absolute top-0 left-0 h-full w-80 z-40',
                'bg-card border-r border-border',
                'animate-in slide-in-from-left-full duration-200',
                'flex flex-col',
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Add Node</h3>
                <button
                    onClick={onClose}
                    className="p-1 rounded-md hover:bg-accent transition-colors"
                >
                    <X className="w-4 h-4 text-muted-foreground" />
                </button>
            </div>

            {/* Node list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* Triggers section */}
                <div>
                    <div className="flex items-center gap-2 px-2 mb-2">
                        <div className="w-5 h-5 rounded bg-[#1877F2] flex items-center justify-center">
                            <Facebook className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Triggers
                        </span>
                    </div>
                    <div className="space-y-1">
                        {triggerNodes.map(renderNodeButton)}
                    </div>
                </div>

                {/* Actions section */}
                <div>
                    <div className="flex items-center gap-2 px-2 mb-2">
                        <div className="w-5 h-5 rounded bg-violet-600 flex items-center justify-center">
                            <FileText className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Actions
                        </span>
                    </div>
                    <div className="space-y-1">
                        {actionNodes.map(renderNodeButton)}
                    </div>
                </div>
            </div>
        </div>
    );
}
