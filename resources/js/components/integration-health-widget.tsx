import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Activity, Zap } from "lucide-react"
import { useState } from "react"

interface HealthStatus {
  api: boolean
  webhooks: boolean
  permissions: boolean
  lastChecked: Date
}

interface IntegrationHealthWidgetProps {
  connectionStatus: "disconnected" | "connecting" | "connected" | "error"
  lastSyncAt: Date | null
  healthStatus: HealthStatus
  onTestConnection: () => void
  onForceSyncData: () => void
  onViewLogs: () => void
}

export function IntegrationHealthWidget({
  connectionStatus,
  lastSyncAt,
  healthStatus,
  onTestConnection,
  onForceSyncData,
  onViewLogs,
}: IntegrationHealthWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "connecting":
        return <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "connecting":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case "error":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onTestConnection()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  return (
    <Card className="border-gray-800 bg-gray-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          Integration Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(connectionStatus)}
            <span className="font-medium">Connection Status</span>
          </div>
          <Badge className={getStatusColor(connectionStatus)}>
            {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
          </Badge>
        </div>

        {/* Last Sync Time */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Last Sync</span>
          <span className="text-sm">{lastSyncAt ? lastSyncAt.toLocaleString() : "Never"}</span>
        </div>

        {/* Health Checks */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Health Checks</h4>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(healthStatus).map(([key, value]) => {
              if (key === "lastChecked") return null
              return (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                  {typeof value === "boolean" ? (
                    value ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium">Quick Actions</h4>
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
            >
              {isRefreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              <span className="ml-2">Test Connection</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onForceSyncData}
              className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="ml-2">Force Sync</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onViewLogs}
              className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
            >
              <Activity className="h-4 w-4" />
              <span className="ml-2">View Logs</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
