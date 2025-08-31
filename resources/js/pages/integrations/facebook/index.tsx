import { useState, useEffect } from "react"
import SetupWizard from "@/components/setup-wizard"
import { IntegrationHealthWidget } from "@/components/integration-health-widget"
import { ErrorRecoveryCard } from "@/components/error-recovery-card"
import { IntegrationTemplateSelector } from "@/components/integration-templates"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import AppLayout from '@/layouts/app-layout'
import axios from "axios"
import { toast } from "sonner"

interface HealthStatus {
  api: boolean
  webhooks: boolean
  permissions: boolean
  lastChecked: Date
}

interface IntegrationData {
  health_status: HealthStatus
  connection_status: "disconnected" | "connecting" | "connected" | "error"
  last_sync_at: string | null
  integration_info?: {
    id: number
    name: string
    active: boolean
    page_name?: string
    features: Record<string, boolean>
  }
}

export default function FacebookIntegrationPage() {
  const [showWizard, setShowWizard] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [integrationData, setIntegrationData] = useState<IntegrationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch integration health data
  const fetchHealthData = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get('/integrations/facebook/health')

      if (response.data.success) {
        const data = response.data
        setIntegrationData({
          health_status: {
            api: data.health_status.api,
            webhooks: data.health_status.webhooks,
            permissions: data.health_status.permissions,
            lastChecked: new Date(data.health_status.lastChecked)
          },
          connection_status: data.connection_status,
          last_sync_at: data.last_sync_at,
          integration_info: data.integration_info
        })
        setError(null)
      } else {
        setIntegrationData({
          health_status: {
            api: false,
            webhooks: false,
            permissions: false,
            lastChecked: new Date()
          },
          connection_status: "disconnected",
          last_sync_at: null
        })
        setError(response.data.message)
      }
    } catch (error: any) {
      console.error('Error fetching health data:', error)
      setError(error.response?.data?.message || 'Failed to load integration status')
      setIntegrationData({
        health_status: {
          api: false,
          webhooks: false,
          permissions: false,
          lastChecked: new Date()
        },
        connection_status: "error",
        last_sync_at: null
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Test connection
  const handleTestConnection = async () => {
    try {
      const response = await axios.post('/integrations/facebook/test-connection')
      if (response.data.success) {
        toast.success('Connection test successful')
        fetchHealthData() // Refresh health data
      } else {
        toast.error(response.data.message || 'Connection test failed')
      }
    } catch (error: any) {
      console.error('Error testing connection:', error)
      toast.error(error.response?.data?.message || 'Failed to test connection')
    }
  }

  // Force sync data
  const handleForceSyncData = async () => {
    try {
      const response = await axios.post('/integrations/facebook/sync')
      if (response.data.success) {
        toast.success('Data sync initiated successfully')
        await fetchHealthData() // Refresh health data
      } else {
        toast.error(response.data.message || 'Failed to sync data')
      }
    } catch (error: any) {
      console.error('Error syncing data:', error)
      toast.error(error.response?.data?.message || 'Failed to sync data')
    }
  }

  // View logs (placeholder)
  const handleViewLogs = () => {
    toast.info('Logs viewer coming soon')
  }

  // Load health data on component mount
  useEffect(() => {
    fetchHealthData()
  }, [])

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
    fetchHealthData() // Refresh health data after setup
    toast.success("Facebook integration completed successfully!")
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
          {!isLoading && integrationData && (
            <IntegrationHealthWidget
              connectionStatus={integrationData.connection_status}
              lastSyncAt={integrationData.last_sync_at ? new Date(integrationData.last_sync_at) : null}
              healthStatus={integrationData.health_status}
              onTestConnection={handleTestConnection}
              onForceSyncData={handleForceSyncData}
              onViewLogs={handleViewLogs}
            />
          )}

          {/* Error Recovery (shown conditionally) */}
          {!isLoading && integrationData && integrationData.connection_status === "error" && (
            <ErrorRecoveryCard
              error={mockError}
              onAutoRecover={() => handleTestConnection()}
              onManualFix={() => setShowWizard(true)}
              onGetHelp={() => toast.info("Contact support for assistance")}
            />
          )}

          {/* Loading State */}
          {isLoading && (
            <Card className="border-border bg-card">
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading integration status...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-6">
                <div className="text-center">
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={fetchHealthData} variant="outline">
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
