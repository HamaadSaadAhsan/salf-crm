import { useState } from "react"
import SetupWizard from "@/components/setup-wizard"
import { IntegrationHealthWidget } from "@/components/integration-health-widget"
import { ErrorRecoveryCard } from "@/components/error-recovery-card"
import { IntegrationTemplateSelector } from "@/components/integration-templates"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import AppLayout from '@/layouts/app-layout'

export default function FacebookIntegrationPage() {
  const [showWizard, setShowWizard] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [integrationStatus, setIntegrationStatus] = useState<"disconnected" | "connecting" | "connected" | "error">(
    "disconnected",
  )

  // Mock data for demonstration
  const healthStatus = {
    api: true,
    webhooks: false,
    permissions: true,
    lastChecked: new Date(),
  }

  const mockError = {
    type: "TOKEN_EXPIRED" as const,
    message: "Your Facebook access token has expired",
    recoverySteps: [
      'Click "Auto Fix" to refresh your token automatically',
      "If auto-fix fails, you'll need to re-authenticate with Facebook",
      'Go to the Permissions tab and click "Request Permissions"',
    ],
    canAutoRecover: true,
  }

  const handleWizardComplete = (config: any) => {
    console.log("Setup completed with config:", config)
    setShowWizard(false)
    setIntegrationStatus("connected")
  }

  const handleTemplateSelect = (template: any) => {
    console.log("Template selected:", template)
    setShowTemplates(false)
    setShowWizard(true)
  }

  if (showTemplates) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background text-foreground p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowTemplates(false)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-4xl font-bold text-foreground text-balance">Facebook Integration Templates</h1>
            </div>

            <IntegrationTemplateSelector onSelectTemplate={handleTemplateSelect} />
          </div>
        </div>
      </AppLayout>
    )
  }

  if (showWizard) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background text-foreground p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowWizard(false)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-4xl font-bold text-foreground text-balance">Facebook Integration Setup</h1>
            </div>

            <SetupWizard onComplete={handleWizardComplete} />
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4 text-foreground text-balance">Facebook Integration</h1>
            <p className="text-muted-foreground">
              Connect your Facebook account to sync leads, manage messages, and track performance.
            </p>
          </div>

          {/* Quick Start Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Quick Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Get started quickly with our guided setup wizard.</p>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
                  onClick={() => setShowWizard(true)}
                >
                  Start Setup Wizard
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Use Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Choose from pre-configured templates for common use cases.</p>
                <Button
                  variant="outline"
                  className="w-full border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setShowTemplates(true)}
                >
                  Browse Templates
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Health Widget */}
          <IntegrationHealthWidget
            connectionStatus={integrationStatus}
            lastSyncAt={new Date()}
            healthStatus={healthStatus}
            onTestConnection={() => console.log("Testing connection")}
            onForceSyncData={() => console.log("Force sync")}
            onViewLogs={() => console.log("View logs")}
          />

          {/* Error Recovery (shown conditionally) */}
          {integrationStatus === "error" && (
            <ErrorRecoveryCard
              error={mockError}
              onAutoRecover={() => console.log("Auto recover")}
              onManualFix={() => console.log("Manual fix")}
              onGetHelp={() => console.log("Get help")}
            />
          )}
        </div>
      </div>
    </AppLayout>
  )
}
