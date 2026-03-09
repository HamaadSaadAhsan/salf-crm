import { type ReactNode } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkflowNodeData {
    label: string;
    sublabel?: string;
    icon: ReactNode;
    iconBg: string;
    isConfigured?: boolean;
    isExecuting?: boolean;
    executionStatus?: 'idle' | 'running' | 'success' | 'error';
    stepType: 'trigger' | 'action';
    service: string;
    enabled?: boolean;
    showAddAction?: boolean;
    onConfigure?: () => void;
    onDelete?: () => void;
    onAddAction?: () => void;
}

export default function WorkflowNode({ data, selected }: NodeProps) {
    const nodeData = data as unknown as WorkflowNodeData;
    const {
        label,
        sublabel,
        icon,
        iconBg,
        isConfigured,
        isExecuting,
        executionStatus = 'idle',
        stepType,
        enabled = true,
        showAddAction = false,
        onAddAction,
    } = nodeData;

    const statusRingColors: Record<string, string> = {
        idle: '',
        running: 'ring-2 ring-blue-400/60 dark:ring-blue-500/60',
        success: 'ring-2 ring-emerald-400/60 dark:ring-emerald-500/60',
        error: 'ring-2 ring-red-400/60 dark:ring-red-500/60',
    };

    return (
        <div
            className={cn(
                'group relative',
                !enabled && 'opacity-50',
            )}
        >
            {/* Sparkling border effect on execution */}
            {isExecuting && (
                <div className="absolute -inset-[2px] rounded-2xl overflow-hidden">
                    <div className="workflow-sparkle-border absolute inset-0 rounded-2xl" />
                </div>
            )}

            {/* Main node card */}
            <div
                className={cn(
                    'relative flex items-center gap-3 px-4 py-3 min-w-[220px] max-w-[280px]',
                    'bg-card border border-border rounded-xl shadow-sm',
                    'transition-all duration-200 ease-out',
                    'hover:shadow-md hover:border-primary/30',
                    selected && 'border-primary shadow-md shadow-primary/10',
                    statusRingColors[executionStatus],
                    isExecuting && 'shadow-lg',
                )}
            >
                {/* Service icon */}
                <div
                    className={cn(
                        'flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg',
                        iconBg,
                    )}
                >
                    {icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                        {label}
                    </div>
                    {sublabel && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {sublabel}
                        </div>
                    )}
                </div>

                {/* Status indicator */}
                <div className="flex-shrink-0">
                    {executionStatus === 'running' ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    ) : executionStatus === 'success' ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    ) : executionStatus === 'error' ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    ) : isConfigured ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                    ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-400/60 animate-pulse" />
                    )}
                </div>
            </div>

            {/* Handles */}
            {stepType !== 'trigger' && (
                <Handle
                    type="target"
                    position={Position.Top}
                    className="!w-3 !h-3 !bg-border !border-2 !border-card hover:!bg-primary !transition-colors !-top-1.5"
                />
            )}
            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-border !border-2 !border-card hover:!bg-primary !transition-colors !-bottom-1.5"
            />

            {/* Add Action button for triggers without downstream actions */}
            {showAddAction && onAddAction && (
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-10">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddAction();
                        }}
                        className={cn(
                            'flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded-full',
                            'bg-primary text-primary-foreground shadow-sm',
                            'hover:bg-primary/90 transition-colors',
                            'nopan nodrag',
                        )}
                    >
                        <Plus className="w-3 h-3" />
                        Add Action
                    </button>
                </div>
            )}
        </div>
    );
}
