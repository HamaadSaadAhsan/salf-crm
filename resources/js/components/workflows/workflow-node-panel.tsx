import { cn } from '@/lib/utils';
import {
    X,
    KeyRound,
    RefreshCw,
    Webhook,
    AppWindow,
    Zap,
    Facebook,
} from 'lucide-react';

interface WorkflowNodePanelProps {
    onClose: () => void;
    onAddFacebookWorkflow: () => void;
}

const facebookNodes = [
    {
        id: 'facebook_full_workflow',
        name: 'Facebook Full Setup',
        description: 'OAuth + Page Sync + Webhook + App Subscription',
        icon: Facebook,
        color: 'bg-[#1877F2]',
        isTemplate: true,
    },
    {
        id: 'facebook_oauth',
        name: 'Facebook OAuth',
        description: 'Authenticate & authorize',
        icon: KeyRound,
        color: 'bg-[#1877F2]',
    },
    {
        id: 'facebook_page_sync',
        name: 'Page Sync',
        description: 'Sync Facebook pages',
        icon: RefreshCw,
        color: 'bg-[#1877F2]',
    },
    {
        id: 'facebook_webhook_sub',
        name: 'Webhook Subscription',
        description: 'Subscribe to page webhooks',
        icon: Webhook,
        color: 'bg-[#1877F2]',
    },
    {
        id: 'facebook_app_sub',
        name: 'App Subscription',
        description: 'Subscribe app to page events',
        icon: AppWindow,
        color: 'bg-[#1877F2]',
    },
    {
        id: 'facebook_lead_ads',
        name: 'New Lead Trigger',
        description: 'Trigger on new lead from Lead Ads',
        icon: Zap,
        color: 'bg-[#1877F2]',
    },
];

export default function WorkflowNodePanel({
    onClose,
    onAddFacebookWorkflow,
}: WorkflowNodePanelProps) {
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
                {/* Facebook section */}
                <div>
                    <div className="flex items-center gap-2 px-2 mb-2">
                        <div className="w-5 h-5 rounded bg-[#1877F2] flex items-center justify-center">
                            <Facebook className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Facebook
                        </span>
                    </div>

                    <div className="space-y-1">
                        {facebookNodes.map((node) => (
                            <button
                                key={node.id}
                                onClick={() => {
                                    if (node.isTemplate) {
                                        onAddFacebookWorkflow();
                                    }
                                    // Individual nodes can be added later
                                }}
                                className={cn(
                                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                                    'hover:bg-accent transition-colors text-left',
                                    node.isTemplate && 'ring-1 ring-[#1877F2]/20 bg-[#1877F2]/5 dark:bg-[#1877F2]/10',
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
                                    <div className="text-sm font-medium text-foreground">
                                        {node.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        {node.description}
                                    </div>
                                </div>
                                {node.isTemplate && (
                                    <span className="text-[10px] font-medium text-[#1877F2] bg-[#1877F2]/10 px-1.5 py-0.5 rounded">
                                        Template
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
