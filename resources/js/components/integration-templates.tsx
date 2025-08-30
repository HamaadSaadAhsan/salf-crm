import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, MessageSquare, BarChart3, CheckCircle } from "lucide-react"

interface IntegrationTemplate {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  features: string[]
  optimalSettings: Record<string, any>
  useCase: string
  benefits: string[]
}

interface IntegrationTemplateSelectorProps {
  onSelectTemplate: (template: IntegrationTemplate) => void
}

export function IntegrationTemplateSelector({ onSelectTemplate }: IntegrationTemplateSelectorProps) {
  const templates: IntegrationTemplate[] = [
    {
      id: "lead-generation",
      name: "Lead Generation Focus",
      description: "Optimized for capturing and managing leads from Facebook",
      icon: <Users className="h-6 w-6" />,
      features: ["leadgen", "messaging", "notifications"],
      optimalSettings: {
        enableLeadGen: true,
        enableMessaging: true,
        autoSyncLeads: true,
        leadNotifications: true,
        webhookSubscriptions: ["leadgen", "messages"],
      },
      useCase: "Perfect for businesses focused on lead generation and customer acquisition",
      benefits: [
        "Automatic lead capture from Facebook Lead Ads",
        "Real-time lead notifications",
        "Integrated messaging for lead follow-up",
        "CRM synchronization",
      ],
    },
    {
      id: "social-media-management",
      name: "Social Media Management",
      description: "Complete solution for managing your Facebook presence",
      icon: <BarChart3 className="h-6 w-6" />,
      features: ["posts", "comments", "insights"],
      optimalSettings: {
        enablePosts: true,
        enableInsights: true,
        enableComments: true,
        postScheduling: true,
        webhookSubscriptions: ["feed", "comments", "reactions"],
      },
      useCase: "Ideal for social media managers and content creators",
      benefits: [
        "Content scheduling and publishing",
        "Performance analytics and insights",
        "Comment and reaction monitoring",
        "Engagement tracking",
      ],
    },
    {
      id: "customer-service",
      name: "Customer Service",
      description: "Streamlined customer support through Facebook channels",
      icon: <MessageSquare className="h-6 w-6" />,
      features: ["messaging", "comments", "reactions"],
      optimalSettings: {
        enableMessaging: true,
        enableComments: true,
        autoResponders: true,
        priorityNotifications: true,
        webhookSubscriptions: ["messages", "comments", "messaging_postbacks"],
      },
      useCase: "Best for businesses providing customer support via Facebook",
      benefits: [
        "Unified inbox for all Facebook messages",
        "Automated response capabilities",
        "Priority notification system",
        "Customer interaction history",
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Choose Your Integration Template</h3>
        <p className="text-gray-400">
          Select a pre-configured template that matches your business needs. You can customize settings later.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="border-gray-800 bg-gray-900 hover:border-blue-500/50 transition-all cursor-pointer"
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
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                <p className="text-sm text-blue-300">{template.useCase}</p>
              </div>

              {/* Features */}
              <div>
                <h5 className="text-sm font-medium mb-2">Included Features:</h5>
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
                <h5 className="text-sm font-medium mb-2">Key Benefits:</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  {template.benefits.slice(0, 3).map((benefit, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
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
  )
}
