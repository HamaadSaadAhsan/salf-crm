import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    X,
    Facebook,
    KeyRound,
    RefreshCw,
    Webhook,
    AppWindow,
    ArrowRight,
    Check,
    Sparkles,
    ChevronRight,
} from 'lucide-react';

interface WorkflowGuideProps {
    onSkip: () => void;
    onSelectTemplate: (template: string) => void;
}

const templates = [
    {
        id: 'facebook_lead_gen',
        name: 'Facebook Lead Generation',
        description: 'Complete setup: OAuth, Page Sync, Webhooks & App Subscription',
        icon: Facebook,
        color: '#1877F2',
        steps: [
            { icon: KeyRound, label: 'OAuth', desc: 'Authenticate with Facebook' },
            { icon: RefreshCw, label: 'Page Sync', desc: 'Fetch your pages' },
            { icon: Webhook, label: 'Webhooks', desc: 'Subscribe to events' },
            { icon: AppWindow, label: 'App Sub', desc: 'Activate page events' },
        ],
    },
];

export default function WorkflowGuide({ onSkip, onSelectTemplate }: WorkflowGuideProps) {
    const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div
                className={cn(
                    'relative w-full max-w-lg mx-4',
                    'bg-card border border-border rounded-2xl shadow-2xl',
                    'animate-in fade-in zoom-in-95 duration-300',
                )}
            >
                {/* Close / Skip */}
                <button
                    onClick={onSkip}
                    className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-accent transition-colors z-10"
                >
                    <X className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Header */}
                <div className="px-6 pt-6 pb-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                Create your workflow
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Pick a template or start from scratch
                            </p>
                        </div>
                    </div>
                </div>

                {/* Templates */}
                <div className="px-6 pb-2 space-y-3">
                    {templates.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => onSelectTemplate(template.id)}
                            onMouseEnter={() => setHoveredTemplate(template.id)}
                            onMouseLeave={() => setHoveredTemplate(null)}
                            className={cn(
                                'w-full text-left rounded-xl border border-border p-4',
                                'hover:border-primary/40 hover:bg-accent/50 transition-all duration-200',
                                'group',
                            )}
                        >
                            {/* Template header */}
                            <div className="flex items-center gap-3 mb-3">
                                <div
                                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: template.color }}
                                >
                                    <template.icon className="w-4.5 h-4.5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-foreground">
                                        {template.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {template.description}
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>

                            {/* Steps preview */}
                            <div className="flex items-center gap-1.5">
                                {template.steps.map((step, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                        <div
                                            className={cn(
                                                'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
                                                'bg-muted/60 text-muted-foreground',
                                                hoveredTemplate === template.id && 'bg-primary/10 text-primary',
                                                'transition-colors duration-200',
                                            )}
                                            style={{
                                                transitionDelay: hoveredTemplate === template.id ? `${i * 50}ms` : '0ms',
                                            }}
                                        >
                                            <step.icon className="w-3 h-3" />
                                            <span className="hidden sm:inline">{step.label}</span>
                                        </div>
                                        {i < template.steps.length - 1 && (
                                            <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                    <button
                        onClick={onSkip}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Start from scratch
                    </button>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="w-3 h-3" />
                        You can always add more nodes later
                    </div>
                </div>
            </div>
        </div>
    );
}
