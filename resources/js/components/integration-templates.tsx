import type React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, CheckCircle, MessageSquare, Users } from 'lucide-react';

export interface IntegrationTemplate {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    features: string[];
    optimalSettings: Record<string, any>;
    useCase: string;
    benefits: string[];
}

interface IntegrationTemplateSelectorProps {
    onSelectTemplate: (template: IntegrationTemplate) => void;
}

export function IntegrationTemplateSelector({ onSelectTemplate }: IntegrationTemplateSelectorProps) {
    const templates: IntegrationTemplate[] = [
        {
            id: 'lead-generation',
            name: 'Lead Generation Focus',
            description: 'Optimized for capturing and managing leads from Facebook',
            icon: <Users className="h-6 w-6" />,
            features: ['leadgen', 'messaging', 'notifications'],
            optimalSettings: {
                enableLeadGen: true,
                enableMessaging: true,
                autoSyncLeads: true,
                leadNotifications: true,
                webhookSubscriptions: ['leadgen', 'messages'],
            },
            useCase: 'Perfect for businesses focused on lead generation and customer acquisition',
            benefits: [
                'Automatic lead capture from Facebook Lead Ads',
                'Real-time lead notifications',
                'Integrated messaging for lead follow-up',
                'CRM synchronization',
            ],
        },
        {
            id: 'social-media-management',
            name: 'Social Media Management',
            description: 'Complete solution for managing your Facebook presence',
            icon: <BarChart3 className="h-6 w-6" />,
            features: ['posts', 'comments', 'insights'],
            optimalSettings: {
                enablePosts: true,
                enableInsights: true,
                enableComments: true,
                postScheduling: true,
                webhookSubscriptions: ['feed', 'comments', 'reactions'],
            },
            useCase: 'Ideal for social media managers and content creators',
            benefits: [
                'Content scheduling and publishing',
                'Performance analytics and insights',
                'Comment and reaction monitoring',
                'Engagement tracking',
            ],
        },
        {
            id: 'customer-service',
            name: 'Customer Service',
            description: 'Streamlined customer support through Facebook channels',
            icon: <MessageSquare className="h-6 w-6" />,
            features: ['messaging', 'comments', 'reactions'],
            optimalSettings: {
                enableMessaging: true,
                enableComments: true,
                autoResponders: true,
                priorityNotifications: true,
                webhookSubscriptions: ['messages', 'comments', 'messaging_postbacks'],
            },
            useCase: 'Best for businesses providing customer support via Facebook',
            benefits: [
                'Unified inbox for all Facebook messages',
                'Automated response capabilities',
                'Priority notification system',
                'Customer interaction history',
            ],
        },
    ];

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="mb-2 text-xl font-semibold">Choose Your Integration Template</h3>
                <p className="text-gray-400">Select a pre-configured template that matches your business needs. You can customize settings later.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {templates.map((template) => (
                    <Card
                        key={template.id}
                        className="cursor-pointer border-gray-800 bg-gray-900 transition-all hover:border-blue-500/50"
                        onClick={() => onSelectTemplate(template)}
                    >
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {template.icon}
                                {template.name}
                            </CardTitle>
                            <CardDescription className="text-gray-400">{template.description}</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {/* Use Case */}
                            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                                <p className="text-sm text-blue-300">{template.useCase}</p>
                            </div>

                            {/* Features */}
                            <div>
                                <h5 className="mb-2 text-sm font-medium">Included Features:</h5>
                                <div className="flex flex-wrap gap-1">
                                    {template.features.map((feature) => (
                                        <Badge key={feature} variant="outline" className="text-xs">
                                            {feature}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* Benefits */}
                            <div>
                                <h5 className="mb-2 text-sm font-medium">Key Benefits:</h5>
                                <ul className="space-y-1 text-xs text-gray-400">
                                    {template.benefits.slice(0, 3).map((benefit, index) => (
                                        <li key={index} className="flex items-start gap-1">
                                            <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-500" />
                                            {benefit}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => onSelectTemplate(template)}>
                                Use This Template
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="text-center">
                <Button variant="outline" className="border-gray-700 bg-transparent text-white hover:bg-gray-800">
                    Skip Templates - Custom Setup
                </Button>
            </div>
        </div>
    );
}
